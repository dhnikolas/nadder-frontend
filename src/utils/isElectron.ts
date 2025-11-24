// Проверка, запущено ли приложение в Electron
export const isElectron = (): boolean => {
  // Проверяем наличие window.electron, который экспонируется через preload
  return typeof window !== 'undefined' && 
         typeof (window as any).electron !== 'undefined' &&
         (window as any).electron !== null;
};

