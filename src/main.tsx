import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './app/App'
import './app/styles.css'
import { isAndroidApp } from './native/platform'
import { startAndroidAds } from './native/androidAds'

if(isAndroidApp())document.documentElement.classList.add('native-android')

const root = document.getElementById('root')
if (!root) throw new Error('Missing application root')
createRoot(root).render(<StrictMode><App /></StrictMode>)

// Bundled assets work offline; advertising is optional and cannot block calculator startup.
void startAndroidAds()
