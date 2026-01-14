import React, { useState, useCallback, useRef, useEffect } from 'react'
import { SetupScreen } from './components/SetupScreen'
import { SessionHeader } from './components/SessionHeader'
import { CaptionColumn } from './components/CaptionColumn'
import { DeepgramService } from './services/deepgram'
import { TranslationService } from './services/translation'
import { AudioCaptureService } from './services/audioCapture'
import { Caption, SessionConfig, getLanguageByCode } from './types'

type AppState = 'setup' | 'loading' | 'active'

function App() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [yourCaptions, setYourCaptions] = useState<Caption[]>([])
  const [theirCaptions, setTheirCaptions] = useState<Caption[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(false)

  // Service refs
  const micDeepgramRef = useRef<DeepgramService | null>(null)
  const systemDeepgramRef = useRef<DeepgramService | null>(null)
  const translationRef = useRef<TranslationService | null>(null)
  const micCaptureRef = useRef<AudioCaptureService | null>(null)
  const systemCaptureRef = useRef<AudioCaptureService | null>(null)
  const configRef = useRef<SessionConfig | null>(null)

  // Keep config in ref for callbacks
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Translate and add caption
  const addCaption = useCallback(
    async (caption: Partial<Caption>) => {
      if (!caption.text || !caption.speaker) return

      const currentConfig = configRef.current
      if (!currentConfig) return

      const sourceLang = caption.speaker === 'you'
        ? getLanguageByCode(currentConfig.yourLanguage)?.deeplCode || 'FR'
        : getLanguageByCode(currentConfig.theirLanguage)?.deeplCode || 'EN'

      const targetLangCode = caption.speaker === 'you'
        ? getLanguageByCode(currentConfig.theirLanguage)?.deeplCode || 'EN'
        : getLanguageByCode(currentConfig.yourLanguage)?.deeplCode || 'FR'

      let translatedText = caption.text

      // Translate if we have a translation service and it's a final caption
      if (translationRef.current && caption.isFinal) {
        try {
          translatedText = await translationRef.current.translate(
            caption.text,
            sourceLang,
            targetLangCode
          )
        } catch (error) {
          console.error('Translation error:', error)
        }
      }

      const newCaption: Caption = {
        id: caption.id || `${caption.speaker}-${Date.now()}`,
        text: caption.text,
        translatedText,
        timestamp: caption.timestamp || new Date(),
        speaker: caption.speaker,
        isFinal: caption.isFinal || false,
      }

      // Update the appropriate caption list
      if (caption.speaker === 'you') {
        setYourCaptions((prev) => {
          if (caption.isFinal) {
            return [...prev.filter(c => c.isFinal), newCaption]
          } else {
            const finals = prev.filter(c => c.isFinal)
            return [...finals, { ...newCaption, translatedText: `[...] ${caption.text}` }]
          }
        })
      } else {
        setTheirCaptions((prev) => {
          if (caption.isFinal) {
            return [...prev.filter(c => c.isFinal), newCaption]
          } else {
            const finals = prev.filter(c => c.isFinal)
            return [...finals, { ...newCaption, translatedText: `[...] ${caption.text}` }]
          }
        })
      }
    },
    []
  )

  // Enable system audio capture
  const enableSystemAudio = useCallback(async () => {
    if (!config || systemAudioEnabled) return

    const theirLang = getLanguageByCode(config.theirLanguage)
    if (!theirLang) return

    try {
      // Initialize Deepgram for system audio if not already
      if (!systemDeepgramRef.current) {
        systemDeepgramRef.current = new DeepgramService(
          config.deepgramApiKey,
          theirLang.deepgramCode,
          'them',
          addCaption
        )
        await systemDeepgramRef.current.connect()
      }

      // Initialize and start system audio capture
      systemCaptureRef.current = new AudioCaptureService((data) => {
        systemDeepgramRef.current?.sendAudio(data)
      })

      await systemCaptureRef.current.startDisplayCapture()
      setSystemAudioEnabled(true)
    } catch (error) {
      console.error('Failed to enable system audio:', error)
      alert('Could not capture system audio. Make sure to select a window/tab with audio.')
    }
  }, [config, systemAudioEnabled, addCaption])

  // Start session
  const handleStart = useCallback(async (sessionConfig: SessionConfig) => {
    console.log('Starting session...', sessionConfig)
    setConfig(sessionConfig)
    setAppState('loading')
    setError(null)

    // Get language codes
    const yourLang = getLanguageByCode(sessionConfig.yourLanguage)
    const theirLang = getLanguageByCode(sessionConfig.theirLanguage)

    if (!yourLang || !theirLang) {
      setError('Invalid language selection')
      setAppState('setup')
      return
    }

    // Initialize translation service
    if (sessionConfig.deeplApiKey) {
      translationRef.current = new TranslationService(sessionConfig.deeplApiKey)
    }

    try {
      // Initialize Deepgram for microphone (your voice)
      console.log('Connecting to Deepgram...')
      micDeepgramRef.current = new DeepgramService(
        sessionConfig.deepgramApiKey,
        yourLang.deepgramCode,
        'you',
        addCaption
      )

      await micDeepgramRef.current.connect()
      console.log('Deepgram connected!')

      // Initialize audio capture for microphone
      console.log('Starting microphone capture...')
      micCaptureRef.current = new AudioCaptureService((data) => {
        micDeepgramRef.current?.sendAudio(data)
      })

      await micCaptureRef.current.startMicrophoneCapture()
      console.log('Microphone capture started!')

      setIsConnected(true)
      setAppState('active')
    } catch (error) {
      console.error('Failed to start session:', error)
      setError(error instanceof Error ? error.message : 'Failed to start session')
      handleStop()
      setAppState('setup')
    }
  }, [addCaption])

  // Stop session
  const handleStop = useCallback(() => {
    console.log('Stopping session...')

    // Disconnect Deepgram
    micDeepgramRef.current?.disconnect()
    systemDeepgramRef.current?.disconnect()

    // Stop audio capture
    micCaptureRef.current?.stop()
    systemCaptureRef.current?.stop()

    // Clear refs
    micDeepgramRef.current = null
    systemDeepgramRef.current = null
    translationRef.current = null
    micCaptureRef.current = null
    systemCaptureRef.current = null

    // Reset state
    setIsConnected(false)
    setSystemAudioEnabled(false)
    setYourCaptions([])
    setTheirCaptions([])
    setAppState('setup')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      micDeepgramRef.current?.disconnect()
      systemDeepgramRef.current?.disconnect()
      micCaptureRef.current?.stop()
      systemCaptureRef.current?.stop()
    }
  }, [])

  // Loading screen
  if (appState === 'loading') {
    return (
      <div className="setup-screen">
        <h1 className="setup-title">Shells</h1>
        <p className="setup-subtitle">Connecting...</p>
        <div style={{ marginTop: '20px', color: '#666' }}>
          Please allow microphone access if prompted
        </div>
      </div>
    )
  }

  // Setup screen
  if (appState === 'setup') {
    return (
      <>
        <SetupScreen onStart={handleStart} />
        {error && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '8px',
            zIndex: 1000
          }}>
            {error}
          </div>
        )}
      </>
    )
  }

  // Active session
  return (
    <div className="app">
      <SessionHeader
        isActive={isConnected}
        yourLanguage={config?.yourLanguage || 'fr'}
        theirLanguage={config?.theirLanguage || 'en'}
        onStop={handleStop}
      />

      <div className="main-content">
        <CaptionColumn
          title="They said"
          speaker="them"
          language={config?.theirLanguage || 'en'}
          captions={theirCaptions}
          isLive={isConnected && systemAudioEnabled}
        />
        <CaptionColumn
          title="You said"
          speaker="you"
          language={config?.yourLanguage || 'fr'}
          captions={yourCaptions}
          isLive={isConnected}
        />
      </div>

      {!systemAudioEnabled && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1a1a25',
          border: '1px solid #2a2a3a',
          padding: '12px 24px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ color: '#a0a0b0' }}>
            To capture their voice, share your Zoom/Meet tab:
          </span>
          <button
            className="btn btn-primary"
            onClick={enableSystemAudio}
          >
            Share System Audio
          </button>
        </div>
      )}
    </div>
  )
}

export default App
