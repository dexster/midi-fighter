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
	openFile: (filePath: string) => ipcRenderer.invoke('dialog:openFile', filePath),
    saveFile: (filePath: string) => ipcRenderer.invoke('dialog:saveFile', filePath),
    readData: (filePath: string) => ipcRenderer.invoke('readData', filePath),
    writeData: (actions: string, filePath: string) => ipcRenderer.send('writeData', actions, filePath)
});

console.log('The preload script has been injected successfully.');
