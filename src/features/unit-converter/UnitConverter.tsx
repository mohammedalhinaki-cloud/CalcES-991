import { useMemo, useState } from 'react'
import { localize } from '../../i18n/locale'
import ToolFrame from '../shared/ToolFrame'
import { convertUnitValue, formatConvertedValue, SCIENTIFIC_CONSTANTS, UNIT_GROUPS } from './conversions'
import type { UnitCategory } from './conversions'

export default function UnitConverter({
  onReturn,
  onInsertConstant,
}: {
  onReturn: () => void
  onInsertConstant: (latex: string) => void
}) {
  const [category, setCategory] = useState<UnitCategory>('length')
  const [fromId, setFromId] = useState('km')
  const [toId, setToId] = useState('m')
  const [value, setValue] = useState('1')
  const group = UNIT_GROUPS.find(item => item.id === category) ?? UNIT_GROUPS[0]!
  const from = group.units.find(unit => unit.id === fromId) ?? group.units[0]!
  const to = group.units.find(unit => unit.id === toId) ?? group.units[1] ?? group.units[0]!
  const conversion = useMemo(() => {
    try {
      return { result: formatConvertedValue(convertUnitValue(value, category, from.id, to.id)), error: '' }
    } catch (error) {
      return { result: '', error: error instanceof Error ? error.message : 'خطأ في التحويل' }
    }
  }, [value, category, from.id, to.id])

  function changeCategory(nextCategory: UnitCategory) {
    const next = UNIT_GROUPS.find(item => item.id === nextCategory) ?? UNIT_GROUPS[0]!
    setCategory(nextCategory)
    setFromId(next.units[0]!.id)
    setToId(next.units[1]?.id ?? next.units[0]!.id)
  }

  return (
    <ToolFrame kind="unit-converter" onReturn={onReturn}>
      <div className="unit-converter-layout">
        <section className="tool-card converter-card" aria-label={localize('محول الوحدات')}>
          <div className="tool-card-heading">
            <span className="tool-card-step">01</span>
            <div><h2>{localize('تحويل سريع')}</h2><p>{localize('اختر نوع الكمية والوحدتين، وستظهر النتيجة فورًا.')}</p></div>
          </div>

          <label className="tool-field converter-category">
            <span>{localize('نوع الكمية')}</span>
            <select aria-label={localize('نوع الكمية')} value={category} onChange={event => changeCategory(event.currentTarget.value as UnitCategory)}>
              {UNIT_GROUPS.map(item => <option key={item.id} value={item.id}>{localize(item.name)}</option>)}
            </select>
          </label>

          <div className="converter-input-row">
            <label className="tool-field">
              <span>{localize('القيمة')}</span>
              <input aria-label={localize('القيمة')} inputMode="decimal" autoComplete="off" value={value} onChange={event => setValue(event.currentTarget.value)} />
            </label>
            <label className="tool-field">
              <span>{localize('من وحدة')}</span>
              <select aria-label={localize('وحدة المصدر')} value={from.id} onChange={event => setFromId(event.currentTarget.value)}>
                {group.units.map(unit => <option key={unit.id} value={unit.id}>{localize(unit.name)} ({unit.symbol})</option>)}
              </select>
            </label>
            <button
              type="button"
              className="converter-swap"
              aria-label={localize('تبديل الوحدتين')}
              title={localize('تبديل الوحدتين')}
              onClick={() => { setFromId(to.id); setToId(from.id) }}
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8h14m-5-5 5 5-5 5M19 16H5m5-5-5 5 5 5"/></svg>
            </button>
            <label className="tool-field">
              <span>{localize('إلى وحدة')}</span>
              <select aria-label={localize('وحدة الهدف')} value={to.id} onChange={event => setToId(event.currentTarget.value)}>
                {group.units.map(unit => <option key={unit.id} value={unit.id}>{localize(unit.name)} ({unit.symbol})</option>)}
              </select>
            </label>
          </div>

          <div className={`conversion-result${conversion.error ? ' conversion-result--error' : ''}`} aria-live="polite">
            <span>{localize(conversion.error ? 'تحقق من القيمة والوحدات' : 'النتيجة')}</span>
            {conversion.error ? (
              <p role="alert">{localize(conversion.error)}</p>
            ) : (
              <strong dir="ltr">{value || '0'} {from.symbol} <span>=</span> {conversion.result} {to.symbol}</strong>
            )}
          </div>
        </section>

        <section className="tool-card constants-card" aria-label={localize('الثوابت العلمية')}>
          <div className="tool-card-heading">
            <span className="tool-card-step tool-card-step--accent">02</span>
            <div><h2>{localize('ثوابت علمية')}</h2><p>{localize('القيم القياسية بوحدات النظام الدولي؛ أدرج القيمة العددية في الحاسبة.')}</p></div>
          </div>
          <div className="constant-list">
            {SCIENTIFIC_CONSTANTS.map(constant => (
              <article className="constant-card" key={constant.id}>
                <div className="constant-card-copy">
                  <span className="constant-symbol" dir="ltr">{constant.symbol}</span>
                  <div><h3>{localize(constant.name)}</h3><p dir="ltr">{constant.value} <span>{constant.unit}</span></p></div>
                </div>
                <button
                  type="button"
                  className="constant-insert-button"
                  data-constant={constant.id}
                  aria-label={localize(`إدراج ثابت ${constant.name}`)}
                  onClick={() => onInsertConstant(constant.latex)}
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14m-7-7h14"/></svg>
                  {localize('إدراج')}
                </button>
              </article>
            ))}
          </div>
        </section>
      </div>
    </ToolFrame>
  )
}
