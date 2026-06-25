import * as Sentry from "@sentry/react"
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './i18n'
import './index.css'

Sentry.init({
  dsn: "https://8d07041c4787010b52d95d5792399362@o4511623586709504.ingest.de.sentry.io/4511623602962512",
  enabled: import.meta.env.PROD,
  environment: import.meta.env.MODE,
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
