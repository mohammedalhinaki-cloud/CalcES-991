import { useCallback, useLayoutEffect, useState } from 'react'

export type WorkspaceTheme = 'dark' | 'light'

const THEME_STORAGE_KEY = 'calces_theme'
const THEME_COLORS: Record<WorkspaceTheme, string> = { dark: '#0b1020', light: '#f3f6fb' }

function readTheme(): WorkspaceTheme {
  try {
    return window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

/** Persisted dark/light theme, mirrored on <html data-theme> and the browser theme-color. */
export function useWorkspaceTheme() {
  const [theme, setTheme] = useState<WorkspaceTheme>(readTheme)

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme])
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // The current session still follows the selected theme when storage is unavailable.
    }
  }, [theme])

  const toggleTheme = useCallback(() => setTheme(current => (current === 'dark' ? 'light' : 'dark')), [])
  return { theme, toggleTheme }
}
