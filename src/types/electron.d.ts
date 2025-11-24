// Типы для Electron API, экспонируемого через preload
interface ElectronAPI {
  platform: string;
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

declare global {
  interface Window {
    electron?: ElectronAPI;
  }
}

export {};

