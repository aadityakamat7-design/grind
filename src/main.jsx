import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)

// Auto-reload when a stale JS chunk fails to parse (common after a rebuild
// deploys new chunk hashes while the browser still references old ones).
// The browser receives index.html instead of JS → "Unexpected token '<'".
window.addEventListener('error', (e) => {
  if (e?.message?.includes("Unexpected token '<'") && !window.location.hash.includes('reloaded')) {
    window.location.hash = 'reloaded';
    window.location.reload();
  }
});

// Register service worker for PWA installability + offline fallback
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}