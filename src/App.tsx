import React from 'react'

// Minimal test - no imports, no hooks
function App() {
  console.log('App rendering...')

  return (
    <div style={{
      padding: '40px',
      textAlign: 'center',
      color: 'white',
      background: '#0a0a0f',
      minHeight: '100vh'
    }}>
      <h1 style={{
        fontSize: '48px',
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
      }}>
        Shells
      </h1>
      <p style={{ marginTop: '20px', color: '#888' }}>
        If you see this, React works!
      </p>
    </div>
  )
}

export default App
