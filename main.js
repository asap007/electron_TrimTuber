// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
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