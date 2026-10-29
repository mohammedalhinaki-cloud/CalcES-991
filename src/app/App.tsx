import { useEffect, useState } from 'react'
import LanguageGate from '../i18n/LanguageGate'
import { getLanguage } from '../i18n/locale'
import { isAndroidApp } from '../native/platform'
import { CalculatorProvider, useCalculator } from '../state/CalculatorProvider'
import CalculatorShell from '../components/CalculatorShell'
import HardwareCalculator from '../components/device/HardwareCalculator'
import './device.css'

type CalculatorInterface = 'device' | 'workspace'
function initialInterface(): CalculatorInterface {
  try {
    const selected = new URLSearchParams(window.location.search).get('calculator')
    if(selected === 'silver') return 'workspace'
    if(selected === 'black') return 'device'
    return localStorage.getItem('calces_interface') === 'workspace' ? 'workspace' : 'device'
  }
  catch { return 'device' }
}
function CalculatorApplication() {
  const [variant, setVariant] = useState<CalculatorInterface>(initialInterface)
  const { dispatch, closeSubstitution, setWorkspaceOpen, setTool } = useCalculator()
  useEffect(() => {
    // Offline support belongs to the app lifecycle, not a removable toolbar.
    if(import.meta.env.PROD&&!isAndroidApp()&&'serviceWorker' in navigator) {
      void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{/* Calculator remains usable online. */})
    }
  },[])
  const english = getLanguage() === 'en'
  const toggle = () => {
    const next = variant === 'device' ? 'workspace' : 'device'
    dispatch({type:'CLOSE_MENU'})
    closeSubstitution()
    setTool(null)
    setWorkspaceOpen(false)
    setVariant(next)
    try { localStorage.setItem('calces_interface',next) } catch { /* Storage is optional. */ }
  }
  return <main className={`app-shell app-interface-${variant}`}>
    <div className="calculator-application" data-calculator-interface={variant}>
      <nav className="calculator-interface-switch" aria-label={english ? 'Calculator selection' : 'اختيار الحاسبة'}>
        <span>{variant === 'device' ? (english ? '991 classic · black' : 'حاسبة 991 السوداء') : (english ? '991 classic · silver' : 'حاسبة 991 الفضية')}</span>
        <button type="button" onClick={toggle} aria-label={english ? 'Switch calculator' : 'تبديل الحاسبة'} data-testid="calculator-switch">
          <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 7h15m-4-4 4 4-4 4M20 17H5m4-4-4 4 4 4" /></svg>
          {variant === 'device' ? (english ? 'Silver calculator' : 'الحاسبة الفضية') : (english ? 'Black calculator' : 'الحاسبة السوداء')}
        </button>
      </nav>
      {variant === 'device' ? <HardwareCalculator /> : <CalculatorShell />}
    </div>
  </main>
}

export default function App() {
  return <LanguageGate><CalculatorProvider><CalculatorApplication /></CalculatorProvider></LanguageGate>
}
