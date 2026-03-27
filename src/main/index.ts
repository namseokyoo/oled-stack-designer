import { join } from 'node:path'
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'node:fs/promises'
import { app, BrowserWindow, dialog, ipcMain, Menu, shell } from 'electron'
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

  const menuTemplate: Electron.MenuItemConstructorOptions[] = [
    {
      label: '파일',
      submenu: [
        {
          label: '새 프로젝트',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-project')
        },
        {
          label: '열기',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow?.webContents.send('menu:open')
        },
        { type: 'separator' },
        {
          label: '저장',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow?.webContents.send('menu:save')
        },
        {
          label: '다른 이름으로 저장',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow?.webContents.send('menu:save-as')
        },
        { type: 'separator' },
        {
          label: '내보내기',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export')
        },
        { type: 'separator' },
        { label: '종료', accelerator: 'Alt+F4', role: 'quit' }
      ]
    },
    {
      label: '편집',
      submenu: [
        {
          label: '실행취소',
          accelerator: 'CmdOrCtrl+Z',
          registerAccelerator: false,
          click: () => mainWindow?.webContents.send('menu:undo')
        },
        {
          label: '다시실행',
          accelerator: 'CmdOrCtrl+Y',
          registerAccelerator: false,
          click: () => mainWindow?.webContents.send('menu:redo')
        },
        { type: 'separator' },
        {
          label: '레이어 복제',
          accelerator: 'CmdOrCtrl+D',
          registerAccelerator: false,
          click: () => mainWindow?.webContents.send('menu:duplicate')
        },
        {
          label: '삭제',
          accelerator: 'Delete',
          registerAccelerator: false,
          click: () => mainWindow?.webContents.send('menu:delete')
        }
      ]
    },
    {
      label: '보기',
      submenu: [
        {
          label: '구조 모드',
          submenu: [
            {
              label: 'Single Stack',
              click: () => mainWindow?.webContents.send('menu:set-structure-mode', 'single')
            },
            {
              label: 'RGB 통합',
              click: () => mainWindow?.webContents.send('menu:set-structure-mode', 'rgb')
            }
          ]
        },
        {
          label: '두께 모드 전환',
          click: () => mainWindow?.webContents.send('menu:toggle-thickness')
        },
        { type: 'separator' },
        {
          label: '팔레트',
          submenu: [
            {
              label: 'Classic',
              click: () => mainWindow?.webContents.send('menu:set-palette', 'classic')
            },
            {
              label: 'Pastel',
              click: () => mainWindow?.webContents.send('menu:set-palette', 'pastel')
            },
            {
              label: 'Vivid',
              click: () => mainWindow?.webContents.send('menu:set-palette', 'vivid')
            }
          ]
        }
      ]
    },
    {
      label: '도움말',
      submenu: [
        {
          label: '도움말',
          accelerator: 'F1',
          click: () => mainWindow?.webContents.send('menu:help')
        },
        { type: 'separator' },
        {
          label: '제작자 정보',
          click: () => mainWindow?.webContents.send('menu:about')
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(menuTemplate)
  Menu.setApplicationMenu(menu)

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

ipcMain.handle('dialog:dirty-guard', async () => {
  if (!mainWindow) {
    return 'cancel'
  }

  const result = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: '저장되지 않은 변경사항',
    message: '저장되지 않은 변경사항이 있습니다.',
    detail: '계속하기 전에 저장하시겠습니까?',
    buttons: ['저장하고 계속', '저장하지 않고 계속', '취소'],
    defaultId: 0,
    cancelId: 2
  })

  if (result.response === 0) {
    return 'save'
  }

  if (result.response === 1) {
    return 'discard'
  }

  return 'cancel'
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

ipcMain.handle('app:get-version', () => app.getVersion())

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

ipcMain.handle('autosave:save', async (_, content: string) => {
  const dir = join(app.getPath('userData'), 'autosave')
  await mkdir(dir, { recursive: true })

  const timestamp = Date.now()
  const filePath = join(dir, `autosave-${timestamp}.json`)
  await writeFile(filePath, content, 'utf-8')

  const files = (await readdir(dir))
    .filter((f) => f.startsWith('autosave-') && f.endsWith('.json'))
    .sort()

  if (files.length > 3) {
    const toDelete = files.slice(0, files.length - 3)
    for (const f of toDelete) {
      try {
        await unlink(join(dir, f))
      } catch {
        // ignore
      }
    }
  }

  return filePath
})

ipcMain.handle('autosave:list', async () => {
  try {
    const dir = join(app.getPath('userData'), 'autosave')
    const files = (await readdir(dir))
      .filter((f) => f.startsWith('autosave-') && f.endsWith('.json'))
      .sort()
      .reverse()

    return files.map((f) => ({
      filePath: join(dir, f),
      timestamp: parseInt(f.replace('autosave-', '').replace('.json', ''), 10)
    }))
  } catch {
    return []
  }
})

ipcMain.handle('autosave:load', async (_, filePath: string) => {
  try {
    return await readFile(filePath, 'utf-8')
  } catch {
    return null
  }
})

ipcMain.handle('autosave:delete', async (_, filePath: string) => {
  try {
    await unlink(filePath)
  } catch {
    // ignore
  }
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
