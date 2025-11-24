import { contextBridge } from 'electron';

// Безопасный API для взаимодействия между renderer и main процессами
contextBridge.exposeInMainWorld('electron', {
  platform: process.platform,
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron,
  },
});

