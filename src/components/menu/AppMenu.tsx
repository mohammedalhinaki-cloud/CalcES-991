import { forwardRef, useEffect, useRef } from 'react'
import type { MouseEvent, ReactNode } from 'react'
import { getDirection, getLanguage, localize } from '../../i18n/locale'
import { useLanguage } from '../../i18n/LanguageGate'
import { useAppActions } from '../../hooks/useAppActions'
import { isAndroidApp } from '../../native/platform'

export type WorkspaceTheme = 'dark' | 'light'

const ICONS = {
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></>,
  sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></>,
  moon: <path d="M20.8 14.1A8.6 8.6 0 0 1 9.9 3.2 8.7 8.7 0 1 0 20.8 14.1Z"/>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.2-5.7L3 9"/><path d="M3 4v5h5m4-1v4l3 2"/></>,
  constants: <><path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3Z"/><path d="M5 16.5a3 3 0 0 1 3-3h11M10 8h5m-5 3h4"/></>,
  language: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>,
  share: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
  install: <><path d="M12 3v12m-4-4 4 4 4-4"/><path d="M4 17v3h16v-3"/></>,
  guide: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/></>,
  about: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/></>,
  close: <path d="M6 6l12 12M18 6 6 18"/>,
  chevron: <path d="m9 6 6 6-6 6"/>,
} as const

function MenuIcon({ name }: { name: keyof typeof ICONS }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{ICONS[name]}</svg>
}

/** The single corner icon in the header. */
export const AppMenuButton = forwardRef<HTMLButtonElement, { open: boolean; onClick: () => void }>(function AppMenuButton({ open, onClick }, ref) {
  return (
    <button ref={ref} type="button" className="app-menu-button" aria-label={localize('الإعدادات')} title={localize('الإعدادات')} aria-haspopup="dialog" aria-expanded={open} aria-controls="app-menu" onClick={onClick}>
      <MenuIcon name="settings" />
    </button>
  )
})

function MenuRow({ icon, label, detail, onClick, ariaLabel, disabled, pressed, trailing }: {
  icon: keyof typeof ICONS
  label: string
  detail?: ReactNode
  onClick: () => void
  ariaLabel?: string
  disabled?: boolean
  pressed?: boolean
  trailing?: ReactNode
}) {
  return (
    <button type="button" className="app-menu-item" aria-label={ariaLabel ? localize(ariaLabel) : undefined} aria-pressed={pressed} disabled={disabled} onClick={onClick}>
      <span className="app-menu-item-icon"><MenuIcon name={icon} /></span>
      <span className="app-menu-item-label">{localize(label)}</span>
      {detail !== undefined && <span className="app-menu-item-detail">{detail}</span>}
      {trailing ?? <span className="app-menu-item-chevron"><MenuIcon name="chevron" /></span>}
    </button>
  )
}

/**
 * App-level settings, opened from the header corner icon: appearance, history, constants,
 * language, sharing/installation and About. Rendered as a native modal dialog so it traps
 * focus, closes on Escape and hides the Android banner like every other dialog.
 */
