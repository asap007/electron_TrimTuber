// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    searchVideos: (query, page) => ipcRenderer.invoke('search-videos', { query, page }),
    getTrending: (page) => ipcRenderer.invoke('get-trending', { page }),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    startDownload: (options) => ipcRenderer.invoke('start-download', options),
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => {
            callback(progress);
        });
    },
    openFile: (path) => ipcRenderer.invoke('open-file', path),
    openFolder: (path) => ipcRenderer.invoke('open-folder', path)
});