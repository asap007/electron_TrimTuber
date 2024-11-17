// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { dialog } = require('electron');
const { spawn } = require('child_process');
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
    win.webContents.openDevTools();
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


ipcMain.handle('start-download', async (event, options) => {
    return new Promise((resolve, reject) => {
        const pythonScript = path.join(__dirname, 'python', 'downloader.py');
        const pythonProcess = spawn('python', [
            pythonScript,
            JSON.stringify(options)
        ]);

        let lastResult = null;
        let pythonOutput = ''; // Accumulated output for debugging

        pythonProcess.stdout.on('data', (data) => {
            const output = data.toString();
            pythonOutput += output; // Save raw output for debugging

            try {
                const jsonData = JSON.parse(output);

                if (jsonData.progress !== undefined) {
                    // Send progress updates
                    event.sender.send('download-progress', jsonData.progress);
                }

                if (jsonData.success !== undefined) {
                    lastResult = jsonData; // Capture success
                }
            } catch {
                // Log non-JSON data for debugging
                console.warn('Non-JSON Python output:', output.trim());
            }
        });

        pythonProcess.stderr.on('data', (data) => {
            console.error('Python error:', data.toString().trim());
        });

        pythonProcess.on('close', (code) => {
            if (code === 0 && lastResult && lastResult.success) {
                resolve(lastResult);
            } else {
                const errorMessage = lastResult?.error || `Python script failed with code ${code}. Output: ${pythonOutput}`;
                reject(new Error(errorMessage));
            }
        });

        pythonProcess.on('error', (err) => {
            console.error('Failed to start Python process:', err.message);
            reject(new Error('Failed to start the Python script.'));
        });
    });
});


