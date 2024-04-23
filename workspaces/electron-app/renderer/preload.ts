// To secure user platform when running renderer process stuff,
// Node.JS and Electron remote APIs are only available in this script

import { contextBridge, ipcRenderer } from 'electron';

// So we expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
// Notice that we can also expose variables, not just functions
contextBridge.exposeInMainWorld('api', {
	node: () => process.versions.node,
	chrome: () => process.versions.chrome,
	electron: () => process.versions.electron,
	openFileDialog: (filePath: string) => ipcRenderer.invoke('dialog:openFile', filePath),
    saveFileDialog: (filePath: string) => ipcRenderer.invoke('dialog:saveFile', filePath),
    showMessageBoxDialog: (filePath: string) => ipcRenderer.invoke('dialog:showMessageBox', filePath),
    readData: (filePath: string) => ipcRenderer.invoke('readData'),
    writeData: (actions: string, filePath: string) => ipcRenderer.invoke('writeData', actions),
	onFile: (callback: any) => ipcRenderer.on('file', (_event, value) => callback(value)),
	onEdit: (callback: any) => ipcRenderer.on('edit', (_event, value) => callback(value)),
	onTools: (callback: any) => ipcRenderer.on('tools', (_event, value) => callback(value)),
	updateMenu: (actions: string) => ipcRenderer.invoke('updateMenu', actions)
});

console.log('The preload script has been injected successfully.');
