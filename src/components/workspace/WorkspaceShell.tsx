import { lazy, Suspense, useCallback, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLanguage } from '../../i18n/LanguageGate'
import DeskLayout from '../../app/DeskLayout'
import { useCalculator } from '../../state/CalculatorProvider'
import CalculatorShell from '../CalculatorShell'
import HistoryPanel from '../HistoryPanel'
import AboutDialog from '../menu/AboutDialog'
import AppMenu, { AppMenuButton } from '../menu/AppMenu'
import CalculatorGuide, { CalculatorIntro } from './CalculatorGuide'
import QuickAccessDrawer from './QuickAccessDrawer'
import ToolLoadingSkeleton from './ToolLoadingSkeleton'
import { useQuickConstantInsertion } from './useQuickConstantInsertion'
import { useWorkspaceTheme } from './useWorkspaceTheme'
import WorkspaceTabs, { WORKSPACE_TOOLS, WorkspaceToolsButton } from './WorkspaceTabs'
import type { WorkspaceToolId } from './WorkspaceTabs'

const EquationSolver = lazy(() => import('../../features/equation-solver/EquationSolver'))
const GraphingTool = lazy(() => import('../../features/graphing/GraphingTool'))
const UnitConverter = lazy(() => import('../../features/unit-converter/UnitConverter'))
const FormulasTool = lazy(() => import('../../features/formulas/FormulasTool'))

interface ToolActions {
  /** Back to the calculator. */
  returnToCalculator: () => void
  /** Switch to the calculator and insert LaTeX at the editor caret. */
  insertIntoCalculator: (latex: string) => void
}

/** Secondary tools load on first open, then stay mounted so their inputs survive switching. */
const LAZY_TOOLS: Record<Exclude<WorkspaceToolId, 'calculator'>, (actions: ToolActions) => ReactNode> = {
  'equation-solver': ({ returnToCalculator }) => <EquationSolver onReturn={returnToCalculator} />,
  graphing: ({ returnToCalculator }) => <GraphingTool onReturn={returnToCalculator} />,
  'unit-converter': ({ returnToCalculator, insertIntoCalculator }) => <UnitConverter onReturn={returnToCalculator} onInsertConstant={insertIntoCalculator} />,
  formulas: ({ returnToCalculator, insertIntoCalculator }) => <FormulasTool onReturn={returnToCalculator} onInsert={insertIntoCalculator} />,
}

/** Only one modal is ever open: the settings menu or one of the dialogs it launches. */
type OpenDialog = 'menu' | 'history' | 'constants' | 'about' | null

/**
 * Application shell: an ultra-minimal header (logo + Tools · settings icon), the five
 * workspaces as tab panels, and the dialogs reachable from the corner settings menu.
 */
export default function WorkspaceShell() {
  const { language } = useLanguage()
  const { theme, toggleTheme } = useWorkspaceTheme()
  const { insertFromWorkspace, history, state } = useCalculator()

  const [activeTool, setActiveTool] = useState<WorkspaceToolId>('calculator')
  const [loadedTools, setLoadedTools] = useState<ReadonlySet<WorkspaceToolId>>(() => new Set(['calculator']))
  const [toolsOpen, setToolsOpen] = useState(false)
  const [openDialog, setOpenDialog] = useState<OpenDialog>(null)
  const toolsButton = useRef<HTMLButtonElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)

  const selectTool = useCallback((tool: WorkspaceToolId) => {
    setActiveTool(tool)
    setLoadedTools(current => (current.has(tool) ? current : new Set(current).add(tool)))
  }, [])
  const returnToCalculator = useCallback(() => selectTool('calculator'), [selectTool])
  const insertIntoCalculator = useCallback((latex: string) => {
    selectTool('calculator')
    insertFromWorkspace(latex)
  }, [insertFromWorkspace, selectTool])
  const insertQuickConstant = useQuickConstantInsertion(insertIntoCalculator)

  const closeTools = useCallback(() => {
    setToolsOpen(false)
    // Return focus to the trigger only when it is visible (it is hidden on desktop).
    window.requestAnimationFrame(() => {
      const trigger = toolsButton.current
      if (trigger && trigger.offsetParent !== null && document.activeElement?.closest('.workspace-sidebar')) trigger.focus()
    })
  }, [])

  /** After a menu dialog closes, focus the visible corner icon unless focus already moved on. */
  const focusMenuButton = useCallback(() => window.requestAnimationFrame(() => {
    const active = document.activeElement
    if (!document.querySelector('dialog[open]') && (!active || active === document.body)) menuButton.current?.focus()
  }), [])
  const closeDialog = useCallback(() => {
    setOpenDialog(null)
    focusMenuButton()
  }, [focusMenuButton])

  const toolActions: ToolActions = { returnToCalculator, insertIntoCalculator }

  return (
    <main className="app-shell" data-theme={theme} lang={language}>
      <DeskLayout
        activeView={activeTool}
        toolsControl={<WorkspaceToolsButton ref={toolsButton} activeTool={activeTool} open={toolsOpen} onToggle={() => setToolsOpen(current => !current)} />}
        cornerControl={<AppMenuButton ref={menuButton} open={openDialog === 'menu'} onClick={() => setOpenDialog('menu')} />}
        navigation={<WorkspaceTabs activeTool={activeTool} onSelect={selectTool} open={toolsOpen} onClose={closeTools} />}
        navigationOpen={toolsOpen}
        onNavigationClose={closeTools}
        aside={<CalculatorGuide />}
      >
        {WORKSPACE_TOOLS.map(({ id }) => (
          <section
            key={id}
            id={`tool-panel-${id}`}
            className={id === 'calculator' ? 'tool-panel tool-panel--calculator' : 'tool-panel'}
            role="tabpanel"
            aria-labelledby={`tool-tab-${id}`}
            tabIndex={0}
            hidden={activeTool !== id}
          >
            {id === 'calculator' ? (
              <div className="calculator-view">
                <CalculatorIntro />
                <div className="calculator-main-grid">
                  <CalculatorShell />
                </div>
              </div>
            ) : loadedTools.has(id) && (
              <Suspense fallback={<ToolLoadingSkeleton />}>
                {LAZY_TOOLS[id](toolActions)}
              </Suspense>
            )}
          </section>
        ))}
      </DeskLayout>

      <AppMenu
        open={openDialog === 'menu'}
        onClose={closeDialog}
        theme={theme}
        onToggleTheme={toggleTheme}
        historyCount={history.length}
        historyDisabled={state.off}
        onOpenHistory={() => setOpenDialog('history')}
        onOpenConstants={() => setOpenDialog('constants')}
        onOpenAbout={() => setOpenDialog('about')}
        onReturnFocus={focusMenuButton}
      />
      <HistoryPanel open={openDialog === 'history'} onClose={closeDialog} onRecall={returnToCalculator} />
      <QuickAccessDrawer open={openDialog === 'constants'} onClose={closeDialog} onInsert={insertQuickConstant} />
      <AboutDialog open={openDialog === 'about'} onClose={closeDialog} />
    </main>
  )
}
