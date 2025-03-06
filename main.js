// main.js
const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const activeDownloads = new Map();
const path = require('path');
const { dialog } = require('electron');
const { spawn } = require('child_process');
const { shell } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        },
        icon: path.join(__dirname, 'assets', 'logo.png'),
    });

    Menu.setApplicationMenu(null);
    
    // For Next.js app development
    const startUrl = app.isPackaged 
        ? `file://${path.join(__dirname, '../.next/server/app/index.html')}` 
        : 'http://localhost:4000';
    
    win.loadURL(startUrl);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
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

ipcMain.handle('open-file', async (event, path) => {
    try {
        await shell.openPath(path);
    } catch (error) {
        console.error('Error opening file:', error);
        throw error;
    }
});

ipcMain.handle('open-folder', async (event, path) => {
    try {
        await shell.openPath(path);
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
          event.sender.send('download-complete', options.id, lastResult);
          activeDownloads.delete(options.id);
          resolve(lastResult);
        } else {
          const errorMessage = lastResult?.error || `Python script failed with code ${code}.`;
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