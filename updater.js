// updater.js
const { autoUpdater } = require('electron-updater');
const { BrowserWindow, ipcMain, app } = require('electron');
const path = require('path');
const fs = require('fs');
const log = require('electron-log');

let electronStore;
let store;

const UPDATE_STATES = {
  CHECKING: 'checking-for-update',
  AVAILABLE: 'update-available',
  NOT_AVAILABLE: 'update-not-available',
  ERROR: 'error',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'update-downloaded',
  PENDING_INSTALL: 'pending-install'
};

let updateWindow = null;
let currentState = null;
let downloadProgress = 0;
let updateInfo = null;
let updateDownloaded = false;

async function initStore() {
  try {
    const storeModule = await import('electron-store');
    electronStore = storeModule.default;
    
    store = new electronStore({
      name: 'trimtuber-updates',
      defaults: {
        pendingUpdate: false,
        updateVersion: null,
        lastChecked: null,
        updatePath: null
      }
    });
    
    log.info('Store initialized successfully');
    return store;
  } catch (error) {
    log.error('Failed to initialize store:', error);
    throw error;
  }
}

function createUpdateWindow() {
  if (updateWindow) {
    updateWindow.focus();
    return updateWindow;
  }

  updateWindow = new BrowserWindow({
    width: 500,
    height: 350,
    frame: false,
    transparent: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    icon: path.join(__dirname, 'assets', 'logo.png'),
  });

  updateWindow.loadFile(path.join(__dirname, 'update.html'));
  updateWindow.center();
  updateWindow.setResizable(false);
  
  ipcMain.on('download-update', () => {
    log.info('User initiated update download');
    autoUpdater.downloadUpdate();
  });

  ipcMain.on('install-update', () => {
    log.info('User initiated update installation');
    store.set('pendingUpdate', false);
    store.set('updateVersion', null);
    store.set('updatePath', null);
    
    if (updateDownloaded) {
      autoUpdater.quitAndInstall(true, true);
    } else if (store.get('updatePath')) {
      const updatePath = store.get('updatePath');
      log.info(`Installing previously downloaded update from: ${updatePath}`);
      
      try {
        autoUpdater.forceDevUpdateConfig = true;
        autoUpdater.currentVersion = app.getVersion();
        autoUpdater.quitAndInstall(true, true);
      } catch (error) {
        log.error('Failed to install previously downloaded update:', error);
        if (updateWindow) {
          updateWindow.webContents.send('update-status', {
            state: UPDATE_STATES.ERROR,
            error: 'Failed to install update. Please download again.'
          });
        }
      }
    } else {
      log.info('No update path available, initiating new update check');
      checkForUpdates(true);
    }
  });

  ipcMain.on('install-later', () => {
    log.info('User postponed update installation');
    store.set('pendingUpdate', true);
    if (updateInfo) {
      store.set('updateVersion', updateInfo.version);
      if (autoUpdater.downloadedUpdateHelper && autoUpdater.downloadedUpdateHelper.updateFilePath) {
        store.set('updatePath', autoUpdater.downloadedUpdateHelper.updateFilePath);
        log.info(`Saved update path for later: ${autoUpdater.downloadedUpdateHelper.updateFilePath}`);
      }
    }
    if (updateWindow) {
      updateWindow.close();
      updateWindow = null;
    }
  });

  ipcMain.on('close-app', () => {
    log.info('User closed app from update dialog');
    app.quit();
  });

  updateWindow.on('closed', () => {
    updateWindow = null;
  });

  return updateWindow;
}

function setupAutoUpdater() {
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = false;
  
  log.transports.file.level = 'info';
  autoUpdater.logger = log;

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    currentState = UPDATE_STATES.CHECKING;
    sendStatusToWindow();
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    currentState = UPDATE_STATES.AVAILABLE;
    updateInfo = info;
    sendStatusToWindow();
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('No updates available');
    currentState = UPDATE_STATES.NOT_AVAILABLE;
    sendStatusToWindow();
    
    if (updateWindow) {
      setTimeout(() => {
        updateWindow.close();
        updateWindow = null;
      }, 1500);
    }
  });

  autoUpdater.on('error', (err) => {
    log.error('Error in auto-updater:', err);
    currentState = UPDATE_STATES.ERROR;
    sendStatusToWindow();
  });

  autoUpdater.on('download-progress', (progressObj) => {
    downloadProgress = progressObj.percent || 0;
    currentState = UPDATE_STATES.DOWNLOADING;
    log.info(`Download progress: ${downloadProgress.toFixed(2)}%`);
    sendStatusToWindow();
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    currentState = UPDATE_STATES.DOWNLOADED;
    updateInfo = info;
    updateDownloaded = true;
    
    if (autoUpdater.downloadedUpdateHelper && autoUpdater.downloadedUpdateHelper.updateFilePath) {
      log.info(`Update file path: ${autoUpdater.downloadedUpdateHelper.updateFilePath}`);
      store.set('updatePath', autoUpdater.downloadedUpdateHelper.updateFilePath);
    }
    
    sendStatusToWindow();
  });
}

function sendStatusToWindow() {
  if (updateWindow) {
    updateWindow.webContents.send('update-status', {
      state: currentState,
      progress: downloadProgress,
      info: updateInfo
    });
  }
}

async function checkPendingUpdate() {
  if (!store) {
    await initStore();
  }
  
  const pendingUpdate = store.get('pendingUpdate');
  const updatePath = store.get('updatePath');
  
  if (pendingUpdate) {
    log.info('Found pending update');
    currentState = UPDATE_STATES.PENDING_INSTALL;
    updateInfo = {
      version: store.get('updateVersion') || 'latest version',
      updateFilePath: updatePath
    };
    
    if (updatePath) {
      log.info(`Pending update path: ${updatePath}`);
      if (fs.existsSync(updatePath)) {
        autoUpdater.downloadedUpdateHelper = { updateFilePath: updatePath };
        updateDownloaded = true;
      } else {
        log.warn(`Update file no longer exists at ${updatePath}`);
        store.set('updatePath', null);
      }
    }
    
    const window = createUpdateWindow();
    sendStatusToWindow();
    return true;
  }
  return false;
}

async function checkForUpdates(showOnNoUpdates = false) {
  if (!store) {
    await initStore();
  }
  
  if (process.env.NODE_ENV === 'development') {
    log.info('Skipping update check in development mode');
    return Promise.resolve(false);
  }

  // Check for pending updates first
  if (await checkPendingUpdate()) {
    return Promise.resolve(true);
  }

  log.info('Checking for updates...');
  createUpdateWindow();

  try {
    const result = await autoUpdater.checkForUpdates();
    if (result && result.updateInfo) {
      log.info(`Update check completed. Version: ${result.updateInfo.version}`);
      
      store.set('lastChecked', new Date().toISOString());
      
      // If an update is available, return true and let the update window handle the flow
      return true;
    } else {
      log.info('No updates available or check failed');
      if (!showOnNoUpdates && updateWindow) {
        setTimeout(() => {
          updateWindow.close();
          updateWindow = null;
        }, 1500);
      }
      return false;
    }
  } catch (err) {
    log.error('Error checking for updates:', err);
    if (!showOnNoUpdates && updateWindow) {
      updateWindow.close();
      updateWindow = null;
    }
    return false;
  }
}

async function init() {
  await initStore();
  setupAutoUpdater();
}

module.exports = {
  init,
  checkForUpdates,
  UPDATE_STATES,
  updateWindow,
};