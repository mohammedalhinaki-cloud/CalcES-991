import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { localize } from '../../i18n/locale'
import { useLanguage } from '../../i18n/LanguageGate'
import CalculatorShell from '../CalculatorShell'
import HistoryPanel from '../HistoryPanel'
import FormulasTool from '../../features/formulas/FormulasTool'
import QuickAccessDrawer from './QuickAccessDrawer'
import ThemeToggle from './ThemeToggle'
import type { WorkspaceTheme } from './ThemeToggle'
import WorkspaceNavigation from './WorkspaceNavigation'
import type { WorkspaceToolId } from './WorkspaceNavigation'
import { useCalculator } from '../../state/CalculatorProvider'
import EquationSolver from '../../features/equation-solver/EquationSolver'
import GraphingTool from '../../features/graphing/GraphingTool'
import UnitConverter from '../../features/unit-converter/UnitConverter'

const THEME_STORAGE_KEY = 'calces_theme'

function readTheme(): WorkspaceTheme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function CalculatorGuide() {
  return (
    <aside className="calculator-guide" aria-label={localize('دليل سريع للحاسبة')}>
      <div className="guide-card-heading">
        <span className="guide-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>
        </span>
        <div>
          <span className="guide-eyebrow">{localize('مساحة تعلّم')}</span>
          <h3>{localize('ابدأ بخطوة صغيرة')}</h3>
        </div>
      </div>

      <p className="guide-intro">{localize('اكتب التعبير كما تراه، ثم استكشف الوظائف العلمية من لوحة المفاتيح.')}</p>

      <div className="guide-layer-list">
        <div className="guide-layer-row"><kbd>SHIFT</kbd><span>{localize('للوظائف الثانوية مثل العكسية والجذر التكعيبي')}</span></div>
        <div className="guide-layer-row"><kbd className="guide-alpha-key">ALPHA</kbd><span>{localize('للمتغيرات والرموز الإضافية')}</span></div>
      </div>

      <div className="guide-precision">
        <span className="precision-mark" aria-hidden="true">64</span>
        <div><strong>{localize('دقة عشرية عالية')}</strong><span>{localize('محرك الحساب يعمل محليًا على جهازك')}</span></div>
      </div>
    </aside>
  )
}

