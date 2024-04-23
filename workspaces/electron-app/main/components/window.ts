import * as remoteMain from '@electron/remote/main';
import { app, BrowserWindow, ipcMain, nativeImage, dialog, Menu } from 'electron';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Logger } from '../utils/logger';
import { ControllerData } from '/shared-lib/models/controller';

declare const global: Global & { appConfig: any };
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export interface MidiConfig {
	activePath: string;
}

export class Window {
	private _electronWindow: BrowserWindow | undefined;

	isMac = process.platform === 'darwin'

	currentFilePath: string;

	menu: Menu;

	template: any[] = [
		...(this.isMac
			? [{
				label: app.name,
				submenu: [
					{ role: 'about' },
					{ type: 'separator' },
					{ role: 'services' },
					{ type: 'separator' },
					{ role: 'hideOthers' },
					{ role: 'unhide' },
					{ type: 'separator' },
					{ role: 'quit' }
				]
			}]
			: []) as Electron.MenuItemConstructorOptions[],
		{
			label: 'File',
			submenu: [
				{
					label: 'Open...',
					accelerator: 'CmdOrCtrl+O',
					click: () => this._electronWindow!.webContents.send('file', 'open')
				},
				{
					label: 'Save',
					accelerator: 'CmdOrCtrl+S',
					click: () => this._electronWindow!.webContents.send('file', 'save')
				},
				{
					label: 'Save As...',
					accelerator: 'CmdOrCtrl+Shift+S',
					click: () => this._electronWindow!.webContents.send('file', 'save-as')
				}
			]
		},
		{
			label: 'Edit',
			submenu: [
				{
					label: 'Edit Labels',
					accelerator: process.platform === 'darwin' ? 'Cmd+L' : 'Shift+L',
					click: () => this._electronWindow!.webContents.send('edit', 'label')
				},
				{
					label: `Edit Switch Type`,
					accelerator: process.platform === 'darwin' ? 'Cmd+T' : 'Shift+T',
					click: () => this._electronWindow!.webContents.send('edit', 'switch-type')
				},
				{
					label: `Edit Shift Switches`,
					accelerator: process.platform === 'darwin' ? 'Cmd+B' : 'Shift+B',
					click: () => this._electronWindow!.webContents.send('edit', 'shift')
				},
				{
					label: `Edit Shift LEDs`,
					accelerator: process.platform === 'darwin' ? 'Cmd+I' : 'Shift+I',
					click: () => this._electronWindow!.webContents.send('edit', 'led')
				},
				{
					label: `Edit Midi Values`,
					accelerator: process.platform === 'darwin' ? 'Cmd+V' : 'Shift+V',
					click: () => this._electronWindow!.webContents.send('edit', 'midi')
				},
				{
					label: `Cancel`,
					accelerator: 'Esc',
					click: () => this._electronWindow!.webContents.send('edit', 'cancel')
				}
			]
		},
		{
			label: 'Tools',
			submenu: [
				{
					label: 'Show MIDI values',
					accelerator: process.platform === 'darwin' ? 'Cmd+M' : 'Shift+M',
					click: () => this._electronWindow!.webContents.send('tools', 'midi-values')
				},
				{
					label: 'Refresh Controller List',
					accelerator: process.platform === 'darwin' ? 'Cmd+R' : 'Shift+R',
					click: () => this._electronWindow!.webContents.send('tools', 'refresh')
				}
			]
		}
	]

	constructor() {
		this.createWindow();
		this.loadRenderer();
		this.registerService();
	}

	private registerService() {
		ipcMain.handle('dialog:openFile', this.handleFileOpenDialog);
		ipcMain.handle('dialog:saveFile', this.handleFileSaveDialog);
		ipcMain.handle('dialog:showMessageBox', this.handleShowMessageBoxDialog);
		ipcMain.handle('readData', this.readData);
		ipcMain.handle('writeData', this.writeData);
		ipcMain.handle('updateMenu', this.updateMenu);
	}

