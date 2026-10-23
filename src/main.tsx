import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './app/styles.css'
import { isAndroidApp } from './native/platform'

if(isAndroidApp())document.documentElement.classList.add('native-android')

const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(<StrictMode><App /></StrictMode>)

// Advertising starts after the first-run language choice in LanguageGate.
