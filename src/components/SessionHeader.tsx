import React from 'react'

interface SessionHeaderProps {
  isActive: boolean
  yourLanguage: string
  theirLanguage: string
  onStop: () => void
}

export const SessionHeader: React.FC<SessionHeaderProps> = ({
  isActive,
  yourLanguage,
  theirLanguage,
  onStop,
}) => {
  return (
    <div className="header">
      <div className="header-left">
        <span className="logo">Shells</span>
        <div className="status-badge">
          <span className={`status-dot ${isActive ? 'active' : ''}`} />
          {isActive ? 'Session Active' : 'Disconnected'}
        </div>
      </div>

      <div className="header-right">
        <div className="language-selector">
          <span>{yourLanguage.toUpperCase()}</span>
          <span className="language-arrow">↔</span>
          <span>{theirLanguage.toUpperCase()}</span>
        </div>

        {isActive && (
          <button className="btn btn-danger" onClick={onStop}>
            End Session
          </button>
        )}
      </div>
    </div>
  )
}
