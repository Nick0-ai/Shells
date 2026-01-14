import React, { useEffect, useRef } from 'react'
import { Caption } from '../types'

interface CaptionColumnProps {
  title: string
  speaker: 'them' | 'you'
  language: string
  captions: Caption[]
  isLive: boolean
}

export const CaptionColumn: React.FC<CaptionColumnProps> = ({
  title,
  speaker,
  language,
  captions,
  isLive,
}) => {
  const listRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new captions arrive
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [captions])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  }

  return (
    <div className="caption-column">
      <div className="column-header">
        <div className="column-title">
          <span className={`column-icon ${speaker}`}>
            {speaker === 'them' ? '👤' : '🎤'}
          </span>
          <span>{title}</span>
          <span className="language-tag">{language.toUpperCase()}</span>
        </div>
        {isLive && (
          <div className="live-indicator">
            <span className="live-dot" />
            LIVE
          </div>
        )}
      </div>

      <div className="caption-list" ref={listRef}>
        {captions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎧</div>
            <p>Waiting for speech...</p>
            <p style={{ fontSize: '12px', marginTop: '8px' }}>
              {speaker === 'you'
                ? 'Start speaking to see your words transcribed'
                : 'Waiting for the other person to speak'}
            </p>
          </div>
        ) : (
          captions.map((caption) => (
            <div
              key={caption.id}
              className="caption-item"
              style={{ opacity: caption.isFinal ? 1 : 0.7 }}
            >
              <p className="caption-original">{caption.text}</p>
              {caption.translatedText && caption.translatedText !== caption.text && (
                <p className="caption-translated">{caption.translatedText}</p>
              )}
              <span className="caption-time">{formatTime(caption.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
