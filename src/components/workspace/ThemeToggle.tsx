import { localize } from '../../i18n/locale'

export type WorkspaceTheme = 'dark' | 'light'

export default function ThemeToggle({ theme, onToggle }: { theme: WorkspaceTheme; onToggle: () => void }) {
  const nextThemeLabel = theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={localize(nextThemeLabel)}
      aria-pressed={theme === 'light'}
      title={localize(nextThemeLabel)}
      onClick={onToggle}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
        {theme === 'dark' ? (
          <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>
        ) : (
          <path d="M20.8 14.1A8.6 8.6 0 0 1 9.9 3.2 8.7 8.7 0 1 0 20.8 14.1Z"/>
        )}
      </svg>
      <span>{localize(theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن')}</span>
    </button>
  )
}
