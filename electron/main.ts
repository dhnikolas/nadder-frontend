import { app, BrowserWindow, Menu } from 'electron';
import * as path from 'path';

// Определяем режим разработки
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  // Создаем окно браузера
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#ffffff',
    show: false,
  });

  // Загружаем приложение
  let startUrl: string;
  if (isDev) {
    startUrl = 'http://localhost:3000';
  } else {
    // В production используем правильный путь к build папке
    // app.getAppPath() возвращает путь к app.asar или к папке приложения
    const htmlPath = path.join(app.getAppPath(), 'build', 'index.html');
    startUrl = `file://${htmlPath}`;
    
    // Для отладки можно вывести путь
    console.log('Loading from:', startUrl);
  }

  mainWindow.loadURL(startUrl);

  // Показываем окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Открываем DevTools в режиме разработки
    if (isDev) {
      mainWindow?.webContents.openDevTools();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Обработка ошибок загрузки - перезагружаем правильный URL
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (!isDev) {
      // Если загрузка не удалась, перезагружаем правильный путь
      const htmlPath = path.join(app.getAppPath(), 'build', 'index.html');
      const correctUrl = `file://${htmlPath}`;
      
      // Проверяем, что текущий URL не совпадает с правильным
      if (validatedURL !== correctUrl) {
        console.log('Reloading to correct path:', correctUrl);
        mainWindow?.loadURL(correctUrl);
      }
    }
  });

  // Обработка навигации - предотвращаем загрузку неправильных путей
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    
    // Разрешаем только file:// протокол в production или localhost в dev
    if (!isDev && parsedUrl.protocol !== 'file:') {
      event.preventDefault();
    }
    
    // Если пытаемся загрузить file:// без пути, перенаправляем на index.html
    if (!isDev && parsedUrl.protocol === 'file:' && parsedUrl.pathname === '/') {
      event.preventDefault();
      const htmlPath = path.join(app.getAppPath(), 'build', 'index.html');
      mainWindow?.loadURL(`file://${htmlPath}`);
    }
  });

  // Обработка внешних ссылок
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });
}

// Создаем меню приложения для macOS
function createMenu(): void {
  if (process.platform === 'darwin') {
    const template: Electron.MenuItemConstructorOptions[] = [
      {
        label: app.getName(),
        submenu: [
          { role: 'about' as const },
          { type: 'separator' },
          { role: 'services' as const },
          { type: 'separator' },
          { role: 'hide' as const },
          { role: 'hideOthers' as const },
          { role: 'unhide' as const },
          { type: 'separator' },
          { role: 'quit' as const },
        ],
      },
      {
        label: 'Правка',
        submenu: [
          { role: 'undo' as const },
          { role: 'redo' as const },
          { type: 'separator' },
          { role: 'cut' as const },
          { role: 'copy' as const },
          { role: 'paste' as const },
          { role: 'selectAll' as const },
        ],
      },
      {
        label: 'Вид',
        submenu: [
          { role: 'reload' as const },
          { role: 'forceReload' as const },
          { role: 'toggleDevTools' as const },
          { type: 'separator' },
          { role: 'resetZoom' as const },
          { role: 'zoomIn' as const },
          { role: 'zoomOut' as const },
          { type: 'separator' },
          { role: 'togglefullscreen' as const },
        ],
      },
      {
        label: 'Окно',
        submenu: [
          { role: 'minimize' as const },
          { role: 'close' as const },
        ],
      },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  }
}

// Этот метод будет вызван когда Electron закончит инициализацию
app.whenReady().then(() => {
  createWindow();
  createMenu();

  app.on('activate', () => {
    // На macOS обычно пересоздают окно в приложении когда
    // иконка в dock нажата и нет других открытых окон
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выходим когда все окна закрыты, кроме macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Обработка протокола file:// для production
app.on('ready', () => {
  if (!isDev) {
    app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
  }
});

