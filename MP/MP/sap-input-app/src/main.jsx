import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Auto-recover from stale chunks on new deployments
window.addEventListener('vite:preloadError', (event) => {
  console.warn('Stale Vite chunk detected after deployment, reloading...', event);
  window.location.reload();
});

window.addEventListener('error', (e) => {
  if (e.message && (
    e.message.includes('dynamically imported module') || 
    e.message.includes('Loading chunk') || 
    e.message.includes('Importing a module script failed')
  )) {
    console.warn('Chunk load error detected, reloading...', e);
    window.location.reload();
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
