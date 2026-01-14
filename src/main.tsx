import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'

console.log('Shells starting...')

// Error boundary for debugging
window.onerror = (msg, url, line, col, error) => {
  console.error('Global error:', msg, url, line, col, error)
  document.body.innerHTML = `<pre style="color: red; padding: 20px;">Error: ${msg}\n${error?.stack || ''}</pre>`
}

const root = document.getElementById('root')
if (root) {
  console.log('Root element found, mounting React...')
  // No StrictMode - it causes double mount/unmount which breaks WebSocket connections
  ReactDOM.createRoot(root).render(<App />)
  console.log('React mounted!')
} else {
  console.error('Root element not found!')
}