	private createWindow(): void {
		this._electronWindow! = new BrowserWindow({
			width: 1200,
			height: 1200,
			backgroundColor: '#FFFFFF',
			icon: this.setDockIcon(),
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
			remoteMain.enable(this._electronWindow!.webContents);
		}
		this.createMenu();
		// this.openDevTools();
	}

	private createMenu() {
		// @ts-ignore
		this.menu = Menu.buildFromTemplate(this.template)
		Menu.setApplicationMenu(this.menu)
	}

	updateMenu = async (e: any, action: string) => {
		console.log('updateMenu - action: ', action)
		let submenu: any[];
		switch (action) {
			case 'midi-values':
				let label = this.template.find((item) => item.label === 'Tools')!.submenu![0].label;
				label = (label === 'Show MIDI values') ? 'Hide MIDI values' : 'Show MIDI values';
				this.template.find((item) => item.label === 'Tools')!.submenu![0].label = label;
				break;
			case 'edit':
				submenu = this.template.find((item) => item.label === 'Edit')!.submenu;
				submenu.forEach((item, index) => {
					if (index < submenu.length - 1) { item.enabled = false };
				});
				submenu[submenu.length - 1].enabled = true;
				break;
			case 'cancel':
				submenu = this.template.find((item) => item.label === 'Edit')!.submenu;
				submenu.forEach((item, index) => {
					if (index < submenu.length) { item.enabled = true };
				});
				submenu[submenu.length - 1].enabled = false;
				break;
		}

		this.menu = Menu.buildFromTemplate(this.template);
		Menu.setApplicationMenu(this.menu);
	}


	private setDockIcon(): Electron.NativeImage | undefined {
		Logger.debug('Loading icon');
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

	private loadIcon(iconPath: string): Electron.NativeImage | undefined {
		Logger.debug('Loading icon');
		let iconObject;

		iconPath = path.join(__dirname, iconPath);
		Logger.debug('Icon Path', iconPath);
		iconObject = nativeImage.createFromPath(iconPath);
		return iconObject;
	}

	private loadRenderer(): void {
		if (global.appConfig.configId === 'development') {
			// Dev mode, take advantage of the live reload by loading local URL
			this.electronWindow!.loadURL(`http://localhost:4200`);
		} else {
			// Else mode, we simply load angular bundle
			const indexPath = path.join(
				__dirname,
				'../renderer/angular_window/index.html'
			);
			this.electronWindow!.loadURL(`file://${indexPath}`);
		}

		if (global.appConfig.isOpenDevTools) {
			this.openDevTools();
		}

		// When the window is closed`
		this._electronWindow!.on('closed', () => {
			// Remove IPC Main listeners
			ipcMain.removeAllListeners();
			// Delete current reference
			delete this._electronWindow;
		});
	}

	private openDevTools(): void {
		this._electronWindow!.webContents.openDevTools();
		this._electronWindow!.webContents.on('devtools-opened', () => {
			this._electronWindow!.focus();
			setImmediate(() => {
				this._electronWindow!.focus();
			});
		});
	}

	handleShowMessageBoxDialog = async (e: any, options: any) => {
		if (options.icon) {
		options = {...options, icon: this.loadIcon(options.icon)}
		}
		console.log('handleShowMessage');
		return await dialog.showMessageBox(options);
	}
	
	async handleFileOpenDialog(e: any, defaultPath: string): Promise<string> {
		console.log('handleFileOpenDialog', defaultPath)
		const { canceled, filePaths } = await dialog.showOpenDialog({
			defaultPath: defaultPath,
			filters: [{ name: 'Data', extensions: ['json'] }]
		});
		if (!canceled) {
			this.currentFilePath = filePaths[0];
			const cfg = {
				activePath: this.currentFilePath
			}
			await this.setConfig(cfg);
			console.log('writeData - setConfig:', this.currentFilePath)
			return filePaths[0];
		}
		return '';
	}

	handleFileSaveDialog = async (e: any, defaultPath: string): Promise<string | undefined> => {
		const { canceled, filePath } = await dialog.showSaveDialog({
			defaultPath: defaultPath
		})
		if (!canceled) {
			this.currentFilePath = filePath!;
			const cfg = {
				activePath: this.currentFilePath
			}
			await this.setConfig(cfg);
			console.log('writeData - setConfig:', this.currentFilePath)
			return filePath;
		}
		return undefined;
	}

	private setConfig = async (cfg: any): Promise<void> => {
		const configPath = `${app.getPath('userData')}/midi.cfg`;

		// try {
		// 	await fs.access(configPath, fs.constants.F_OK);
		// } catch (err) {

		try {
			return await fs.writeFile(configPath, JSON.stringify(cfg), { encoding: 'utf8' });
		} catch (err) {
			console.error(err);
		}
	}

	private getConfig = async (): Promise<MidiConfig | undefined> => {
		const configPath = `${app.getPath('userData')}/midi.cfg`;
		let cfg: MidiConfig;
		try {
			cfg = JSON.parse(await fs.readFile(configPath, { encoding: 'utf8' }));
			return cfg;
		} catch (err) {
			console.error(err);
		}
		return undefined;
	}

	// arrow functions are required for all functions exposed to renderer to keep the context of this.
	// I assume this is because of how the functions are called in the renderer process
	readData = async (e: any) => {
		console.log('readData')

		if (!this.currentFilePath) {
			try {
				let config = await this.getConfig();
				if (config?.activePath) {
					this.currentFilePath = config.activePath;
				} else {
					this.currentFilePath = `${app.getPath('documents')}/MidiFighter/midi-actions.json`
					const cfg = {
						activePath: this.currentFilePath
					}
					await this.setConfig(cfg);
				}
			} catch (err) {
				return null;
			}

			console.log('readData - setting currentFilePath', this.currentFilePath)
		}

		console.log('readData - reading file from', this.currentFilePath)
		const data = await fs.readFile(this.currentFilePath, { encoding: 'utf8' });
		return JSON.parse(data);
	}

	writeData = async (e: any, controllerData: ControllerData) => {
		console.log('writeData -', this.currentFilePath)

		try {
			const dir = this.currentFilePath.split('/').slice(0, -1).join('/');
			try {
				await fs.access(dir);
			} catch {
				await fs.mkdir(dir, { recursive: true });
			}

			const file = this.currentFilePath;
			await fs.writeFile(file, JSON.stringify(controllerData));
		} catch (err) {
			console.error(err);
		}
	}

	public get electronWindow(): BrowserWindow | undefined {
		return this._electronWindow!;
	}
}
