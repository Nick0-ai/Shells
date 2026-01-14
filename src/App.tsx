import React, { useState, useCallback, useRef, useEffect } from 'react'
import { SetupScreen } from './components/SetupScreen'
import { SessionHeader } from './components/SessionHeader'
import { CaptionColumn } from './components/CaptionColumn'
import { DeepgramService } from './services/deepgram'
import { TranslationService } from './services/translation'
import { AudioCaptureService } from './services/audioCapture'
import { Caption, SessionConfig, getLanguageByCode } from './types'

type AppState = 'setup' | 'selecting-source' | 'active'

function App() {
  const [appState, setAppState] = useState<AppState>('setup')
  const [config, setConfig] = useState<SessionConfig | null>(null)
  const [yourCaptions, setYourCaptions] = useState<Caption[]>([])
  const [theirCaptions, setTheirCaptions] = useState<Caption[]>([])
  const [isConnected, setIsConnected] = useState(false)

  // Service refs
  const micDeepgramRef = useRef<DeepgramService | null>(null)
  const systemDeepgramRef = useRef<DeepgramService | null>(null)
  const translationRef = useRef<TranslationService | null>(null)
  const micCaptureRef = useRef<AudioCaptureService | null>(null)
  const systemCaptureRef = useRef<AudioCaptureService | null>(null)

  // Interim caption refs (for updating non-final captions)
  const yourInterimRef = useRef<string | null>(null)
  const theirInterimRef = useRef<string | null>(null)

  // Translate and add caption
  const addCaption = useCallback(
    async (caption: Partial<Caption>, targetLang: string) => {
      if (!caption.text || !caption.speaker) return

      const sourceLang = caption.speaker === 'you'
        ? getLanguageByCode(config?.yourLanguage || 'fr')?.deeplCode || 'FR'
        : getLanguageByCode(config?.theirLanguage || 'en')?.deeplCode || 'EN'

      const targetLangCode = caption.speaker === 'you'
        ? getLanguageByCode(config?.theirLanguage || 'en')?.deeplCode || 'EN'
        : getLanguageByCode(config?.yourLanguage || 'fr')?.deeplCode || 'FR'

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
        if (caption.isFinal) {
          yourInterimRef.current = null
          setYourCaptions((prev) => [...prev.filter(c => c.isFinal), newCaption])
        } else {
          yourInterimRef.current = caption.text
          setYourCaptions((prev) => {
            const finals = prev.filter(c => c.isFinal)
            return [...finals, { ...newCaption, translatedText: `[...] ${caption.text}` }]
          })
        }
      } else {
        if (caption.isFinal) {
          theirInterimRef.current = null
          setTheirCaptions((prev) => [...prev.filter(c => c.isFinal), newCaption])
        } else {
          theirInterimRef.current = caption.text
          setTheirCaptions((prev) => {
            const finals = prev.filter(c => c.isFinal)
            return [...finals, { ...newCaption, translatedText: `[...] ${caption.text}` }]
          })
        }
      }
    },
    [config]
  )

  // Start session
  const handleStart = useCallback(async (sessionConfig: SessionConfig) => {
    setConfig(sessionConfig)

    // Get language codes
    const yourLang = getLanguageByCode(sessionConfig.yourLanguage)
    const theirLang = getLanguageByCode(sessionConfig.theirLanguage)

    if (!yourLang || !theirLang) {
      alert('Invalid language selection')
      return
    }

    // Initialize translation service
    if (sessionConfig.deeplApiKey) {
      translationRef.current = new TranslationService(sessionConfig.deeplApiKey)
    }

    // Initialize Deepgram for microphone (your voice)
    micDeepgramRef.current = new DeepgramService(
      sessionConfig.deepgramApiKey,
      yourLang.deepgramCode,
      'you',
      (caption) => addCaption(caption, theirLang.deeplCode)
    )

    // Initialize Deepgram for system audio (their voice)
    systemDeepgramRef.current = new DeepgramService(
      sessionConfig.deepgramApiKey,
      theirLang.deepgramCode,
      'them',
      (caption) => addCaption(caption, yourLang.deeplCode)
    )

    try {
      // Connect to Deepgram
      await Promise.all([
        micDeepgramRef.current.connect(),
        systemDeepgramRef.current.connect(),
      ])

      // Initialize audio capture for microphone
      micCaptureRef.current = new AudioCaptureService((data) => {
        micDeepgramRef.current?.sendAudio(data)
      })

      // Initialize audio capture for system audio
      systemCaptureRef.current = new AudioCaptureService((data) => {
        systemDeepgramRef.current?.sendAudio(data)
      })

      // Start microphone capture
      await micCaptureRef.current.startMicrophoneCapture()

      // Start system audio capture (user needs to share screen/tab)
      try {
        await systemCaptureRef.current.startDisplayCapture()
      } catch (error) {
        console.log('System audio not available, continuing with mic only')
        // We can still work with just the microphone
      }

      setIsConnected(true)
      setAppState('active')
    } catch (error) {
      console.error('Failed to start session:', error)
      alert(`Failed to start session: ${error instanceof Error ? error.message : 'Unknown error'}`)
      handleStop()
    }
  }, [addCaption])

  // Stop session
  const handleStop = useCallback(() => {
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
    setYourCaptions([])
    setTheirCaptions([])
    setAppState('setup')
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleStop()
    }
  }, [handleStop])

  // Render based on state
  if (appState === 'setup') {
    return <SetupScreen onStart={handleStart} />
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
          isLive={isConnected}
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
