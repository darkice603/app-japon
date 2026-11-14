import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './lib/auth'
import { ProfilProvider } from './lib/profil'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ProfilProvider>
          <App />
        </ProfilProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
