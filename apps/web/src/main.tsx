import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Auto-update SW + relocate to /offline on disconnect
registerSW({ immediate: true })

window.addEventListener('offline', () => {
  if (location.pathname !== '/offline') location.assign('/offline')
})
window.addEventListener('online', () => {
  if (location.pathname === '/offline') location.assign('/')
})