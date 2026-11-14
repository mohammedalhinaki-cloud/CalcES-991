import type { ReactNode } from 'react'
import { localize } from '../i18n/locale'
import { WORKSPACE_TOOLS_MENU_ID } from '../components/workspace/WorkspaceTabs'

interface DeskLayoutProps {
  activeView: string
  navigation: ReactNode
  /** Phones and tablets show the navigation as a drawer; desktop keeps it as a permanent rail. */
  navigationOpen?: boolean
  onNavigationClose?: () => void
  aside?: ReactNode
  children: ReactNode
}

/**
 * Mobile-first desk. On phones the stage owns the entire area below the header so the
 * calculator display and keypad get every available pixel; tool navigation is a drawer.
 * From 1180px the desk grows into a three-zone layout: rail, stage and contextual guide.
 */
export default function DeskLayout({ activeView, navigation, navigationOpen = false, onNavigationClose, aside, children }: DeskLayoutProps) {
  return (
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
  )
}
