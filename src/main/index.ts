import { join } from 'node:path'
import { readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'

let mainWindow: BrowserWindow | null = null
let pendingClose = false

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    show: false,
    autoHideMenuBar: true,
    title: 'OLED Stack Designer',
    backgroundColor: '#11131a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show()
  })

  mainWindow.on('close', (event) => {
    if (!pendingClose) {
      event.preventDefault()
      mainWindow?.webContents.send('app:before-close')
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
    pendingClose = false
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

ipcMain.handle('dialog:save', async (_, defaultName?: string) => {
  if (!mainWindow) {
    return null
  }

  const lowerDefaultName = defaultName?.toLowerCase() ?? ''
  const filters =
    lowerDefaultName.endsWith('.png')
      ? [{ name: 'PNG Image', extensions: ['png'] }]
      : lowerDefaultName.endsWith('.svg')
        ? [{ name: 'SVG Image', extensions: ['svg'] }]
        : [{ name: 'OLED Stack Project', extensions: ['oledstack', 'json'] }]

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: defaultName ?? 'project.oledstack',
    filters
  })

  return result.canceled ? null : result.filePath
})

ipcMain.handle('dialog:open', async () => {
  if (!mainWindow) {
    return null
  }

  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [{ name: 'OLED Stack Project', extensions: ['oledstack', 'json'] }],
    properties: ['openFile']
  })

  return result.canceled || !result.filePaths[0] ? null : result.filePaths[0]
})

ipcMain.handle('fs:write', async (_, filePath: string, content: string) => {
  await writeFile(filePath, content, 'utf-8')
})

ipcMain.handle('fs:write-binary', async (_, filePath: string, base64Data: string) => {
  const buffer = Buffer.from(base64Data, 'base64')
  await writeFile(filePath, buffer)
})

ipcMain.handle('fs:read', async (_, filePath: string) => {
  return readFile(filePath, 'utf-8')
})

ipcMain.handle('fs:unlink', async (_, filePath: string) => {
  try {
    await unlink(filePath)
  } catch {
    return
  }
})

ipcMain.handle('app:temp-path', () => {
  return join(app.getPath('temp'), 'oled-stack-designer-backup.json')
})

ipcMain.handle('app:check-backup', async () => {
  try {
    const tempPath = join(app.getPath('temp'), 'oled-stack-designer-backup.json')
    const stats = await stat(tempPath)
    return { exists: true, mtimeMs: stats.mtimeMs }
  } catch {
    return { exists: false, mtimeMs: 0 }
  }
})

ipcMain.handle('app:load-backup', async () => {
  try {
    const tempPath = join(app.getPath('temp'), 'oled-stack-designer-backup.json')
    return await readFile(tempPath, 'utf-8')
  } catch {
    return null
  }
})

ipcMain.handle('app:delete-backup', async () => {
  try {
    const tempPath = join(app.getPath('temp'), 'oled-stack-designer-backup.json')
    await unlink(tempPath)
  } catch {
    return
  }
})

ipcMain.handle('window:set-title', (_, title: string) => {
  mainWindow?.setTitle(title)
})

ipcMain.handle('app:confirm-close', () => {
  pendingClose = true
  mainWindow?.close()
})

ipcMain.handle('app:cancel-close', () => {
  pendingClose = false
})

ipcMain.handle('app:examples-path', () => {
  if (is.dev) {
    return join(__dirname, '../../resources/examples')
  }

  return join(app.getAppPath(), 'resources/examples')
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.sidequestlab.oled-stack-designer')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
