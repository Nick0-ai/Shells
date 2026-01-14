import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // Get available audio sources for screen/window capture
  getAudioSources: () => ipcRenderer.invoke('get-audio-sources'),

  // Check permissions
  checkMicrophonePermission: () => ipcRenderer.invoke('check-microphone-permission'),
  checkScreenPermission: () => ipcRenderer.invoke('check-screen-permission'),

  // Platform info
  platform: process.platform
})

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      getAudioSources: () => Promise<Array<{
        id: string
        name: string
        thumbnail: string
      }>>
      checkMicrophonePermission: () => Promise<boolean>
      checkScreenPermission: () => Promise<boolean>
      platform: string
    }
  }
}
