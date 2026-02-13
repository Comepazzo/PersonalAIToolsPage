/// <reference types="vite/client" />

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  electron?: {
    ipcRenderer: import('electron').IpcRenderer
    webFrame: {
      setZoomLevel(level: number): void
    }
  }
}
