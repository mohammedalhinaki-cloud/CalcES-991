import { useEffect, useMemo, useRef, useState } from 'react'
import { getDirection, localize } from '../../i18n/locale'
import { SCIENTIFIC_CONSTANTS } from '../../features/unit-converter/conversions'

export default function QuickAccessDrawer({ open, onClose, onInsert }: { open: boolean; onClose: () => void; onInsert: (latex: string, value: string) => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [query, setQuery] = useState('')
  const matches = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return SCIENTIFIC_CONSTANTS
    return SCIENTIFIC_CONSTANTS.filter(constant =>
      `${constant.name} ${constant.nameEn} ${localize(constant.name)} ${constant.symbol} ${constant.value} ${constant.unit}`.toLocaleLowerCase().includes(needle),
    )
  }, [query])

  useEffect(() => {
    if (open && !dialog.current?.open) {
      setQuery('')
      dialog.current?.showModal()
    }
    if (!open && dialog.current?.open) dialog.current.close()
  }, [open])

  return (
    <dialog ref={dialog} onCancel={onClose} aria-labelledby="quick-access-title" className="history-dialog quick-access-dialog" dir={getDirection()}>
      <header className="quick-access-header">
        <div><span className="quick-access-eyebrow">{localize('مكتبة سريعة')}</span><h2 id="quick-access-title">{localize('الثوابت العلمية')}</h2></div>
        <button type="button" className="utility-button" onClick={onClose}>{localize('إغلاق')}</button>
      </header>
      <p className="quick-access-intro">{localize('ابحث عن ثابت علمي وأدرج قيمته العددية في مدخل الحاسبة.')}</p>
      <label className="tool-field quick-access-search"><span>{localize('بحث في الثوابت')}</span><input type="search" value={query} onChange={event => setQuery(event.currentTarget.value)} placeholder={localize('الاسم أو الرمز أو الوحدة')} /></label>
      <div className="quick-access-list" aria-live="polite">
        {matches.length === 0 ? <p className="quick-access-empty">{localize('لا توجد ثوابت مطابقة.')}</p> : matches.map(constant => (
          <article className="quick-access-item" key={constant.id}>
            <span className="constant-symbol" dir="ltr">{constant.symbol}</span>
            <div className="quick-access-item-copy"><h3>{localize(constant.name)}</h3><p dir="ltr">{constant.value} <span>{constant.unit}</span></p></div>
            <button type="button" className="constant-insert-button" aria-label={localize(`إدراج ثابت ${constant.name}`)} onClick={() => { onClose(); onInsert(constant.latex, constant.value) }}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
              {localize('إدراج')}
            </button>
          </article>
        ))}
      </div>
    </dialog>
  )
}
