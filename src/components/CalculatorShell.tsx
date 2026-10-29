import { isAndroidApp } from '../native/platform'
import { getLanguage, localize } from '../i18n/locale'
import RatingPrompt from './RatingPrompt'
import { useLanguage } from '../i18n/LanguageGate'
import { useState } from 'react'
import AdvancedWorkspaces from './workspaces/AdvancedWorkspaces'
import Keypad from './keypad/Keypad'
import ModeMenu from './ModeMenu'
import HistoryPanel from './HistoryPanel'
import AppToolbar from './toolbar/AppToolbar'
import CalculatorDisplay from './display/CalculatorDisplay'
import CalcSubstitution from './CalcSubstitution'
import { useCalculator } from '../state/CalculatorProvider'

export default function CalculatorShell() {
  const { language, changeLanguage } = useLanguage()
  const { state, workspaceOpen, setWorkspaceOpen } = useCalculator()
  const [historyOpen, setHistoryOpen] = useState(false)
  return <div className="calculator-layout">
    <article id="calculator" className="calculator-body" aria-labelledby="calculator-title" data-layer={state.layer}>
      <header className="calculator-brand" dir="ltr">
        <h1 id="calculator-title" className="sr-only">{getLanguage() === 'en' ? 'CalcES 991 — Scientific Calculator' : 'CalcES 991 — حاسبة علمية'}</h1>
        <div><div className="brand-wordmark">CalcES <strong>991</strong></div><span className="brand-tagline">NATURAL SCIENTIFIC</span></div>
        <div className="brand-edition"><span>ES</span><small>CLASSIC</small></div>
      </header>
      <CalculatorDisplay />
      <AppToolbar onHistory={() => setHistoryOpen(true)} />
      <aside id="workspace" hidden={!workspaceOpen || state.off} className="workspace-panel" aria-labelledby="workspace-title">
        <header className="flex items-center justify-between gap-2"><h2 id="workspace-title" className="font-semibold">{localize('مساحة العمل · ')}{state.mode}</h2><button type="button" className="utility-button" aria-label={localize('إغلاق مساحة العمل')} onClick={() => setWorkspaceOpen(false)}>{localize('إخفاء ×')}</button></header>
        <p className="mt-2 text-xs leading-6">{localize('أدخل البيانات ثم اضغط «احسب» أو =. يمكنك إخفاء الأدوات للوصول إلى الأزرار؛ تبقى البيانات محفوظة.')}</p>
        <fieldset className="mt-3 mb-3"><legend className="mb-2 text-sm">{language === 'ar' ? 'لغة التطبيق' : 'App language'}</legend><div className="flex gap-2"><button type="button" className="utility-button" lang="ar" dir="rtl" aria-pressed={language === 'ar'} onClick={() => changeLanguage('ar')}>العربية</button><button type="button" className="utility-button" lang="en" aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>English</button></div></fieldset>
        <AdvancedWorkspaces />
        {!isAndroidApp() && <a className="utility-button mt-3" href={language === 'en' ? '/en/' : '/ar/'}>{language === 'en' ? 'Calculator user guide' : 'دليل استخدام الحاسبة'}</a>}
      </aside>
      <Keypad />
      <footer className="calculator-footnote" dir="ltr">CalcES · INDEPENDENT SCIENTIFIC CALCULATOR</footer>
    </article>
    <RatingPrompt /><ModeMenu /><CalcSubstitution />
    <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
  </div>
}
