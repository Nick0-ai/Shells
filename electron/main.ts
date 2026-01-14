import { app, BrowserWindow, ipcMain, desktopCapturer, systemPreferences } from 'electron'
import { join } from 'path'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  console.log('[Main] Creating window...')

  mainWindow = new BrowserWindow({
    width: 900,
    height: 700,
    minWidth: 600,
    minHeight: 400,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false, // Allow loading local files in dev
    },
  })

  // Debug: log renderer events
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Page loaded successfully')
  })

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Page failed to load:', errorCode, errorDescription)
  })

  mainWindow.webContents.on('crashed', () => {
    console.error('[Main] Renderer crashed!')
  })

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('[Main] Render process gone:', details.reason)
  })

  // Load the app
  const url = process.env.VITE_DEV_SERVER_URL
  console.log('[Main] Loading URL:', url || 'dist/index.html')

  if (url) {
    mainWindow.loadURL(url)
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  // Always open devtools for debugging
  mainWindow.webContents.openDevTools()

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// Get audio sources for system audio capture
ipcMain.handle('get-audio-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      fetchWindowIcons: false
    })
    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL()
    }))
  } catch (error) {
    console.error('Error getting audio sources:', error)
    return []
  }
})

// Check microphone permission (macOS)
ipcMain.handle('check-microphone-permission', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('microphone')
    if (status !== 'granted') {
      const granted = await systemPreferences.askForMediaAccess('microphone')
      return granted
    }
    return true
  }
  return true
})

// Check screen capture permission (macOS)
ipcMain.handle('check-screen-permission', async () => {
  if (process.platform === 'darwin') {
    const status = systemPreferences.getMediaAccessStatus('screen')
    return status === 'granted'
  }
  return true
})

app.whenReady().then(() => {
  console.log('[Main] App ready, creating window...')
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

// Log any unhandled errors
process.on('uncaughtException', (error) => {
  console.error('[Main] Uncaught exception:', error)
})
