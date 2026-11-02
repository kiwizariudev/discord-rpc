const { app, BrowserWindow, ipcMain, screen, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const url = require('url');

let mainWindow;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;

  mainWindow = new BrowserWindow({
    width: 960,
    height: 760,
    minWidth: 960,
    minHeight: 760,
    maxWidth: 960,
    maxHeight: 760,
    x: Math.floor((width - 960) / 2),
    y: Math.floor((height - 760) / 2),
    frame: false,
    transparent: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false,
      allowRunningInsecureContent: true,
      preload: path.join(__dirname, 'preload.js')
    },
    hasShadow: false,
  });

  // HTML is now in public/
  mainWindow.loadFile(path.join(__dirname, '..', 'public', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Register local:// protocol — resolves paths relative to project root
  protocol.registerFileProtocol('local', (request, callback) => {
    const filePath = request.url.replace('local://', '');
    const fullPath = path.join(__dirname, '..', filePath);
    callback({ path: fullPath });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Window controls
ipcMain.on('minimize-window', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// RPC handling
let rpcClient = null;

ipcMain.handle('start-rpc', async (event, config) => {
  try {
    if (rpcClient) {
      try { await rpcClient.destroy(); } catch (e) {}
      rpcClient = null;
    }

    const DiscordRPC = require('discord-rpc');
    DiscordRPC.register(config.clientId);

    rpcClient = new DiscordRPC.Client({ transport: 'ipc' });

    await rpcClient.login({ clientId: config.clientId });

    const activity = {};

    if (typeof config.activityType === 'number') {
      activity.type = config.activityType;
    }

    if (config.details && config.details.trim()) activity.details = config.details.trim();
    if (config.state && config.state.trim()) activity.state = config.state.trim();
    if (config.largeImageKey && config.largeImageKey.trim()) {
      activity.largeImageKey = config.largeImageKey.trim();
      if (config.largeImageText && config.largeImageText.trim()) {
        activity.largeImageText = config.largeImageText.trim();
      }
    }
    if (config.smallImageKey && config.smallImageKey.trim()) {
      activity.smallImageKey = config.smallImageKey.trim();
      if (config.smallImageText && config.smallImageText.trim()) {
        activity.smallImageText = config.smallImageText.trim();
      }
    }
    if (config.showTimestamp) {
      activity.startTimestamp = Date.now();
    }

    if (config.button1Label && config.button1Url) {
      activity.buttons = activity.buttons || [];
      activity.buttons.push({ label: config.button1Label, url: config.button1Url });
    }
    if (config.button2Label && config.button2Url) {
      activity.buttons = activity.buttons || [];
      activity.buttons.push({ label: config.button2Label, url: config.button2Url });
    }

    await rpcClient.setActivity(activity);

    rpcClient.on('disconnected', () => {
      if (mainWindow) mainWindow.webContents.send('rpc-disconnected');
      rpcClient = null;
    });

    return { success: true };
  } catch (err) {
    rpcClient = null;
    return { success: false, error: err.message };
  }
});

ipcMain.handle('stop-rpc', async () => {
  try {
    if (rpcClient) {
      await rpcClient.destroy();
      rpcClient = null;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-rpc-status', () => {
  return { running: rpcClient !== null };
});
