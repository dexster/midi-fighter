const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
    openFile: (filePath) => ipcRenderer.invoke('dialog:openFile', filePath),
    saveFile: (filePath) => ipcRenderer.invoke('dialog:saveFile', filePath),
    readData: (filePath) => ipcRenderer.invoke('readData', filePath),
    writeData: (actions, filePath) => ipcRenderer.send('writeData', actions, filePath)
})