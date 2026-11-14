import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { localize } from '../../i18n/locale'
import { useLanguage } from '../../i18n/LanguageGate'
import DeskLayout from '../../app/DeskLayout'
import CalculatorShell from '../CalculatorShell'
import HistoryPanel from '../HistoryPanel'
import QuickAccessDrawer from './QuickAccessDrawer'
import ToolLoadingSkeleton from './ToolLoadingSkeleton'
import AppMenu, { AppMenuButton } from '../menu/AppMenu'
import type { WorkspaceTheme } from '../menu/AppMenu'
import AboutDialog from '../menu/AboutDialog'
import WorkspaceTabs, { WorkspaceToolsButton } from './WorkspaceTabs'
import type { WorkspaceToolId } from './WorkspaceTabs'
import { useCalculator } from '../../state/CalculatorProvider'

const EquationSolver = lazy(() => import('../../features/equation-solver/EquationSolver'))
const GraphingTool = lazy(() => import('../../features/graphing/GraphingTool'))
const UnitConverter = lazy(() => import('../../features/unit-converter/UnitConverter'))
const FormulasTool = lazy(() => import('../../features/formulas/FormulasTool'))

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
    <div className="calculator-guide">
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
    </div>
  )
}

export default function WorkspaceShell() {
  const { language } = useLanguage()
  const [activeTool, setActiveTool] = useState<WorkspaceToolId>('calculator')
  const [loadedTools, setLoadedTools] = useState<Set<WorkspaceToolId>>(() => new Set(['calculator']))
  const [theme, setTheme] = useState<WorkspaceTheme>(readTheme)
  const [toolsOpen, setToolsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [quickAccessOpen, setQuickAccessOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const { insertFromWorkspace, history, state } = useCalculator()
  const lastTextInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)
  const toolsButton = useRef<HTMLButtonElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)

  /** Dialogs opened from the menu return focus to the visible corner icon, not the closed menu. */
  const focusMenuButton = useCallback(() => window.requestAnimationFrame(() => {
    const active = document.activeElement
    if (!document.querySelector('dialog[open]') && (!active || active === document.body)) menuButton.current?.focus()
  }), [])
  const closeTools = () => {
    setToolsOpen(false)
    window.requestAnimationFrame(() => {
      const trigger = toolsButton.current
      if (trigger && trigger.offsetParent !== null && document.activeElement?.closest('.workspace-sidebar')) trigger.focus()
    })
  }
  const selectTool = (tool: WorkspaceToolId) => {
    setActiveTool(tool)
    setLoadedTools(current => {
      if (current.has(tool)) return current
      const next = new Set(current)
      next.add(tool)
      return next
    })
  }
  useEffect(() => {
    const rememberInput = (event: FocusEvent) => {
      const target = event.target
      if (target instanceof HTMLInputElement && target.type !== 'search' && !target.closest('.quick-access-dialog')) lastTextInput.current = target
      if (target instanceof HTMLTextAreaElement && !target.closest('.quick-access-dialog')) lastTextInput.current = target
    }
    document.addEventListener('focusin', rememberInput)
    return () => document.removeEventListener('focusin', rememberInput)
  }, [])
  const returnToCalculator = () => selectTool('calculator')
  const insertConstant = (latex: string) => {
    selectTool('calculator')
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
      <DeskLayout
        activeView={activeTool}
        toolsControl={<WorkspaceToolsButton ref={toolsButton} activeTool={activeTool} open={toolsOpen} onToggle={() => setToolsOpen(current => !current)} />}
        cornerControl={<AppMenuButton ref={menuButton} open={menuOpen} onClick={() => setMenuOpen(true)} />}
        navigation={<WorkspaceTabs activeTool={activeTool} onSelect={selectTool} open={toolsOpen} onClose={closeTools} />}
        navigationOpen={toolsOpen}
        onNavigationClose={closeTools}
        aside={<CalculatorGuide />}
      >
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
          {loadedTools.has('equation-solver') && (
            <Suspense fallback={<ToolLoadingSkeleton />}>
              <EquationSolver onReturn={returnToCalculator} />
            </Suspense>
          )}
        </section>

        <section
          id="tool-panel-graphing"
          className="tool-panel"
          role="tabpanel"
          aria-labelledby="tool-tab-graphing"
          tabIndex={0}
          hidden={activeTool !== 'graphing'}
        >
          {loadedTools.has('graphing') && (
            <Suspense fallback={<ToolLoadingSkeleton />}>
              <GraphingTool onReturn={returnToCalculator} />
            </Suspense>
          )}
        </section>

        <section
          id="tool-panel-unit-converter"
          className="tool-panel"
          role="tabpanel"
          aria-labelledby="tool-tab-unit-converter"
          tabIndex={0}
          hidden={activeTool !== 'unit-converter'}
        >
          {loadedTools.has('unit-converter') && (
            <Suspense fallback={<ToolLoadingSkeleton />}>
              <UnitConverter onReturn={returnToCalculator} onInsertConstant={insertConstant} />
            </Suspense>
          )}
        </section>

        <section
          id="tool-panel-formulas"
          className="tool-panel"
          role="tabpanel"
          aria-labelledby="tool-tab-formulas"
          tabIndex={0}
          hidden={activeTool !== 'formulas'}
        >
          {loadedTools.has('formulas') && (
            <Suspense fallback={<ToolLoadingSkeleton />}>
              <FormulasTool onReturn={returnToCalculator} onInsert={insertConstant} />
            </Suspense>
          )}
        </section>
      </DeskLayout>

      <AppMenu
        open={menuOpen}
        onClose={() => { setMenuOpen(false); focusMenuButton() }}
        theme={theme}
        onToggleTheme={() => setTheme(current => current === 'dark' ? 'light' : 'dark')}
        historyCount={history.length}
        historyDisabled={state.off}
        onOpenHistory={() => setHistoryOpen(true)}
        onOpenConstants={() => setQuickAccessOpen(true)}
        onOpenAbout={() => setAboutOpen(true)}
        onReturnFocus={focusMenuButton}
      />
      <HistoryPanel open={historyOpen} onClose={() => { setHistoryOpen(false); focusMenuButton() }} onRecall={() => selectTool('calculator')} />
      <QuickAccessDrawer open={quickAccessOpen} onClose={() => { setQuickAccessOpen(false); focusMenuButton() }} onInsert={insertQuickConstant} />
      <AboutDialog open={aboutOpen} onClose={() => { setAboutOpen(false); focusMenuButton() }} />
    </main>
  )
}
