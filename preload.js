// preload.js
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Search functions
    searchVideos: (params) => ipcRenderer.invoke('search-videos', params),
    getTrending: (params) => ipcRenderer.invoke('get-trending', params),
    getMusic: (params) => ipcRenderer.invoke('get-music', params),
    getGaming: (params) => ipcRenderer.invoke('get-gaming', params),
    getSports: (params) => ipcRenderer.invoke('get-sports', params),
    
    // Folder and file operations
    selectFolder: () => ipcRenderer.invoke('select-folder'),
    openFile: (path) => ipcRenderer.invoke('open-file', path),
    openFolder: (path) => ipcRenderer.invoke('open-folder', path),
    
    // Download management
    startDownload: (options) => ipcRenderer.invoke('start-download', options),
    getActiveDownloads: () => ipcRenderer.invoke('get-active-downloads'),
    
    // Event listeners
    on: (channel, callback) => {
        const validChannels = [
            'new-download', 
            'download-progress', 
            'download-complete', 
            'download-error',
            'phase-change'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.on(channel, (event, ...args) => callback(...args));
        }
    },
    
    off: (channel, callback) => {
        const validChannels = [
            'new-download', 
            'download-progress', 
            'download-complete', 
            'download-error',
            'phase-change'
        ];
        
        if (validChannels.includes(channel)) {
            ipcRenderer.off(channel, callback);
        }
    }
});