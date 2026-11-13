import { useMemo, useState } from 'react'
import { localize } from '../../i18n/locale'
import ToolFrame from '../shared/ToolFrame'
import { FORMULAS } from './formulas'
import type { FormulaCategory } from './formulas'

const CATEGORIES: Array<'الكل' | FormulaCategory> = ['الكل', 'الجبر', 'الهندسة', 'الفيزياء', 'التفاضل والتكامل']

export default function FormulasTool({ onReturn, onInsert }: { onReturn: () => void; onInsert: (latex: string) => void }) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<'الكل' | FormulaCategory>('الكل')
  const formulas = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    return FORMULAS.filter(formula => {
      const matchesCategory = category === 'الكل' || formula.category === category
      const searchable = `${formula.name} ${formula.nameEn} ${formula.category} ${formula.description} ${formula.expression} ${formula.keywords}`.toLocaleLowerCase()
      return matchesCategory && (!needle || searchable.includes(needle))
    })
  }, [query, category])

  return (
    <ToolFrame kind="formulas" onReturn={onReturn}>
      <section className="formula-library" aria-label={localize('مكتبة القوانين والصيغ')}>
        <div className="formula-library-toolbar">
          <label className="tool-field formula-search">
            <span>{localize('ابحث في القوانين')}</span>
            <span className="formula-search-input">
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 5 5"/></svg>
              <input type="search" value={query} onChange={event => setQuery(event.currentTarget.value)} placeholder={localize('اكتب اسم قانون أو موضوع')} />
            </span>
          </label>
          <p className="formula-result-count" aria-live="polite">{localize(`عدد النتائج: ${formulas.length}`)}</p>
        </div>

        <div className="formula-category-list" role="group" aria-label={localize('تصفية حسب الموضوع')}>
          {CATEGORIES.map(item => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>
              {localize(item)}
            </button>
          ))}
        </div>

        {formulas.length === 0 ? (
          <div className="tool-empty-state formula-empty-state"><span className="tool-empty-symbol" aria-hidden="true">∅</span><p>{localize('لا توجد قوانين مطابقة لبحثك.')}</p></div>
        ) : (
          <div className="formula-grid">
            {formulas.map(formula => (
              <article className="formula-card" key={formula.id}>
                <div className="formula-card-topline"><span>{localize(formula.category)}</span><span aria-hidden="true">{formula.id.padStart(2, '0')}</span></div>
                <h2>{localize(formula.name)}</h2>
                <p>{localize(formula.description)}</p>
                <code dir="ltr">{formula.expression}</code>
                <button type="button" className="constant-insert-button formula-insert-button" aria-label={`${localize('إدراج صيغة')} ${localize(formula.name)}`} onClick={() => onInsert(formula.latex)}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
                  {localize('إدراج في الحاسبة')}
                </button>
              </article>
            ))}
          </div>
        )}
      </section>
    </ToolFrame>
  )
}
