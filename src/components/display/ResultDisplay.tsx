import { localize, getDirection } from '../../i18n/locale'
import type { CalculationPreview } from '../../editor/previewCalculation'

export default function ResultDisplay({ result }: { result: CalculationPreview }) {
  return (
    <div className="lcd-result">
      <p className="lcd-result-label">{localize("النتيجة")}</p>
      <output aria-label={localize("النتيجة")} aria-live="polite" aria-atomic="true" data-status={result.status} className="lcd-result-value" dir={result.status === 'success' ? 'ltr' : getDirection()}>{localize(result.text)}</output>
    </div>
  )
}
