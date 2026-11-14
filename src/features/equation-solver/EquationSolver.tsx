import { formatDisplayNumber } from '../../engine/formatResult'
import { useState } from 'react'
import { localize } from '../../i18n/locale'
import ToolFrame from '../shared/ToolFrame'
import { solveEquation } from './solveEquation'
import type { EquationKind, EquationSolution } from './solveEquation'

interface Coefficients {
  a: string
  b: string
  c: string
}

const INITIAL: Coefficients = { a: '1', b: '-3', c: '2' }

function previewEquation(kind: EquationKind, values: Coefficients) {
  return kind === 'linear'
    ? `${values.a || 'a'}x ${Number(values.b) < 0 ? '−' : '+'} ${values.b ? Math.abs(Number(values.b)) : 'b'} = 0`
    : `${values.a || 'a'}x² ${Number(values.b) < 0 ? '−' : '+'} ${values.b ? Math.abs(Number(values.b)) : 'b'}x ${Number(values.c) < 0 ? '−' : '+'} ${values.c ? Math.abs(Number(values.c)) : 'c'} = 0`
}

export default function EquationSolver({ onReturn }: { onReturn: () => void }) {
  const [kind, setKind] = useState<EquationKind>('quadratic')
  const [coefficients, setCoefficients] = useState<Coefficients>(INITIAL)
  const [solution, setSolution] = useState<EquationSolution | null>(null)
  const [error, setError] = useState('')

  function updateCoefficient(name: keyof Coefficients, value: string) {
    setCoefficients(current => ({ ...current, [name]: value }))
    setSolution(null)
    setError('')
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = solveEquation(kind, coefficients.a, coefficients.b, coefficients.c)
    setSolution(next.status === 'invalid' ? null : next)
    setError(next.status === 'invalid' ? next.message ?? 'أدخل معاملات رقمية صالحة' : '')
  }

  return (
    <ToolFrame kind="equation-solver" onReturn={onReturn}>
      <div className="equation-workbench">
        <form className="tool-card equation-input-card" onSubmit={submit}>
          <div className="tool-card-heading">
            <span className="tool-card-step">01</span>
            <div><h2>{localize('أدخل المعاملات')}</h2><p>{localize('اكتب الأعداد العشرية أو الصيغة العلمية مثل 1.2e-3.')}</p></div>
          </div>

          <div className="tool-segmented" role="group" aria-label={localize('نوع المعادلة')}>
            <button type="button" aria-pressed={kind === 'linear'} onClick={() => { setKind('linear'); setSolution(null); setError('') }}>
              {localize('خطية')}
            </button>
            <button type="button" aria-pressed={kind === 'quadratic'} onClick={() => { setKind('quadratic'); setSolution(null); setError('') }}>
              {localize('تربيعية')}
            </button>
          </div>

          <div className="equation-standard" dir="ltr" aria-live="polite">
            <span>{localize('الصيغة القياسية')}</span>
            <strong>{previewEquation(kind, coefficients)}</strong>
          </div>

          <div className="coefficient-fields">
            <label className="tool-field">
              <span>{localize(kind === 'linear' ? 'معامل x (a)' : 'معامل x² (a)')}</span>
              <input
                aria-label={localize(kind === 'linear' ? 'معامل x (a)' : 'معامل x² (a)')}
                inputMode="decimal"
                autoComplete="off"
                value={coefficients.a}
                onChange={event => updateCoefficient('a', event.currentTarget.value)}
              />
            </label>
            <label className="tool-field">
              <span>{localize(kind === 'linear' ? 'الثابت (b)' : 'معامل x (b)')}</span>
              <input
                aria-label={localize(kind === 'linear' ? 'الثابت (b)' : 'معامل x (b)')}
                inputMode="decimal"
                autoComplete="off"
                value={coefficients.b}
                onChange={event => updateCoefficient('b', event.currentTarget.value)}
              />
            </label>
            {kind === 'quadratic' && (
              <label className="tool-field">
                <span>{localize('الثابت (c)')}</span>
                <input
                  aria-label={localize('الثابت (c)')}
                  inputMode="decimal"
                  autoComplete="off"
                  value={coefficients.c}
                  onChange={event => updateCoefficient('c', event.currentTarget.value)}
                />
              </label>
            )}
          </div>

          {error && <p className="tool-error" role="alert">{localize(error)}</p>}
          <button className="tool-primary-button" type="submit">
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
            {localize('حل المعادلة')}
          </button>
        </form>

        <section className="tool-card equation-solution-card" aria-label={localize('نتيجة الحل')} aria-live="polite">
          <div className="tool-card-heading">
            <span className="tool-card-step tool-card-step--accent">02</span>
            <div><h2>{localize('خطوات الحل')}</h2><p>{localize('اتبع التحويلات الرياضية بالترتيب.')}</p></div>
          </div>

          {!solution ? (
            <div className="tool-empty-state">
              <span className="tool-empty-symbol" aria-hidden="true">x = ?</span>
              <p>{localize('أدخل المعاملات ثم اختر حل المعادلة لعرض الخطوات.')}</p>
            </div>
          ) : (
            <div className="equation-solution-content">
              <div className={`solution-summary solution-summary--${solution.status}`}>
                <span>{localize(solution.message ?? 'حل المعادلة')}</span>
                {solution.roots.length > 0 && (
                  <div className="solution-roots" dir="ltr">
                    {solution.roots.map((root, index) => (
                      <span key={`${root}-${index}`}><small>{solution.roots.length > 1 ? `x${index + 1}` : 'x'}</small><strong dir="ltr">{formatDisplayNumber(root)}</strong></span>
                    ))}
                  </div>
                )}
              </div>
              <ol className="equation-steps" aria-label={localize('خطوات الحل')}>
                {solution.steps.map((step, index) => (
                  <li key={`${step.title}-${index}`}>
                    <span className="equation-step-number">{index + 1}</span>
                    <div><h3>{localize(step.title)}</h3><code dir="ltr">{step.formula}</code></div>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
      </div>
    </ToolFrame>
  )
}
