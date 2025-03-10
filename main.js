// main.js
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const activeDownloads = new Map();
const path = require('path');
const { dialog } = require('electron');
const { spawn, exec } = require('child_process');
const { shell } = require('electron');
const fs = require('fs');
const { net } = require('electron');
const { init: initUpdater, checkForUpdates, updateWindow } = require('./updater');
const log = require('electron-log');

log.transports.file.level = 'info';

let nextjsProcess = null;
let mainWindow = null;
let isNextJsReady = false;
let loadingWindow = null;
let nextjsPort = 47390;
let isShuttingDown = false;

function createLoadingWindow() {
  if (updateWindow) {
    return;
  }
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
  
  initializeApp();
}

async function initializeApp() {
  if (process.env.NODE_ENV !== 'development') {
    log.info('Checking for updates during startup...');
    
    try {
      const updateAvailable = await checkForUpdates();
      if (updateAvailable) {
        log.info('Update found, update window will handle the flow');
        if (loadingWindow) {
          loadingWindow.close();
          loadingWindow = null;
        }
        return; // Exit initialization as update process will take over
      } else {
        log.info('No updates available, continuing with app startup');
        // Close the update window if it exists (no update found)
        if (updateWindow) {
          updateWindow.close();
          updateWindow = null;
        }
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      // Continue with startup even if update check fails
      if (updateWindow) {
        updateWindow.close();
        updateWindow = null;
      }
    }
  }
  
  // Proceed with normal app startup
  try {
    await freePortIfNeeded(nextjsPort);
    await startNextJsServer();
    await checkServerConnectivity(`http://localhost:${nextjsPort}`);
    createWindow();
  } catch (error) {
    console.error('Failed to start app:', error);
    app.quit();
  }
}

async function freePortIfNeeded(port) {
  const portInUse = await isPortInUse(port);
  if (portInUse) {
    console.log(`Port ${port} is already in use. Attempting to free it...`);
    
    if (process.platform === 'win32') {
      try {
        exec(`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.error('Error freeing port on Windows:', e);
      }
    } else {
      try {
        exec(`lsof -i :${port} | grep LISTEN | awk '{print $2}' | xargs kill -9`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (e) {
        console.error('Error freeing port on Unix:', e);
      }
    }
    
    const stillInUse = await isPortInUse(port);
    if (stillInUse) {
      throw new Error(`Could not free port ${port}`);
    }
  }
}

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

async function startNextJsServer() {
  return new Promise(async (resolve, reject) => {
    const nextServerPath = app.isPackaged
      ? path.join(process.resourcesPath, 'frontend', 'standalone', 'server.js')
      : path.join(__dirname, 'frontend', 'standalone', 'server.js');
    
    if (!fs.existsSync(nextServerPath)) {
      console.error(`Next.js server not found at: ${nextServerPath}`);
      reject(new Error(`Next.js server not found at: ${nextServerPath}`));
      return;
    }

    console.log('Starting Next.js standalone server...');
    
    const serverDir = path.dirname(nextServerPath);
    
    nextjsProcess = exec('node server.js', {
      cwd: serverDir,
      env: {
        ...process.env,
      }
    });

    nextjsProcess.stdout.on('data', (data) => {
      console.log('Next.js server:', data.toString());
      
      if (data.toString().includes('ready started')) {
        console.log('Next.js server is ready');
        isNextJsReady = true;
        resolve();
      }
    });

    nextjsProcess.stderr.on('data', (data) => {
      console.error('Next.js server error:', data.toString());
      
      if (data.toString().includes('EADDRINUSE') && !isNextJsReady) {
        console.log('Port in use, server failed to start');
        reject(new Error('Port already in use'));
      }
    });

    nextjsProcess.on('error', (error) => {
      console.error('Failed to start Next.js server:', error);
      reject(error);
    });

    setTimeout(() => {
      if (!isNextJsReady) {
        console.log('Next.js server started (timeout reached)');
        isNextJsReady = true;
        resolve();
      }
    }, 10000);
  });
}

function terminateNextJsServer() {
  return new Promise((resolve, reject) => {
    if (!nextjsProcess) {
      resolve();
      return;
    }

    console.log('Terminating Next.js server process...');
    
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
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'assets', 'logo.png'),
  });

  Menu.setApplicationMenu(null);
  
  const isDev = process.env.NODE_ENV === 'development';
  const startUrl = isDev 
    ? 'http://localhost:4000' 
    : `http://localhost:${nextjsPort}`;
  
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

  mainWindow.on('close', async (e) => {
    if (!isShuttingDown && !isDev) {
      e.preventDefault();
      isShuttingDown = true;
      
      console.log('Window closing - cleaning up resources...');
      await terminateNextJsServer();
      
      mainWindow.destroy();
      app.quit();
    }
  });
}

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
    checkConnection();
  });
}

app.whenReady().then(async () => {
  initUpdater();
  const isDev = process.env.NODE_ENV === 'development';
  
  if (isDev) {
    nextjsPort = 4000;
    try {
      await checkServerConnectivity(`http://localhost:${nextjsPort}`);
      createWindow();
    } catch (error) {
      console.error('Dev server not reachable:', error);
      app.quit();
    }
  } else {
    createLoadingWindow();
  }
});

app.on('will-quit', async (e) => {
  if (isShuttingDown) return;
  
  e.preventDefault();
  isShuttingDown = true;
  
  console.log('App will quit - cleaning up resources...');
  await terminateNextJsServer();
  
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

    console.log('Attempting to spawn:', downloaderPath);

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
    
    if (!fs.existsSync(folderPath)) {
      console.error(`Folder does not exist: ${folderPath}`);
      throw new Error(`Folder does not exist: ${folderPath}`);
    }
    
    const stats = fs.statSync(folderPath);
    if (!stats.isDirectory()) {
      console.error(`Path is not a directory: ${folderPath}`);
      folderPath = path.dirname(folderPath);
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

          if (jsonData.phase) {
            let newPhase;
            switch(jsonData.phase) {
              case 'downloading':
                newPhase = 'encoding';
                break;
              case 'converting':
                newPhase = 'converting';
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
        event.sender.send('download-progress', options.id, 100);
        
        const completeResult = {
          ...options,
          ...lastResult,
          outputPath: lastResult.path,
          outputFolder: path.dirname(lastResult.path),
          completedAt: new Date().toISOString(),
          id: options.id,
          title: options.title || lastResult.title || "Video download"
        };
        
        event.sender.send('download-complete', completeResult);
        
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