// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { dialog } = require('electron');
const { spawn } = require('child_process');
const { shell } = require('electron');
const InvidiousAPI = require('./src/js/api.js');

const api = new InvidiousAPI();

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    win.loadFile('./src/index.html');
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

ipcMain.handle('search-videos', async (event, { query, page }) => {
    try {
        const results = await api.searchVideos(query, page);
        return results;
    } catch (error) {
        console.error('Search error:', error);
        throw error;
    }
});

ipcMain.handle('get-trending', async (event, { page }) => {
    try {
        const results = await api.getTrending(page);
        return results;
    } catch (error) {
        console.error('Trending error:', error);
        throw error;
    }
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
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, 'python', 'downloader.py');
        const pythonProcess = spawn('python', [
            pythonScript,
            JSON.stringify(options)
        ]);

        let lastResult = null;
        let buffer = '';
        let phase = 'processing'; // 'processing', 'encoding', 'converting'
        let completedPhases = 0;

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            buffer += output;

            // Check for phase transition
            if (buffer.includes('Destination:') && phase === 'processing') {
                phase = 'encoding';
                event.sender.send('phase-change', 'encoding');
                event.sender.send('download-progress', 0);
                buffer = '';
            }

            let match;
            const jsonRegex = /\{[^}]*\}/g;

            while ((match = jsonRegex.exec(buffer)) !== null) {
                try {
                    const jsonData = JSON.parse(match[0]);

                    if (jsonData.progress !== undefined) {
                        const currentProgress = parseFloat(jsonData.progress);
                        
                        // Handle progress based on current phase
                        if (currentProgress === 100) {
                            completedPhases++;
                            
                            // If we've completed both download and encoding
                            if (completedPhases === 2 && phase !== 'converting') {
                                phase = 'converting';
                                event.sender.send('phase-change', 'converting');
                                // Start showing slow progress for converting phase
                                startConvertingProgress(event);
                            }
                        }
                        
                        event.sender.send('download-progress', currentProgress);
                    }

                    if (jsonData.success !== undefined) {
                        lastResult = jsonData;
                    }

                    buffer = buffer.slice(match.index + match[0].length);
                } catch (jsonError) {
                    console.warn('Partial or invalid JSON:', match[0], jsonError);
                }
            }
        });

        // Function to simulate progress during converting phase
        function startConvertingProgress(event) {
            let progress = 0;
            const interval = setInterval(() => {
                progress += 0.5; // Slow increment
                if (progress <= 99) {
                    event.sender.send('download-progress', progress);
                }
            }, 500); // Update every 500ms

            // Clear interval when process ends
            pythonProcess.on('close', () => clearInterval(interval));
        }

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python error:', data.toString().trim());
        });

        pythonProcess.on('close', (code) => {
            if (code === 0 && lastResult && lastResult.success) {
                // Ensure we show 100% at the end
                event.sender.send('download-progress', 100);
                resolve(lastResult);
            } else {
                const errorMessage = lastResult?.error || `Python script failed with code ${code}.`;
                reject(new Error(errorMessage));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python:', err.message);
            reject(new Error('Failed to start Python script.'));
        });
    });
});