export default function AppMenu({
  open,
  onClose,
  theme,
  onToggleTheme,
  historyCount,
  historyDisabled,
  onOpenHistory,
  onOpenConstants,
  onOpenAbout,
  onReturnFocus,
}: {
  open: boolean
  onClose: () => void
  theme: WorkspaceTheme
  onToggleTheme: () => void
  historyCount: number
  historyDisabled: boolean
  onOpenHistory: () => void
  onOpenConstants: () => void
  onOpenAbout: () => void
  /** Moves focus back to the visible menu trigger once a follow-up dialog closes. */
  onReturnFocus: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const helpDialog = useRef<HTMLDialogElement>(null)
  const { language, changeLanguage } = useLanguage()
  const { share, install, installed, notice, help, setHelp, url } = useAppActions()
  const android = isAndroidApp()

  useEffect(() => {
    const element = dialog.current
    if (open && !element?.open) element?.showModal()
    if (!open && element?.open) element.close()
  }, [open])
  useEffect(() => {
    if (help && !helpDialog.current?.open) helpDialog.current?.showModal()
    if (!help && helpDialog.current?.open) { helpDialog.current.close(); onReturnFocus() }
  }, [help, onReturnFocus])

  // Close the menu first so the follow-up dialog becomes the only modal on screen.
  const then = (action: () => void) => () => { onClose(); action() }
  const closeOnBackdrop = (event: MouseEvent<HTMLDialogElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect()
    if (event.target === event.currentTarget && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) onClose()
  }
  const themeLabel = theme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن'

  return (
    <>
      <dialog id="app-menu" ref={dialog} className="app-menu-dialog" aria-labelledby="app-menu-title" dir={getDirection()} onCancel={event => { event.preventDefault(); onClose() }} onClose={() => { if (open) onClose() }} onClick={closeOnBackdrop}>
        <header className="app-menu-header">
          <span className="app-sheet-grabber" aria-hidden="true" />
          <h2 id="app-menu-title">{localize('الإعدادات')}</h2>
          <button type="button" className="app-menu-close" aria-label={localize('إغلاق الإعدادات')} onClick={onClose}><MenuIcon name="close" /></button>
        </header>

        <div className="app-menu-group">
          <MenuRow icon={theme === 'dark' ? 'moon' : 'sun'} label="المظهر" ariaLabel={themeLabel} pressed={theme === 'light'} onClick={onToggleTheme}
            trailing={<span className="app-menu-switch" data-on={theme === 'light'} aria-hidden="true"><span>{localize(theme === 'dark' ? 'داكن' : 'فاتح')}</span><i /></span>} />
          <MenuRow icon="history" label="سجل الحسابات" ariaLabel={`السجل (${historyCount})`} disabled={historyDisabled} onClick={then(onOpenHistory)}
            detail={historyCount > 0 ? <b className="app-menu-count">{historyCount}</b> : undefined} />
          <MenuRow icon="constants" label="الثوابت العلمية" ariaLabel="الثوابت السريعة" onClick={then(onOpenConstants)} />
        </div>

        <div className="app-menu-group app-menu-language" role="group" aria-labelledby="app-menu-language-label">
          <span className="app-menu-item-icon"><MenuIcon name="language" /></span>
          <span id="app-menu-language-label" className="app-menu-item-label">{language === 'ar' ? 'اللغة' : 'Language'}</span>
          <div className="app-menu-segmented">
            <button type="button" lang="ar" dir="rtl" aria-pressed={language === 'ar'} onClick={() => changeLanguage('ar')}>العربية</button>
            <button type="button" lang="en" aria-pressed={language === 'en'} onClick={() => changeLanguage('en')}>English</button>
          </div>
        </div>

        <div className="app-menu-group">
          <MenuRow icon="share" label="مشاركة" ariaLabel="مشاركة الحاسبة" onClick={then(() => void share())} trailing={<span />} />
          {!android && <MenuRow icon="install" label={installed ? 'مثبت' : 'تثبيت'} ariaLabel={installed ? 'التطبيق مثبت' : 'تثبيت التطبيق'} onClick={then(() => void install())} trailing={<span />} />}
          {!android && (
            <a className="app-menu-item" href={getLanguage() === 'en' ? '/en/' : '/ar/'}>
              <span className="app-menu-item-icon"><MenuIcon name="guide" /></span>
              <span className="app-menu-item-label">{getLanguage() === 'en' ? 'Calculator user guide' : 'دليل استخدام الحاسبة'}</span>
              <span className="app-menu-item-chevron"><MenuIcon name="chevron" /></span>
            </a>
          )}
          <MenuRow icon="about" label="عن التطبيق والخصوصية" ariaLabel={android ? 'الخصوصية والإعلانات' : 'عن التطبيق والخصوصية'} onClick={then(onOpenAbout)} />
        </div>
      </dialog>

      {notice && <p role="status" className="app-toast" dir={getDirection()}>{localize(notice)}</p>}
      <dialog ref={helpDialog} onCancel={() => setHelp(null)} className="history-dialog" aria-labelledby="app-help-title" dir={getDirection()}>
        <h2 id="app-help-title" className="mb-4 text-lg font-semibold">{localize(help === 'share' ? 'مشاركة الحاسبة' : 'تثبيت الحاسبة')}</h2>
        {help === 'share'
          ? <><p className="mb-3 leading-7">{localize('تعذرت المشاركة والنسخ التلقائي. حدد الرابط التالي وانسخه:')}</p><a className="block select-text break-all text-purple-300" dir="ltr" href={url}>{url}</a></>
          : <div className="space-y-3 text-sm leading-7"><p>{localize('إذا لم تظهر نافذة التثبيت تلقائيًا، استخدم قائمة المتصفح:')}</p><p><b>{localize('Android وChrome/Edge:')}</b>{localize(' افتح القائمة ⋮ ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».')}</p><p><b>{localize('iPhone وiPad:')}</b>{localize(' افتح الموقع في Safari، ثم اضغط مشاركة واختر «إضافة إلى الشاشة الرئيسية».')}</p><p><b>{localize('الحاسوب:')}</b>{localize(' استخدم أيقونة التثبيت في شريط العنوان أو خيار التثبيت من قائمة المتصفح، إذا كان يدعمه.')}</p></div>}
        <button type="button" className="utility-button mt-5 w-full" onClick={() => setHelp(null)}>{localize('إغلاق')}</button>
      </dialog>
    </>
  )
}
