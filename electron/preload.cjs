const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopApp', {
  isElectron: true,
  platform: process.platform,
  location: {
    provider: process.platform === 'win32' ? 'windows-native' : 'unsupported',
    getCurrentPosition: () => ipcRenderer.invoke('desktop-location:get-current'),
    geocodeAddress: (query) => ipcRenderer.invoke('desktop-location:geocode-address', query),
    openSystemLocationSettings: () => ipcRenderer.invoke('desktop-location:open-settings'),
  },
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
