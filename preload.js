// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    searchVideos: (params) => ipcRenderer.invoke('search-videos', params),
    getTrending: (params) => ipcRenderer.invoke('get-trending', params),
    getMusic: (params) => ipcRenderer.invoke('get-music', params),
    getGaming: (params) => ipcRenderer.invoke('get-gaming', params),
    getSports: (params) => ipcRenderer.invoke('get-sports', params),
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    startDownload: (options) => ipcRenderer.invoke('start-download', options),
    onDownloadProgress: (callback) => {
        ipcRenderer.on('download-progress', (event, progress) => {
            callback(progress);
        });
    },
    openFile: (path) => ipcRenderer.invoke('open-file', path),
    openFolder: (path) => ipcRenderer.invoke('open-folder', path),
    on: (channel, callback) => ipcRenderer.on(channel, (event, ...args) => callback(...args))
});