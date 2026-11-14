import { localize, getDirection } from '../../i18n/locale'
import type { CalculationPreview } from '../../editor/previewCalculation'
import { formatDisplayNumber } from '../../engine/formatResult'

/** Compact result line anchored to the bottom-right of the LCD; the input stays the focus. */
export default function ResultDisplay({ result }: { result: CalculationPreview }) {
  const text = result.status === 'success' ? formatDisplayNumber(result.text) : result.text
  return (
    <div className="lcd-result">
      <p className="sr-only">{localize("النتيجة")}</p>
      <output aria-label={localize("النتيجة")} aria-live="polite" aria-atomic="true" data-status={result.status} className="lcd-result-value" dir={result.status === 'success' ? 'ltr' : getDirection()}>{localize(text)}</output>
    </div>
  )
}
