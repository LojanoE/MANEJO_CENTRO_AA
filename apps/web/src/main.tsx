import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)

// Auto-update SW + relocate to /offline on disconnect
registerSW({ immediate: true })

// HashRouter: the route lives after '#', not in location.pathname.
window.addEventListener('offline', () => {
  if (location.hash !== '#/offline') location.hash = '#/offline'
})
window.addEventListener('online', () => {
  if (location.hash === '#/offline') location.hash = '#/'
})