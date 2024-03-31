const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
import { Buffer } from 'node:buffer';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 940,
    height: 1100,
    // height: 690,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    },
  });

  // and load the index.html of the app.
  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {

  ipcMain.handle('dialog:openFile', handleFileOpen)
  ipcMain.handle('dialog:saveFile', handleFileSave)
  ipcMain.handle('readData', readData);
  ipcMain.on('writeData', writeData);

  createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
async function handleFileOpen(e, defaultPath) {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    defaultPath: defaultPath,
    filters: [{ name: 'Data', extensions: ['json'] }]
  });
  if (!canceled) {
    return filePaths[0];
  }
}

async function handleFileSave(e, defaultPath) {
  const { canceled, filePath } = await dialog.showSaveDialog({
    defaultPath: defaultPath
  })
  if (!canceled) {
    return filePath
  }
}

async function readData(e, filePath) {
  const configPath = `${path.resolve(__dirname)}/midi.cfg`;

  try {
    try {
      await fs.access(configPath, fs.constants.F_OK);
    } catch (err) {
      const cfg = {
        activePath: `${path.resolve(__dirname, '../', 'renderer', 'data')}/midi-actions.json`
      }
      await fs.writeFile(configPath, JSON.stringify(cfg), { encoding: 'utf8' });
    }

    let file;
    
    if (filePath) {
      file = filePath;
    } else {
      const cfg = await fs.readFile(configPath, { encoding: 'utf8' });
      file = JSON.parse(cfg).activePath;
    }

    const data = await fs.readFile(file, { encoding: 'utf8' });
    return JSON.parse(data);
  } catch (err) {
    return {title: '', actions: [{},{},{},{}], shiftActions: [{},{},{},{}]};
  }
}

async function writeData(e, actions, filePath) {
  try {
    // const file = `${path.resolve(__dirname, '../', 'renderer')}/message.json`;
    const file = `${filePath}/message.json`;
    const data = new Uint8Array(Buffer.from(actions));
    const promise = fs.writeFile(filePath, data);
    await promise;
  } catch (err) {
    console.error(err);
  }
}