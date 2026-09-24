const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('repairShop', {
  dashboard: () => ipcRenderer.invoke('dashboard'),
  list: (table) => ipcRenderer.invoke('list', table),
  create: (table, values) => ipcRenderer.invoke('create', table, values),
  updateOrderStatus: (id, status) => ipcRenderer.invoke('updateOrderStatus', id, status),
  backup: () => ipcRenderer.invoke('backup'),
});
