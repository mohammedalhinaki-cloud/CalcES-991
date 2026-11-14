import type { ReactNode } from 'react'
import { localize } from '../i18n/locale'

interface DeskLayoutProps {
  activeView: string
  navigation: ReactNode
  aside?: ReactNode
  children: ReactNode
}

/** Responsive, three-zone desk for the calculator, tool navigation, and contextual help. */
export default function DeskLayout({ activeView, navigation, aside, children }: DeskLayoutProps) {
  return (
    <div className="desk-layout" data-view={activeView}>
      <aside className="workspace-sidebar" aria-label={localize('التنقل بين الأدوات')}>
        {navigation}
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
