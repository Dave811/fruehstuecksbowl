import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './style.css'

async function bootstrap() {
  try {
    const r = await fetch('/env-config.json', { cache: 'no-store' })
    if (r.ok) {
      const env = await r.json()
      ;(window as unknown as { __ENV__?: typeof env }).__ENV__ = env
    }
  } catch {
    // Lokal oder wenn Datei fehlt: getEnv() nutzt import.meta.env
  }
  createRoot(document.getElementById('app')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  )
}

bootstrap()
