import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Registrer service worker for offline-bruk (bare i produksjonsbygget).
// Adressen regnes ut fra baseURI, så appen kan ligge i en undermappe.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    const url = new URL('sw.js', document.baseURI)
    void navigator.serviceWorker.register(url, { scope: './' }).catch(() => {
      // Offline-støtte er "nice to have" – appen kjører fint uten.
    })
  })
}
