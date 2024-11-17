// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    searchVideos: (query, page) => ipcRenderer.invoke('search-videos', { query, page }),
    getTrending: (page) => ipcRenderer.invoke('get-trending', { page })
});