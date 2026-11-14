import { localize, getDirection } from '../i18n/locale'
import { useEffect, useRef } from 'react'
import { useCalculator } from '../state/CalculatorProvider'
import HistoryMath from './HistoryMath'
import { historyExpression, matrixLatex, resultLatex } from '../state/historyPresentation'
import { formatDisplayNumber } from '../engine/formatResult'

export default function HistoryPanel({open,onClose,onRecall}:{open:boolean;onClose:()=>void;onRecall?:()=>void}){
 const {history,recallHistory,clearHistory}=useCalculator()
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{
  if(open&&!dialog.current?.open)dialog.current?.showModal()
  if(!open&&dialog.current?.open)dialog.current.close()
 },[open])
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="history-title" className="history-dialog" dir={getDirection()}>
  <header className="flex items-center justify-between gap-3"><h2 id="history-title" className="text-lg font-semibold">{localize("سجل الحسابات")}</h2><button type="button" className="utility-button" onClick={onClose}>{localize("إغلاق")}</button></header>
  <p className="my-3 text-xs leading-6 text-gray-300">{localize("آخر 50 حسابًا ناجحًا في هذه الجلسة. استدعاء الحساب يعيد مدخلاته ووضعه وإعداداته، بما فيها قيمة Ans المستخدمة.")}</p>
  {localize(history.length===0?<p className="py-8 text-center text-gray-300">{localize("السجل فارغ")}</p>:<><ol className="space-y-3">{localize(history.map(entry=>{
   const expression=historyExpression(entry)
   const scalar=resultLatex(entry.title)
   return <li key={entry.id}>
   <button type="button" aria-label={localize(`استدعاء ${entry.title}`)} className="history-entry" onClick={()=>{recallHistory(entry);onRecall?.();onClose()}}>
    <span className="flex justify-between gap-2 text-xs text-[#c1d3b8]"><span>{localize(entry.snapshot.mode)}</span><span>{localize(entry.snapshot.angle)} · {localize(entry.snapshot.base===10?'DEC':`BASE ${entry.snapshot.base}`)}</span></span>
    <span className="mt-2 block text-sm">{entry.request&&localize(formatDisplayNumber(entry.title))}</span>
    {expression&&<HistoryMath latex={expression} />}
    {entry.result ? <span className="history-results">{entry.result.lines.map((line,index)=>{
     const latex=resultLatex(line.value)
     return <span className="history-result-line" key={index}><span>{localize(line.label)}:</span>{latex ? <HistoryMath latex={latex}/> : <span dir="auto">{localize(formatDisplayNumber(line.value))}</span>}</span>
    })}{entry.result.matrix&&<HistoryMath latex={matrixLatex(entry.result.matrix)}/>}</span>
    : <span className="history-result-line" dir="ltr"><span>=</span>{scalar ? <HistoryMath latex={scalar}/> : <span>{formatDisplayNumber(entry.title)}</span>}</span>}
   </button>
  </li>}))}</ol><button type="button" className="utility-button mt-4 w-full text-red-200" onClick={clearHistory}>{localize("مسح السجل")}</button></>)}
 </dialog>
}
