import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure single instance lock so multiple copies don't corrupt databases
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow = null;
let serverPort = null;
let stopServerFn = null;

const isDev = process.env.NODE_ENV === 'development' || (!app.isPackaged && !process.env.ELECTRON_PROD_TEST);

function findAvailablePort(preferredPort = 3001) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => {
      const tempServer = net.createServer();
      tempServer.unref();
      tempServer.listen(0, () => {
        const port = tempServer.address().port;
        tempServer.close(() => resolve(port));
      });
    });
    server.listen(preferredPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

async function startEmbeddedServer() {
  // Set user data directory in OS app data path (permanent & writable)
  const userDataDir = path.join(app.getPath('userData'), 'data');
  process.env.VNOTE_DATA_DIR = userDataDir;

  // Static dist folder
  const distDir = app.isPackaged
    ? path.join(process.resourcesPath, 'app.asar/dist')
    : path.resolve(__dirname, '../dist');
  process.env.VNOTE_DIST_DIR = distDir;
  process.env.VNOTE_EMBEDDED = 'true';

  const port = await findAvailablePort(3001);
  process.env.PORT = String(port);

  const serverModule = await import('../server/index.js');
  const { server, port: actualPort } = await serverModule.startServer(port);
  stopServerFn = serverModule.stopServer;
  serverPort = actualPort;
  return actualPort;
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1420,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'VNote - Learning & Note Studio',
    backgroundColor: '#0c0f14',
    icon: path.join(__dirname, '../public/vnote_logo.png'),
    autoHideMenuBar: true,
    show: false, // Don't show until ready-to-show to prevent visual flicker
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false
    }
  });

  mainWindow.setMenuBarVisibility(false);

  // Smooth appearance when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links safely in system web browser (e.g. YouTube video links)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const currentHost = isDev ? 'localhost:5173' : `localhost:${serverPort}`;
    if (!url.includes(currentHost) && (url.startsWith('http:') || url.startsWith('https:'))) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  if (isDev) {
    // Development mode: load Vite dev server
    const devUrl = 'http://localhost:5173';
    try {
      await mainWindow.loadURL(devUrl);
    } catch {
      // If dev server takes a second to respond, retry briefly
      setTimeout(() => mainWindow.loadURL(devUrl), 1500);
    }
  } else {
    // Production mode: launch embedded server and load the app
    try {
      const port = await startEmbeddedServer();
      await mainWindow.loadURL(`http://localhost:${port}`);
    } catch (err) {
      console.error('Failed to start production server in desktop app:', err);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupApplicationMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' },
            { type: 'separator' },
            { role: 'services' },
            { type: 'separator' },
            { role: 'hide' },
            { role: 'hideOthers' },
            { role: 'unhide' },
            { type: 'separator' },
            { role: 'quit' }
          ]
        }]
      : []),
    {
      label: 'File',
      submenu: [
        isMac ? { role: 'close' } : { role: 'quit', label: 'Exit VNote' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Learn More',
          click: () => {
            shell.openExternal('https://github.com');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle('open-external', (_, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

ipcMain.handle('get-app-version', () => app.getVersion());

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

// App Lifecycle
app.whenReady().then(async () => {
  Menu.setApplicationMenu(null);
  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', async () => {
  if (stopServerFn) {
    await stopServerFn();
  }
});
