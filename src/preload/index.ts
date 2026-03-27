import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

export interface OledApi {
  showSaveDialog: (defaultName?: string) => Promise<string | null>
  showOpenDialog: () => Promise<string | null>
  showDirtyGuard: () => Promise<'save' | 'discard' | 'cancel'>
  writeFile: (filePath: string, content: string) => Promise<void>
  writeBinaryFile: (filePath: string, base64Data: string) => Promise<void>
  readFile: (filePath: string) => Promise<string>
  unlinkFile: (filePath: string) => Promise<void>
  getTempPath: () => Promise<string>
  checkBackup: () => Promise<{ exists: boolean; mtimeMs: number }>
  loadBackup: () => Promise<string | null>
  deleteBackup: () => Promise<void>
  getExamplesPath: () => Promise<string>
  setWindowTitle: (title: string) => Promise<void>
  getAppVersion: () => Promise<string>
  confirmClose: () => Promise<void>
  cancelClose: () => Promise<void>
  onBeforeClose: (callback: () => void | Promise<void>) => () => void
  onMenuCommand: (callback: (command: string, payload?: string) => void) => () => void
  autosaveSave: (content: string) => Promise<string>
  autosaveList: () => Promise<Array<{ filePath: string; timestamp: number }>>
  autosaveLoad: (filePath: string) => Promise<string | null>
  autosaveDelete: (filePath: string) => Promise<void>
}

const oledApi: OledApi = {
  showSaveDialog: (defaultName) => ipcRenderer.invoke('dialog:save', defaultName),
  showOpenDialog: () => ipcRenderer.invoke('dialog:open'),
  showDirtyGuard: () => ipcRenderer.invoke('dialog:dirty-guard'),
  writeFile: (filePath, content) => ipcRenderer.invoke('fs:write', filePath, content),
  writeBinaryFile: (filePath, base64Data) =>
    ipcRenderer.invoke('fs:write-binary', filePath, base64Data),
  readFile: (filePath) => ipcRenderer.invoke('fs:read', filePath),
  unlinkFile: (filePath) => ipcRenderer.invoke('fs:unlink', filePath),
  getTempPath: () => ipcRenderer.invoke('app:temp-path'),
  checkBackup: () => ipcRenderer.invoke('app:check-backup'),
  loadBackup: () => ipcRenderer.invoke('app:load-backup'),
  deleteBackup: () => ipcRenderer.invoke('app:delete-backup'),
  getExamplesPath: () => ipcRenderer.invoke('app:examples-path'),
  setWindowTitle: (title) => ipcRenderer.invoke('window:set-title', title),
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
  confirmClose: () => ipcRenderer.invoke('app:confirm-close'),
  cancelClose: () => ipcRenderer.invoke('app:cancel-close'),
  onBeforeClose: (callback) => {
    const handler = () => {
      void callback()
    }

    ipcRenderer.on('app:before-close', handler)
    return () => ipcRenderer.removeListener('app:before-close', handler)
  },
  autosaveSave: (content) => ipcRenderer.invoke('autosave:save', content),
  autosaveList: () => ipcRenderer.invoke('autosave:list'),
  autosaveLoad: (filePath) => ipcRenderer.invoke('autosave:load', filePath),
  autosaveDelete: (filePath) => ipcRenderer.invoke('autosave:delete', filePath),
  onMenuCommand: (callback) => {
    const menuEvents = [
      'menu:new-project',
      'menu:open',
      'menu:save',
      'menu:save-as',
      'menu:export',
      'menu:undo',
      'menu:redo',
      'menu:duplicate',
      'menu:delete',
      'menu:set-structure-mode',
      'menu:set-palette',
      'menu:toggle-thickness',
      'menu:help',
      'menu:about'
    ] as const

    const handlers = menuEvents.map((event) => {
      const handler = (_event: unknown, payload?: string) => {
        callback(event, payload)
      }

      ipcRenderer.on(event, handler)
      return { event, handler }
    })

    return () => {
      handlers.forEach(({ event, handler }) => ipcRenderer.removeListener(event, handler))
    }
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('oledApi', oledApi)
  } catch (error) {
    console.error(error)
  }
} else {
  const windowWithBridge = window as typeof window & {
    electron: typeof electronAPI
    oledApi: OledApi
  }

  windowWithBridge.electron = electronAPI
  windowWithBridge.oledApi = oledApi
}
