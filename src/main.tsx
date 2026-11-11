import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import LimiteError from './componentes/LimiteError.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LimiteError>
      <App />
    </LimiteError>
  </StrictMode>,
)

// En producción, la app queda instalable en el celular y funciona sin
// señal después de la primera visita (PWA). En desarrollo no se registra
// para no estorbar la recarga en caliente.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      console.error('No se pudo registrar el service worker.', error)
    })
  })
}
