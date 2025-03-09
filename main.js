const { app, BrowserWindow, ipcMain, Menu, dialog } = require('electron');
const activeDownloads = new Map();
const path = require('path');
const { spawn, exec } = require('child_process');
const { shell } = require('electron');
const fs = require('fs');
const { net } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

// Store references to our servers and window
let nextjsProcess = null;
let mainWindow = null;
let isNextJsReady = false;
let loadingWindow = null;
let updateWindow = null;
let nextjsPort = 47390;
let isShuttingDown = false;

// Create a loading window to show while Next.js server starts
function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'logo.png'),
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
  loadingWindow.center();
}

// Create update notification window
function createUpdateWindow() {
  updateWindow = new BrowserWindow({
    width: 500,
    height: 400,
    frame: false,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'logo.png'),
  });

  updateWindow.loadFile(path.join(__dirname, 'update.html'));
  updateWindow.center();
  updateWindow.on('closed', () => {
    updateWindow = null;
  });
}

// Check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const testServer = require('net').createServer()
      .once('error', () => resolve(true))
      .once('listening', () => {
        testServer.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Start Next.js server in production
async function startNextJsServer() {
  return new Promise(async (resolve, reject) => {
    const nextServerPath = app.isPackaged
      ? path.join(process.resourcesPath, 'frontend', 'standalone', 'server.js')
      : path.join(__dirname, 'frontend', 'standalone', 'server.js');
    
    // Check if the server file exists
    if (!fs.existsSync(nextServerPath)) {
      console.error(`Next.js server not found at: ${nextServerPath}`);
      reject(new Error(`Next.js server not found at: ${nextServerPath}`));
      return;
    }

    console.log('Starting Next.js standalone server...');
    
    // Change directory to the standalone folder and run Node
    const serverDir = path.dirname(nextServerPath);
    
    // Let the server use its default port of 47390 (don't override with PORT env var)
    nextjsProcess = exec('node server.js', {
      cwd: serverDir,
      env: {
        ...process.env,
        // No PORT override - let it use the default from server.js
      }
    });

    nextjsProcess.stdout.on('data', (data) => {
      console.log('Next.js server:', data.toString());
      
      // Look for message indicating server started
      if (data.toString().includes('ready started')) {
        console.log('Next.js server is ready');
        isNextJsReady = true;
        resolve();
      }
    });

    nextjsProcess.stderr.on('data', (data) => {
      console.error('Next.js server error:', data.toString());
      
      // If we see a port in use error, try again with a different port
      if (data.toString().includes('EADDRINUSE') && !isNextJsReady) {
        console.log('Port in use, server failed to start');
        reject(new Error('Port already in use'));
      }
    });

    nextjsProcess.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    // Set a timeout in case we don't see the ready message
    setTimeout(() => {
      if (!isNextJsReady) {
        console.log('Next.js server started (timeout reached)');
        isNextJsReady = true;
        resolve();
      }
    }, 10000);
  });
}

// Properly terminate the Next.js process
function terminateNextJsServer() {
  return new Promise((resolve, reject) => {
    if (!nextjsProcess) {
      resolve();
      return;
    }

    console.log('Terminating Next.js server process...');
    
    // Set a timeout for the kill operation
    const killTimeout = setTimeout(() => {
      console.log('Force killing Next.js process...');
      if (process.platform === 'win32') {
        exec(`taskkill /pid ${nextjsProcess.pid} /T /F`, () => resolve());
      } else {
        try {
          process.kill(nextjsProcess.pid, 'SIGKILL');
        } catch (e) {
          console.error('Error force killing process:', e);
        }
        resolve();
      }
    }, 5000);

    // Try graceful shutdown first
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${nextjsProcess.pid} /T`, (error) => {
        if (error) {
          console.log('Graceful termination failed, using force termination...');
          exec(`taskkill /pid ${nextjsProcess.pid} /T /F`, () => {
            clearTimeout(killTimeout);
            resolve();
          });
        } else {
          clearTimeout(killTimeout);
          resolve();
        }
      });
    } else {
      // For non-Windows platforms
      nextjsProcess.on('exit', () => {
        clearTimeout(killTimeout);
        resolve();
      });
      
      try {
        nextjsProcess.kill('SIGTERM');
      } catch (e) {
        console.error('Error terminating process:', e);
        clearTimeout(killTimeout);
        resolve();
      }
    }
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    show: false, // Don't show until loaded
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'logo.png'),
  });

  Menu.setApplicationMenu(null);
  
  // For Next.js app development/production
  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev 
    ? 'http://localhost:4000' 
    : `http://localhost:${nextjsPort}`; // Use the default port from server.js
  
  mainWindow.loadURL(startUrl);

  mainWindow.webContents.on('did-finish-load', () => {
    if (loadingWindow) {
      loadingWindow.close();
      loadingWindow = null;
    }
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window close event properly
  mainWindow.on('close', async (e) => {
    if (!isShuttingDown && !isDev) {
      e.preventDefault();
      isShuttingDown = true;
      
      console.log('Window closing - cleaning up resources...');
      await terminateNextJsServer();
      
      // Now actually close the window and quit the app
      mainWindow.destroy();
      app.quit();
    }
  });
}

// Check for server connectivity
function checkServerConnectivity(url, maxAttempts = 30, interval = 1000) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const checkConnection = () => {
      attempts++;
      console.log(`Checking server connectivity (attempt ${attempts}/${maxAttempts})...`);
      
      const request = net.request(url);
      request.on('response', (response) => {
        console.log(`Server responded with status code: ${response.statusCode}`);
        if (response.statusCode < 400) {
          clearInterval(intervalId);
          resolve();
        }
      });
      
      request.on('error', (error) => {
        console.log(`Connection attempt failed: ${error.message}`);
        if (attempts >= maxAttempts) {
          clearInterval(intervalId);
          reject(new Error('Server not reachable after maximum attempts'));
        }
      });
      
      request.end();
    };
    
    const intervalId = setInterval(checkConnection, interval);
    checkConnection(); // Initial check
  });
}

// Auto updater event handlers
function setupAutoUpdater() {
  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for update...');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    createUpdateWindow();
    if (updateWindow) {
      updateWindow.webContents.on('did-finish-load', () => {
        updateWindow.webContents.send('update-available', {
          version: info.version,
          releaseDate: info.releaseDate,
          currentVersion: app.getVersion()
        });
      });
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info(`Download progress: ${progressObj.percent}%`);
    if (updateWindow) {
      updateWindow.webContents.send('download-progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    if (updateWindow) {
      updateWindow.webContents.send('update-downloaded');
    }
  });
}

// Initialize the app
app.whenReady().then(async () => {
  setupAutoUpdater();
  
  // Check for updates
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    log.error('Failed to check for updates:', error);
  }
  
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    // In development, just create the window (assuming Next.js dev server is running)
    nextjsPort = 4000; // Development port
    try {
      await checkServerConnectivity(`http://localhost:${nextjsPort}`);
      createWindow();
    } catch (error) {
      console.error('Dev server not reachable:', error);
      app.quit();
    }
  } else {
    // In production, show loading screen, start Next.js server, then create window
    createLoadingWindow();
    
    // First check if the port is already in use
    const portInUse = await isPortInUse(nextjsPort);
    if (portInUse) {
      console.log(`Port ${nextjsPort} is already in use. Attempting to free it...`);
      // Try to kill any process using this port
      if (process.platform === 'win32') {
        try {
          exec(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${nextjsPort}') do taskkill /F /PID %a`);
          // Wait a bit for the port to be freed
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
          console.error('Error freeing port:', e);
        }
      } else {
        try {
          exec(`lsof -i :${nextjsPort} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (e) {
          console.error('Error freeing port:', e);
        }
      }
    }
    
    try {
      await startNextJsServer();
      // Wait for server to be fully ready
      await checkServerConnectivity(`http://localhost:${nextjsPort}`);
      createWindow();
    } catch (error) {
      console.error('Failed to start Next.js server:', error);
      app.quit();
    }
  }
});

// Handle IPC messages from update window
ipcMain.on('start-download', () => {
  log.info('Starting update download');
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  log.info('Installing update now');
  autoUpdater.quitAndInstall(true, true);
});

ipcMain.on('skip-update', () => {
  log.info('User skipped update');
  if (updateWindow) {
    updateWindow.close();
  }
});

// Clean up resources when quitting
app.on('will-quit', async (e) => {
  if (isShuttingDown) return;
  
  e.preventDefault();
  isShuttingDown = true;
  
  console.log('App will quit - cleaning up resources...');
  await terminateNextJsServer();
  
  // Continue with app quit
  app.exit(0);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

function callPythonWorker(options) {
  return new Promise((resolve, reject) => {
    const downloaderPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'downloader.exe')
      : path.join(__dirname, 'downloader.exe');

    console.log('Attempting to spawn:', downloaderPath); // Log the path

    const child = spawn(downloaderPath, [JSON.stringify(options)]);
    let output = '';
    
    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => console.error('Python error:', data.toString()));
    
    child.on('close', (code) => {
      if (code !== 0) return reject(new Error(`Exit code ${code}`));
      try {
        const result = JSON.parse(output);
        result.success ? resolve(result) : reject(new Error(result.error));
      } catch(e) {
        reject(new Error('Invalid JSON response'));
      }
    });
  });
}

ipcMain.handle('get-active-downloads', async () => {
  return Array.from(activeDownloads.values());
});

ipcMain.handle('search-videos', async (_, { query, page = 1 }) => {
  return (await callPythonWorker({ 
    action: 'search', 
    query: query,
    page: page || 1,
    max_results: 20 
  })).videos;
});

ipcMain.handle('get-trending', async (_, { page = 1 }) => {
  return (await callPythonWorker({ 
    action: 'trending',
    page: page || 1,
    max_results: 20 
  })).videos;
});

ipcMain.handle('get-music', async (_, { page = 1 }) => {
  return (await callPythonWorker({ 
    action: 'music',
    page: page || 1,
    max_results: 20 
  })).videos;
});

ipcMain.handle('get-sports', async (_, { page = 1 }) => {
  return (await callPythonWorker({ 
    action: 'sports',
    page: page || 1,
    max_results: 20 
  })).videos;
});

ipcMain.handle('get-gaming', async (_, { page = 1 }) => {
  return (await callPythonWorker({ 
    action: 'gaming',
    page: page || 1,
    max_results: 20 
  })).videos;
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return !result.canceled ? result.filePaths[0] : null;
});

ipcMain.handle('open-file', async (event, filePath) => {
  try {
    console.log(`Attempting to open file: ${filePath}`);
    
    // Check if path exists and is a file
    if (!fs.existsSync(filePath)) {
      console.error(`File does not exist: ${filePath}`);
      throw new Error(`File does not exist: ${filePath}`);
    }
    
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.error(`Path is not a file: ${filePath}`);
      throw new Error(`Path is not a file: ${filePath}`);
    }
    
    const result = await shell.openPath(filePath);
    if (result !== "") {
      console.error(`shell.openPath returned: ${result}`);
      throw new Error(`Failed to open file: ${result}`);
    }
    return true;
  } catch (error) {
    console.error('Error opening file:', error);
    throw error;
  }
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  try {
    console.log(`Attempting to open folder: ${folderPath}`);
    
    // Check if path exists
    if (!fs.existsSync(folderPath)) {
      console.error(`Folder does not exist: ${folderPath}`);
      throw new Error(`Folder does not exist: ${folderPath}`);
    }
    
    // Make sure it's a directory
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      console.error(`Path is not a directory: ${folderPath}`);
      folderPath = path.dirname(folderPath); // If it's a file, get its directory
      console.log(`Using parent directory instead: ${folderPath}`);
    }
    
    const result = await shell.openPath(folderPath);
    if (result !== "") {
      console.error(`shell.openPath returned: ${result}`);
      throw new Error(`Failed to open folder: ${result}`);
    }
    return true;
  } catch (error) {
    console.error('Error opening folder:', error);
    throw error;
  }
});

ipcMain.handle('start-download', async (event, options) => {
  activeDownloads.set(options.id, options);
  // Emit the new-download event to the renderer
  event.sender.send('new-download', options);

  return new Promise((resolve, reject) => {
    const downloaderPath = app.isPackaged 
      ? path.join(process.resourcesPath, 'downloader.exe')
      : path.join(__dirname, 'downloader.exe');
    const childProcess = spawn(downloaderPath, [
      JSON.stringify(options)
    ]);

    let lastResult = null;
    let buffer = '';
    let currentPhase = 'processing';
    let convertingProgress = 0;
    let convertingInterval;

    childProcess.stdout.on('data', (data) => {
      const output = data.toString();
      buffer += output;

      let match;
      const jsonRegex = /\{[^}]*\}/g;

      while ((match = jsonRegex.exec(buffer)) !== null) {
        try {
          const jsonData = JSON.parse(match[0]);

          // Handle phase changes
          if (jsonData.phase) {
            let newPhase;
            switch(jsonData.phase) {
              case 'downloading':
                newPhase = 'encoding';
                break;
              case 'converting':
                newPhase = 'converting';
                // Start simulated progress for converting phase
                if (convertingInterval) clearInterval(convertingInterval);
                convertingProgress = 0;
                convertingInterval = setInterval(() => {
                  convertingProgress += 1;
                  if (convertingProgress <= 95) {
                    event.sender.send('download-progress', options.id, convertingProgress);
                  }
                }, 100);
                break;
              default:
                newPhase = jsonData.phase;
            }
            
            if (newPhase !== currentPhase) {
              currentPhase = newPhase;
              event.sender.send('phase-change', options.id, currentPhase);
            }
          }

          // Handle progress updates
          if (jsonData.progress !== undefined) {
            const currentProgress = parseFloat(jsonData.progress);
            if (currentPhase === 'encoding') {
              event.sender.send('download-progress', options.id, currentProgress);
            }
          }

          if (jsonData.success !== undefined) {
            if (convertingInterval) {
              clearInterval(convertingInterval);
            }
            lastResult = jsonData;
          }

          buffer = buffer.slice(match.index + match[0].length);
        } catch (jsonError) {
          console.warn('Partial or invalid JSON:', match[0], jsonError);
        }
      }
    });

    childProcess.stderr.on('data', (data) => {
      console.error('Python error:', data.toString().trim());
    });

    childProcess.on('close', (code) => {
      if (convertingInterval) {
        clearInterval(convertingInterval);
      }
      
      if (code === 0 && lastResult && lastResult.success) {
        // Ensure we show 100% at the end
        event.sender.send('download-progress', options.id, 100);
        
        // Create a complete result object with all necessary information
        const completeResult = {
          ...options,
          ...lastResult,
          outputPath: lastResult.path, // Full path to the file
          outputFolder: path.dirname(lastResult.path), // Directory containing the file
          completedAt: new Date().toISOString(),
          id: options.id,
          title: options.title || lastResult.title || "Video download"
        };
        
        // Send the event with the complete result object
        event.sender.send('download-complete', completeResult);
        
        // Clean up the active downloads map
        activeDownloads.delete(options.id);
        resolve(lastResult);
      } else {
        const errorMessage = lastResult?.error || `Python script failed with code ${code}.`;
        console.log('Sending download-error with:', options.id, errorMessage);
        event.sender.send('download-error', options.id, errorMessage);
        activeDownloads.delete(options.id);
        reject(new Error(errorMessage));
      }
    });

    childProcess.on('error', (err) => {
      if (convertingInterval) {
        clearInterval(convertingInterval);
      }
      console.error('Failed to start Python:', err.message);
      event.sender.send('download-error', options.id, 'Failed to start Python script.');
      reject(new Error('Failed to start Python script.'));
    });
  });
});