export default function WorkspaceShell() {
  const { language } = useLanguage()
  const [activeTool, setActiveTool] = useState<WorkspaceToolId>('calculator')
  const [theme, setTheme] = useState<WorkspaceTheme>(readTheme)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [quickAccessOpen, setQuickAccessOpen] = useState(false)
  const { insertFromWorkspace, history, state } = useCalculator()
  const lastTextInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  useEffect(() => {
    const rememberInput = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement && target.type !== 'search' && !target.closest('.quick-access-dialog')) lastTextInput.current = target
      if (target instanceof HTMLTextAreaElement && !target.closest('.quick-access-dialog')) lastTextInput.current = target
    }
    document.addEventListener('focusin', rememberInput)
    return () => document.removeEventListener('focusin', rememberInput)
  }, [])
  const returnToCalculator = () => setActiveTool('calculator')
  const insertConstant = (latex: string) => {
    setActiveTool('calculator')
    insertFromWorkspace(latex)
  }
  const insertQuickConstant = (latex: string, value: string) => {
    const target = lastTextInput.current
    const activePanel = target?.closest<HTMLElement>('[role="tabpanel"]')
    if (target?.isConnected && !activePanel?.hidden) {
      const start = target.selectionStart ?? target.value.length
      const end = target.selectionEnd ?? start
      const next = `${target.value.slice(0, start)}${value}${target.value.slice(end)}`
      const prototype = target instanceof HTMLInputElement ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype
      const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set
      if (setter) setter.call(target, next)
      else target.value = next
      target.dispatchEvent(new Event('input', { bubbles: true }))
      target.setSelectionRange(start + value.length, start + value.length)
      setQuickAccessOpen(false)
      window.requestAnimationFrame(() => {
        if (target.isConnected && !activePanel?.hidden) target.focus()
      })
      return
    }
    insertConstant(latex)
  }

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    themeColor?.setAttribute('content', theme === 'light' ? '#f3f6fb' : '#0b1020')
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The current session still follows the selected theme when storage is unavailable.
    }
  }, [theme])

  return (
    <main className="app-shell" data-theme={theme} lang={language}>
      <div className="ad-reservation" aria-label={localize('مساحة محجوزة لإعلان مستقبلي')}>
        <span className="ad-slot-caption">{localize('حسابات علمية على جهازك · مساحة تعلّم خاصة')}</span>
      </div>

      <header className="workspace-header">
        <div className="workspace-brand">
          <span className="workspace-brand-mark" aria-hidden="true"><span>CE</span><small>991</small></span>
          <span className="workspace-brand-copy">
            <span className="workspace-brand-title"><strong>CalcES</strong><span>991</span></span>
            <span className="workspace-brand-subtitle">{localize('مساحة علمية للتعلّم')}</span>
          </span>
        </div>
        <div className="workspace-header-actions">
          <span className="local-engine-badge"><span className="local-engine-dot" aria-hidden="true"/>{localize('محرك محلي')}</span>
          <button type="button" className="header-quick-button" aria-label={localize('الثوابت السريعة')} title={localize('الثوابت السريعة')} onClick={() => setQuickAccessOpen(true)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z"/><path d="M5 16.5a3 3 0 0 1 3-3h11M10 8h5m-5 3h4"/><path d="m15.5 6.5 1.5 1.5-1.5 1.5"/></svg>
            <span>{localize('الثوابت')}</span>
          </button>
          <button type="button" className="header-quick-button header-history-button" aria-label={localize(`السجل (${history.length})`)} title={localize('سجل الحسابات')} disabled={state.off} onClick={() => setHistoryOpen(true)}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7L3 9"/><path d="M3 4v5h5m4-1v4l3 2"/></svg>
            <span>{localize('السجل')}</span><b>{history.length}</b>
          </button>
          <ThemeToggle theme={theme} onToggle={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
        </div>
      </header>

      <div className="workspace-frame">
        <aside className="workspace-sidebar" aria-label={localize('التنقل بين الأدوات')}>
          <WorkspaceNavigation activeTool={activeTool} onSelect={setActiveTool} />
          <div className="workspace-sidebar-note">
            <span className="sidebar-note-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 5 6v5c0 4.6 2.8 8.1 7 10 4.2-1.9 7-5.4 7-10V6l-7-3Z"/><path d="m9 12 2 2 4-4"/></svg>
            </span>
            <div><strong>{localize('خصوصيتك أولاً')}</strong><span>{localize('الحسابات لا تغادر جهازك')}</span></div>
          </div>
        </aside>

        <section className="workspace-stage" aria-label={localize('مساحة الأدوات')}>
          <section
            id="tool-panel-calculator"
            className="tool-panel tool-panel--calculator"
            role="tabpanel"
            aria-labelledby="tool-tab-calculator"
            tabIndex={0}
            hidden={activeTool !== 'calculator'}
          >
            <div className="calculator-view">
              <header className="calculator-heading">
                <div>
                  <span className="calculator-heading-eyebrow">{localize('حاسبة علمية')}</span>
                  <h2>{localize('فكّر بالأرقام، لا بالأزرار')}</h2>
                  <p>{localize('اكتب تعبيرًا طبيعيًا واستخدم الأدوات العلمية في مساحة واحدة.')}</p>
                </div>
                <div className="calculator-heading-tags">
                  <span><i aria-hidden="true"/> {localize('عرض رياضي طبيعي')}</span>
                  <span>{localize('حساب محلي')}</span>
                </div>
              </header>
              <div className="calculator-main-grid">
                <CalculatorShell />
                <CalculatorGuide />
              </div>
            </div>
          </section>

          <section
            id="tool-panel-equation-solver"
            className="tool-panel"
            role="tabpanel"
            aria-labelledby="tool-tab-equation-solver"
            tabIndex={0}
            hidden={activeTool !== 'equation-solver'}
          >
            <EquationSolver onReturn={returnToCalculator} />
          </section>

          <section
            id="tool-panel-graphing"
            className="tool-panel"
            role="tabpanel"
            aria-labelledby="tool-tab-graphing"
            tabIndex={0}
            hidden={activeTool !== 'graphing'}
          >
            <GraphingTool onReturn={returnToCalculator} />
          </section>

          <section
            id="tool-panel-unit-converter"
            className="tool-panel"
            role="tabpanel"
            aria-labelledby="tool-tab-unit-converter"
            tabIndex={0}
            hidden={activeTool !== 'unit-converter'}
          >
            <UnitConverter onReturn={returnToCalculator} onInsertConstant={insertConstant} />
          </section>

          <section
            id="tool-panel-formulas"
            className="tool-panel"
            role="tabpanel"
            aria-labelledby="tool-tab-formulas"
            tabIndex={0}
            hidden={activeTool !== 'formulas'}
          >
            <FormulasTool onReturn={returnToCalculator} onInsert={insertConstant} />
          </section>

        </section>
      </div>
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} onRecall={() => setActiveTool('calculator')} />
      <QuickAccessDrawer open={quickAccessOpen} onClose={() => setQuickAccessOpen(false)} onInsert={insertQuickConstant} />
    </main>
  )
}
