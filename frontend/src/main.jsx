import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth_store.jsx'
import './styles/base.css'
import './styles/components.css'

document.documentElement.setAttribute('data-theme', 'light')

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)
