import type { ReactNode } from 'react'
import { localize } from '../i18n/locale'
import { WORKSPACE_TOOLS_MENU_ID } from '../components/workspace/WorkspaceTabs'

interface DeskLayoutProps {
  activeView: string
  /** Workspace switcher placed beside the logo (hidden on desktop, where the rail is visible). */
  toolsControl: ReactNode
  /** The single corner control (settings menu trigger). */
  cornerControl: ReactNode
  navigation: ReactNode
  /** Phones and tablets show the navigation as a drawer; desktop keeps it as a permanent rail. */
  navigationOpen?: boolean
  onNavigationClose?: () => void
  aside?: ReactNode
  children: ReactNode
}

/**
 * Mobile-first frame: an ultra-minimal header (logo + Tools on one side, one corner icon on
 * the other) above a stage that gives the calculator every remaining pixel. Tool navigation
 * is a drawer below 1180px; from 1180px the desk becomes rail · stage · contextual guide.
 */
export default function DeskLayout({ activeView, toolsControl, cornerControl, navigation, navigationOpen = false, onNavigationClose, aside, children }: DeskLayoutProps) {
  return (
    <>
      {/* Empty slot: Android places its native adaptive banner here; it collapses to 0px on the web. */}
      <div className="ad-reservation" aria-hidden="true" />

      <header className="workspace-header">
        <div className="workspace-header-start">
          <div className="workspace-brand">
            <span className="workspace-brand-mark" aria-hidden="true"><span>CE</span><small>991</small></span>
            <span className="workspace-brand-title"><strong>CalcES</strong><span>991</span></span>
          </div>
          {toolsControl}
        </div>
        {cornerControl}
      </header>

      <div className="desk-layout" data-view={activeView} data-nav-open={navigationOpen}>
        <aside id={WORKSPACE_TOOLS_MENU_ID} className="workspace-sidebar" data-open={navigationOpen} aria-label={localize('التنقل بين الأدوات')}>
          <div className="workspace-sidebar-backdrop" aria-hidden="true" onClick={onNavigationClose} />
          <div className="workspace-sidebar-sheet">
            {navigation}
          </div>
        </aside>
        <section className="workspace-stage" aria-label={localize('مساحة الأدوات')}>
          {children}
        </section>
        {aside && (
          <aside className="workspace-aside" aria-label={localize('دليل سريع للحاسبة')}>
            {aside}
          </aside>
        )}
      </div>
    </>
  )
}
