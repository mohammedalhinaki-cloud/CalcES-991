import { useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import { localize, getDirection } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import { getNaturalResultLatex } from '../../engine/naturalResult'
import { evaluateScientific } from '../../engine/evaluate'
import type { CalculationPreview } from '../../editor/previewCalculation'

export default function ResultDisplay({ result }: { result: CalculationPreview }) {
  const { state, tool } = useCalculator()
  const mathMarkup = useMemo(() => {
    if (result.status !== 'success' || state.format !== 'fraction' || state.displayMode !== 'natural' || state.notation !== 'norm') return null
    let latex: string | null = null
    if (state.mode === 'COMP' && tool === null) {
      try {
        const options = { angle: state.angle, variables: state.variables, answer: state.answer }
        const value = state.committedValue ?? evaluateScientific(state.latex, options).toString()
        latex = getNaturalResultLatex(state.latex, value, options)
      } catch { /* Unsupported exact forms retain their trustworthy numeric result. */ }
    }
    if (!latex && /^-?\d+\/\d+$/.test(result.text)) {
      const [numerator, denominator] = result.text.split('/')
      latex = `\\frac{${numerator}}{${denominator}}`
    }
    if (!latex) return null
    return katex.renderToString(latex, { throwOnError: false, strict: 'ignore', output: 'html', trust: false })
  }, [result, state.format, state.displayMode, state.notation, state.mode, state.latex, state.committedValue, state.angle, state.variables, state.answer, tool])
  return <div className="lcd-result">
    <output aria-label={localize('النتيجة')} aria-live="polite" aria-atomic="true" data-status={result.status}
      data-value={result.text} data-natural={Boolean(mathMarkup)} dir={result.status === 'success' ? 'ltr' : getDirection()}>
      {mathMarkup ? <><span className="sr-only">{result.text}</span><span className="result-math" aria-hidden="true" dangerouslySetInnerHTML={{ __html: mathMarkup }} /></> : localize(result.text)}
    </output>
  </div>
}
