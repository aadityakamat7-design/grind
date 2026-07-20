import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// Follow the system light/dark mode preference
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const applyTheme = (e) => document.documentElement.classList.toggle('dark', e.matches)
applyTheme(darkQuery)
darkQuery.addEventListener('change', applyTheme)

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)