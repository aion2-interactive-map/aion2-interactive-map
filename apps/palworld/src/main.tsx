import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider, type Theme, type ThemeStorage } from '@gamemap/map-shell'
import 'leaflet/dist/leaflet.css'
import '@gamemap/map-engine/engine.css'
import './index.css'
import './i18n'
import App from './App'

const THEME_KEY = 'palworld.theme'
const themeStorage: ThemeStorage = {
  get: () => {
    try {
      const v = localStorage.getItem(THEME_KEY)
      return v === 'light' || v === 'dark' || v === 'auto' ? (v as Theme) : null
    } catch {
      return null
    }
  },
  set: (t) => {
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch { /* no storage */ }
  },
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="auto" storage={themeStorage}>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
