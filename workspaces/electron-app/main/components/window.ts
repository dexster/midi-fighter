import * as remoteMain from '@electron/remote/main';
import { app, BrowserWindow, ipcMain, nativeImage, dialog } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Logger } from '../utils/logger';

declare const global: Global;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class Window {
	private _electronWindow: BrowserWindow | undefined;

	constructor() {
		this.createWindow();
		this.loadRenderer();
		this.registerService();
	}

	private createWindow(): void {
		this._electronWindow = new BrowserWindow({
			width: 1200,
			height: 1200,
			backgroundColor: '#FFFFFF',
			icon: this.loadIcon(),
			webPreferences: {
				// Default behavior in Electron since 5, that
				// limits the powers granted to remote content
				nodeIntegration: global.appConfig.isNodeIntegration,
				// Isolate window context to protect against prototype pollution
				contextIsolation: global.appConfig.isContextIsolation,
				// Introduced in Electron 20 and enabled by default
				// Among others security constraints, it prevents from required
				// CommonJS modules imports to be bundled into preload script
				sandbox: global.appConfig.isSandbox,
				// Use a preload script to enhance security
				preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			},
		});

		// Disable the remote module to enhance security
		if (global.appConfig.isEnableRemoteModule) {
			remoteMain.enable(this._electronWindow.webContents);
		}
	}

	private loadIcon(): Electron.NativeImage | undefined {
		let iconObject;
		if (global.appConfig.isIconAvailable) {
			const iconPath = path.join(__dirname, 'icons/icon.png');
			Logger.debug('Icon Path', iconPath);
			iconObject = nativeImage.createFromPath(iconPath);
			// Change dock icon on MacOS
			if (iconObject && process.platform === 'darwin') {
				app.dock.setIcon(iconObject);
			}
		}
		return iconObject;
	}

	private loadRenderer(): void {
		if (global.appConfig.configId === 'development') {
			// Dev mode, take advantage of the live reload by loading local URL
			this.electronWindow.loadURL(`http://localhost:4200`);
		} else {
			// Else mode, we simply load angular bundle
			const indexPath = path.join(
				__dirname,
				'../renderer/angular_window/index.html'
			);
			this.electronWindow.loadURL(`file://${indexPath}`);
		}

		if (global.appConfig.isOpenDevTools) {
			this.openDevTools();
		}

		// When the window is closed`
		this._electronWindow.on('closed', () => {
			// Remove IPC Main listeners
			ipcMain.removeAllListeners();
			// Delete current reference
			delete this._electronWindow;
		});
	}

	private openDevTools(): void {
		this._electronWindow.webContents.openDevTools();
		this._electronWindow.webContents.on('devtools-opened', () => {
			this._electronWindow.focus();
			setImmediate(() => {
				this._electronWindow.focus();
			});
		});
	}

	async handleFileOpen(e: any, defaultPath: string): Promise<string> {
		console.log('handleFileOpen', e, defaultPath)
		const { canceled, filePaths } = await dialog.showOpenDialog({
		  defaultPath: defaultPath,
		  filters: [{ name: 'Data', extensions: ['json'] }]
		});
		if (!canceled) {
		  return filePaths[0];
		}
		return '';
	  }

	  async handleFileSave(e: any, defaultPath: string): Promise<string> {
		const { canceled, filePath } = await dialog.showSaveDialog({
		  defaultPath: defaultPath
		})
		if (!canceled) {
		  return filePath
		}
		return '';
	  }
	  
	  async readData(e: any, filePath: string | null) {
		const configPath = `${path.resolve(__dirname)}/midi.cfg`;
	  
		try {
		  try {
			await fs.access(configPath, fs.constants.F_OK);
		  } catch (err) {
			const cfg = {
			//   activePath: `${path.resolve(__dirname, '../', 'renderer', 'data')}/midi-actions.json`
			  activePath: `${path.resolve(__dirname, '../../')}/midi-actions.json`
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
		  return null;
		}
	  }
	  
	  async writeData(e: any, actions: string, filePath: string) {
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

	private registerService() {
		ipcMain.handle('dialog:openFile', this.handleFileOpen);
		ipcMain.handle('dialog:saveFile', this.handleFileSave);
		ipcMain.handle('readData', this.readData);
		ipcMain.on('writeData', this.writeData);
	}

	public get electronWindow(): BrowserWindow | undefined {
		return this._electronWindow;
	}
}
