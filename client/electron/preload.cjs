const { contextBridge, ipcRenderer } = require('electron');

const api = {
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  getHardwareAcceleration: () => ipcRenderer.invoke('get-hardware-acceleration'),
  setHardwareAcceleration: (enabled) => ipcRenderer.invoke('set-hardware-acceleration', enabled),
  relaunchApp: () => ipcRenderer.send('relaunch-app'),
};

contextBridge.exposeInMainWorld('electronAPI', api);
contextBridge.exposeInMainWorld('electron', api);
