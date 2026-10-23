import type { CalculationPreview } from '../../editor/previewCalculation'

export default function ResultDisplay({ result }: { result: CalculationPreview }) {
  return (
    <div className="mt-3 border-t border-black/15 pt-2">
      <p className="mb-1 text-xs">النتيجة</p>
      <output aria-label="النتيجة" aria-live="polite" aria-atomic="true" data-status={result.status} className="block min-h-9 overflow-x-auto whitespace-nowrap py-1 text-right font-mono text-lg" dir={result.status === 'success' ? 'ltr' : 'rtl'}>{result.text}</output>
    </div>
  )
}
