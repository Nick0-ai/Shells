import React, { useState, useCallback, useRef, useEffect } from 'react'
import { SetupScreen } from './components/SetupScreen'
import { SessionHeader } from './components/SessionHeader'
import { CaptionColumn } from './components/CaptionColumn'
import { DeepgramService } from './services/deepgram'
import { TranslationService } from './services/translation'
import { Caption, SessionConfig, getLanguageByCode } from './types'

type AppState = 'setup' | 'loading' | 'active'

function App() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [yourCaptions, setYourCaptions] = useState<Caption[]>([])
  const [theirCaptions, setTheirCaptions] = useState<Caption[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [micStream, setMicStream] = useState<MediaStream | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)

  // Service refs
  const micDeepgramRef = useRef<DeepgramService | null>(null)
  const translationRef = useRef<TranslationService | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
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

      const sourceLang = getLanguageByCode(currentConfig.yourLanguage)?.deeplCode || 'FR'
      const targetLangCode = getLanguageByCode(currentConfig.theirLanguage)?.deeplCode || 'EN'

      let translatedText = caption.text

      if (translationRef.current && caption.isFinal) {
        try {
          translatedText = await translationRef.current.translate(
            caption.text,
            sourceLang,
            targetLangCode
          )
        } catch (err) {
          console.error('Translation error:', err)
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

      setYourCaptions((prev) => {
        if (caption.isFinal) {
          return [...prev.filter(c => c.isFinal), newCaption]
        }
        const finals = prev.filter(c => c.isFinal)
        return [...finals, { ...newCaption, translatedText: `[...] ${caption.text}` }]
      })
    },
    []
  )

  // Start session
  const handleStart = useCallback(async (sessionConfig: SessionConfig) => {
    console.log('Starting session...', sessionConfig)
    setConfig(sessionConfig)
    setAppState('loading')
    setError(null)

    const yourLang = getLanguageByCode(sessionConfig.yourLanguage)
    if (!yourLang) {
      setError('Invalid language')
      setAppState('setup')
      return
    }

    // Init translation
    if (sessionConfig.deeplApiKey) {
      translationRef.current = new TranslationService(sessionConfig.deeplApiKey)
    }

    try {
      // Connect to Deepgram
      console.log('Connecting to Deepgram...')
      micDeepgramRef.current = new DeepgramService(
        sessionConfig.deepgramApiKey,
        yourLang.deepgramCode,
        'you',
        addCaption
      )
      await micDeepgramRef.current.connect()
      console.log('Deepgram connected!')

      // Get microphone
      console.log('Requesting microphone...')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: false
      })
      setMicStream(stream)
      micStreamRef.current = stream
      console.log('Microphone granted!')

      // Setup audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (event) => {
        const float32 = event.inputBuffer.getChannelData(0)
        const int16 = new Int16Array(float32.length)
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]))
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
        }
        micDeepgramRef.current?.sendAudio(int16.buffer)
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsConnected(true)
      setAppState('active')
    } catch (err) {
      console.error('Failed to start:', err)
      setError(err instanceof Error ? err.message : 'Failed to start')
      setAppState('setup')
    }
  }, [addCaption])

  // Stop session
  const handleStop = useCallback(() => {
    console.log('Stopping...')
    micDeepgramRef.current?.disconnect()
    processorRef.current?.disconnect()
    audioContextRef.current?.close()
    micStream?.getTracks().forEach(t => t.stop())

    micDeepgramRef.current = null
    translationRef.current = null
    audioContextRef.current = null
    processorRef.current = null

    setMicStream(null)
    setIsConnected(false)
    setYourCaptions([])
    setTheirCaptions([])
    setAppState('setup')
  }, [micStream])

  // Cleanup only on unmount
  useEffect(() => {
    return () => {
      console.log('App unmounting, cleaning up...')
      micDeepgramRef.current?.disconnect()
      processorRef.current?.disconnect()
      audioContextRef.current?.close()
      micStreamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, []) // Empty deps = only on unmount

  if (appState === 'loading') {
    return (
      <div className="setup-screen">
        <h1 className="setup-title">Shells</h1>
        <p className="setup-subtitle">Connecting...</p>
        <p style={{ marginTop: '20px', color: '#666' }}>Allow microphone if prompted</p>
      </div>
    )
  }

  if (appState === 'setup') {
    return (
      <>
        <SetupScreen onStart={handleStart} />
        {error && (
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ef4444',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8
          }}>
            {error}
          </div>
        )}
      </>
    )
  }

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
          isLive={false}
        />
        <CaptionColumn
          title="You said"
          speaker="you"
          language={config?.yourLanguage || 'fr'}
          captions={yourCaptions}
          isLive={isConnected}
        />
      </div>
    </div>
  )
}

export default App
