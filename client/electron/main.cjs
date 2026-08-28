const { app, BrowserWindow, ipcMain, desktopCapturer, session, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

// Carregar preferências salvas de hardware acceleration
const configPath = path.join(app.getPath('userData'), 'settings.json');
let isHardwareAccelerationEnabled = true;

try {
  if (fs.existsSync(configPath)) {
    const rawData = fs.readFileSync(configPath, 'utf8');
    const settings = JSON.parse(rawData);
    if (settings.hardwareAcceleration === false) {
      isHardwareAccelerationEnabled = false;
    }
  }
} catch (e) {}

if (isHardwareAccelerationEnabled) {
  // Ativação máxima de aceleração por GPU
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
  app.commandLine.appendSwitch('enable-accelerated-video-encode');
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,VaapiVideoEncoder,CanvasOopRasterization,DirectCompositionVideoOverlays');
} else {
  // Desativação total se o usuário optar por rodar em modo puramente de software
  app.disableHardwareAcceleration();
}

// Identificador único do aplicativo no Windows para ícone correto na barra de tarefas
app.setAppUserModelId('com.melodia.app');

let mainWindow = null;

function createWindow() {
  const iconPath = path.join(__dirname, '../public/icon.ico');
  const iconImage = nativeImage.createFromPath(iconPath);

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 940,
    minHeight: 500,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#1e1f22',
    icon: iconImage,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  mainWindow.setIcon(iconImage);

  const isDev = process.env.NODE_ENV === 'development' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Suporte a captura nativa de tela e janelas para navigator.mediaDevices.getDisplayMedia
  if (session.defaultSession.setDisplayMediaRequestHandler) {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
        if (sources.length > 0) {
          callback({ video: sources[0], audio: 'loopback' });
        } else {
          callback({});
        }
      }).catch((err) => {
        console.error('Erro ao capturar fontes:', err);
        callback({});
      });
    });
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC handlers para controles de janela
ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

// IPC handlers para Aceleração de Hardware
ipcMain.handle('get-hardware-acceleration', () => {
  return isHardwareAccelerationEnabled;
});

ipcMain.handle('set-hardware-acceleration', (event, enabled) => {
  try {
    let settings = {};
    if (fs.existsSync(configPath)) {
      settings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
    settings.hardwareAcceleration = enabled;
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
    return true;
  } catch (e) {
    console.error('Erro ao salvar configuração de hardware:', e);
    return false;
  }
});

ipcMain.on('relaunch-app', () => {
  app.relaunch();
  app.exit(0);
});

// IPC handler para listagem de janelas e telas
ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['window', 'screen'],
    thumbnailSize: { width: 300, height: 200 },
  });

  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
  }));
});
