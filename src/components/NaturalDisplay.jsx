import { useEffect, useRef } from 'react'
import ReactKatex from 'react-katex'
import { toNaturalLatex } from '../naturalDisplay.js'

// react-katex ships CommonJS; default import works in Node and Vite.
const { InlineMath } = ReactKatex

export function MathContent({ value, preview = false }) {
  const latex = toNaturalLatex(value, { preview })
  if (!latex) return <span className="font-mono">{value}</span>
  return <InlineMath math={latex} renderError={() => <span className="font-mono">{value}</span>} />
}

export default function NaturalDisplay({ expression, cursor, result }) {
  const inputViewport = useRef(null)
  const resultViewport = useRef(null)
  const cursorMarker = useRef(null)
  const editingMiddle = cursor < expression.length
  useEffect(() => {
    // Scroll inside the LCD, without moving the page or losing keypad focus.
    if (inputViewport.current && !editingMiddle) inputViewport.current.scrollLeft = inputViewport.current.scrollWidth
    if (editingMiddle) cursorMarker.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [expression, cursor, editingMiddle])
  useEffect(() => {
    if (resultViewport.current) resultViewport.current.scrollLeft = resultViewport.current.scrollWidth
  }, [result])
  const caret = <span ref={cursorMarker} aria-hidden="true" className="cursor-blink ml-0.5 inline-block h-7 w-[2px] shrink-0 bg-black/65" />
  return (
    <>
      <div ref={inputViewport} className="lcd-math flex min-h-20 items-center gap-1 overflow-x-auto px-0.5 py-3 text-xl" aria-label={`الإدخال: ${expression || 'فارغ'}`}>
        <span className="shrink-0" aria-hidden="true"><MathContent value={expression} preview /></span>
        {!editingMiddle && caret}
      </div>
      {/* Source editing preserves exact cursor positions inside nested fractions and powers. */}
      {editingMiddle && (
        <div className="flex items-center overflow-x-auto whitespace-pre py-1 font-mono text-sm" aria-label="تحرير الإدخال عند المؤشر">
          {expression.slice(0, cursor)}{caret}{expression.slice(cursor)}
        </div>
      )}
      <div ref={resultViewport} className="lcd-math overflow-x-auto px-0.5 py-2 text-right text-xl" aria-live="polite" aria-atomic="true" aria-label={`النتيجة: ${result}`}>
        <span className="inline-block min-w-full whitespace-nowrap"><MathContent value={result} /></span>
      </div>
    </>
  )
}
