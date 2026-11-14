import { forwardRef, useEffect, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { getDirection, localize } from '../../i18n/locale'

export type WorkspaceToolId = 'calculator' | 'equation-solver' | 'graphing' | 'unit-converter' | 'formulas'

export const WORKSPACE_TOOLS_MENU_ID = 'workspace-tools-menu'

export const WORKSPACE_TOOLS: ReadonlyArray<{
  id: WorkspaceToolId
  label: string
  description: string
  icon: 'calculator' | 'equation' | 'graph' | 'units' | 'formulas'
}> = [
  { id: 'calculator', label: 'الحاسبة', description: 'الحسابات العلمية اليومية', icon: 'calculator' },
  { id: 'equation-solver', label: 'حل المعادلات', description: 'حلول خطية وتربيعية', icon: 'equation' },
  { id: 'graphing', label: 'الرسم البياني', description: 'استكشف شكل الدوال', icon: 'graph' },
  { id: 'unit-converter', label: 'تحويل الوحدات', description: 'الوحدات والثوابت العلمية', icon: 'units' },
  { id: 'formulas', label: 'القوانين والصيغ', description: 'ابحث في صيغ الرياضيات والعلوم', icon: 'formulas' },
]

const TOOL_ICONS = {
  calculator: <><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h2m4 0h2m-8 4h2m4 0h2m-8 3h2m4 0h2"/></>,
  equation: <><path d="M5 6h14M5 12h14M5 18h14"/><circle cx="8" cy="6" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="10" cy="18" r="1.5"/></>,
  graph: <><path d="M4 19V5m0 14h16"/><path d="M6 15c2-8 4-8 6-3s4 6 7-5"/></>,
  units: <><path d="M4 7h16M4 17h16M7 4v6m10 4v6"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/></>,
  formulas: <><path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z"/><path d="M5 16.5a3 3 0 0 1 3-3h11M10 8h5m-5 3h4"/><path d="m15.5 6.5 1.5 1.5-1.5 1.5"/></>,
} as const

function ToolIcon({ name }: { name: (typeof WORKSPACE_TOOLS)[number]['icon'] }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {TOOL_ICONS[name]}
    </svg>
  )
}

/**
 * Compact header trigger that replaces the old row of workspace tabs on phones and tablets.
 * It shows the active tool so users always know where they are without a dedicated tab row.
 */
export const WorkspaceToolsButton = forwardRef<HTMLButtonElement, {
  activeTool: WorkspaceToolId
  open: boolean
  onToggle: () => void
}>(function WorkspaceToolsButton({ activeTool, open, onToggle }, ref) {
  const active = WORKSPACE_TOOLS.find(tool => tool.id === activeTool) ?? WORKSPACE_TOOLS[0]!
  return (
    <button
      ref={ref}
      type="button"
      className="workspace-tools-button"
      aria-label={localize('قائمة الأدوات')}
      aria-haspopup="true"
      aria-expanded={open}
      aria-controls={WORKSPACE_TOOLS_MENU_ID}
      title={localize('قائمة الأدوات')}
      onClick={onToggle}
    >
      <svg className="workspace-tools-grid" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg>
      <span className="workspace-tools-button-label">{localize(active.label)}</span>
      <svg className="workspace-tools-chevron" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4"/></svg>
    </button>
  )
})

/**
 * Workspace switcher. On desktop it renders as a persistent rail; on phones and tablets the same
 * tablist lives in a drawer that the header "Tools" button opens (see `.workspace-sidebar` CSS).
 */
export default function WorkspaceTabs({
  activeTool,
  onSelect,
  open = false,
  onClose,
  footer,
}: {
  activeTool: WorkspaceToolId
  onSelect: (tool: WorkspaceToolId) => void
  open?: boolean
  onClose?: () => void
  footer?: ReactNode
}) {
  const buttons = useRef<Array<HTMLButtonElement | null>>([])

  useEffect(() => {
    if (!open) return
    const activeIndex = Math.max(0, WORKSPACE_TOOLS.findIndex(tool => tool.id === activeTool))
    const frame = window.requestAnimationFrame(() => buttons.current[activeIndex]?.focus())
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      window.cancelAnimationFrame(frame)
      document.removeEventListener('keydown', closeOnEscape)
    }
    // Focus only when the drawer opens, not on every tool change while it is open.
  }, [open])

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const direction = getDirection()
    const forward = event.key === 'ArrowDown' || (direction === 'rtl' ? event.key === 'ArrowLeft' : event.key === 'ArrowRight')
    const backward = event.key === 'ArrowUp' || (direction === 'rtl' ? event.key === 'ArrowRight' : event.key === 'ArrowLeft')
    let nextIndex = index
    if (forward) nextIndex = (index + 1) % WORKSPACE_TOOLS.length
    else if (backward) nextIndex = (index - 1 + WORKSPACE_TOOLS.length) % WORKSPACE_TOOLS.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = WORKSPACE_TOOLS.length - 1
    else return

    event.preventDefault()
    onSelect(WORKSPACE_TOOLS[nextIndex]!.id)
    buttons.current[nextIndex]?.focus()
  }

  return (
    <div className="workspace-tabs">
      <header className="workspace-tabs-header">
        <span className="workspace-tabs-grabber" aria-hidden="true" />
        <div className="workspace-tabs-title">
          <span className="workspace-tabs-eyebrow">CalcES 991</span>
          <h2>{localize('اختر أداة')}</h2>
        </div>
        <button type="button" className="workspace-tabs-close" aria-label={localize('إغلاق قائمة الأدوات')} onClick={onClose}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>
        </button>
      </header>
      <nav className="workspace-navigation" role="tablist" aria-orientation="vertical" aria-label={localize('أدوات CalcES')}>
        {WORKSPACE_TOOLS.map((tool, index) => {
          const selected = activeTool === tool.id
          return (
            <button
              key={tool.id}
              ref={(element) => { buttons.current[index] = element }}
              id={`tool-tab-${tool.id}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`tool-panel-${tool.id}`}
              tabIndex={selected ? 0 : -1}
              className="workspace-tab"
              data-active={selected}
              onClick={() => {
                onSelect(tool.id)
                onClose?.()
              }}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              <span className="workspace-tab-icon"><ToolIcon name={tool.icon} /></span>
              <span className="workspace-tab-copy">
                <span className="workspace-tab-label">{localize(tool.label)}</span>
                <span className="workspace-tab-description">{localize(tool.description)}</span>
              </span>
              <span className="workspace-tab-indicator" aria-hidden="true" />
            </button>
          )
        })}
      </nav>
      {footer}
    </div>
  )
}
