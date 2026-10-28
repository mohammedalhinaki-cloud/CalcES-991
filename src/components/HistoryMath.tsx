import { memo, useEffect, useState } from 'react'
import 'mathlive/static.css'

// Static typesetting shares MathLive with the editor without creating another
// editable field or changing the live editor's value, focus or selection.
export default memo(function HistoryMath({ latex }: { latex: string }) {
 const [rendered, setRendered] = useState<{ source: string; markup: string; spoken: string }>()
 useEffect(() => {
  let active = true
  void import('mathlive').then(({ convertLatexToMarkup, convertLatexToSpeakableText }) => {
   if (active) setRendered({ source: latex, markup: convertLatexToMarkup(latex), spoken: convertLatexToSpeakableText(latex) })
  }).catch(() => { /* Keep the history and its recall button usable if loading fails. */ })
  return () => { active = false }
 }, [latex])
 const current = rendered?.source === latex ? rendered : undefined
 return <span className="history-math" dir="ltr" role="math" aria-label={current?.spoken ?? '…'}>
  {current ? <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: current.markup }} /> : '…'}
 </span>
})
