import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { appConfig } from '@/lib/app-config'

document.title = appConfig.name

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
