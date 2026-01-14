import React, { useState } from 'react'
import { SUPPORTED_LANGUAGES, SessionConfig } from '../types'

interface SetupScreenProps {
  onStart: (config: SessionConfig) => void
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStart }) => {
  const [yourLanguage, setYourLanguage] = useState('fr')
  const [theirLanguage, setTheirLanguage] = useState('en')
  const [deepgramApiKey, setDeepgramApiKey] = useState('')
  const [deeplApiKey, setDeeplApiKey] = useState('')

  const handleSwapLanguages = () => {
    const temp = yourLanguage
    setYourLanguage(theirLanguage)
    setTheirLanguage(temp)
  }

  const handleStart = () => {
    if (!deepgramApiKey) {
      alert('Please enter your Deepgram API key')
      return
    }

    onStart({
      yourLanguage,
      theirLanguage,
      deepgramApiKey,
      deeplApiKey,
    })
  }

  const isValid = deepgramApiKey.trim().length > 0

  return (
    <div className="setup-screen">
      <h1 className="setup-title">Shells</h1>
      <p className="setup-subtitle">
        Close investors in any language. Real-time bilingual captions for your investor calls.
      </p>

      <div className="setup-form">
        <div className="form-group">
          <label className="form-label">Languages</label>
          <div className="form-row">
            <select
              className="form-select"
              value={yourLanguage}
              onChange={(e) => setYourLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} (You)
                </option>
              ))}
            </select>

            <button className="swap-btn" onClick={handleSwapLanguages} title="Swap languages">
              ⇄
            </button>

            <select
              className="form-select"
              value={theirLanguage}
              onChange={(e) => setTheirLanguage(e.target.value)}
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} (Them)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Deepgram API Key (required)</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter your Deepgram API key"
            value={deepgramApiKey}
            onChange={(e) => setDeepgramApiKey(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">DeepL API Key (optional, for better translations)</label>
          <input
            type="password"
            className="form-input"
            placeholder="Enter your DeepL API key"
            value={deeplApiKey}
            onChange={(e) => setDeeplApiKey(e.target.value)}
          />
        </div>

        <div className="api-notice">
          <span>ℹ️</span>
          <div>
            <strong>API Keys needed:</strong>
            <br />
            • <a href="https://console.deepgram.com/" target="_blank" rel="noopener noreferrer">
              Deepgram
            </a>{' '}
            - Free tier: 12,500 minutes/month
            <br />
            • <a href="https://www.deepl.com/pro-api" target="_blank" rel="noopener noreferrer">
              DeepL
            </a>{' '}
            - Free tier: 500,000 chars/month
          </div>
        </div>

        <button
          className="btn btn-primary start-btn"
          onClick={handleStart}
          disabled={!isValid}
        >
          Start Session
        </button>
      </div>
    </div>
  )
}
