import { useEffect, useRef } from 'react'
import { useCalculator } from '../state/CalculatorProvider'

export default function HistoryPanel({open,onClose}:{open:boolean;onClose:()=>void}){
 const {history,recallHistory,clearHistory}=useCalculator()
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{
  if(open&&!dialog.current?.open)dialog.current?.showModal()
  if(!open&&dialog.current?.open)dialog.current.close()
 },[open])
 return <dialog ref={dialog} onCancel={onClose} aria-labelledby="history-title" className="history-dialog" dir="rtl">
  <header className="flex items-center justify-between gap-3"><h2 id="history-title" className="text-lg font-semibold">سجل الحسابات</h2><button type="button" className="utility-button" onClick={onClose}>إغلاق</button></header>
  <p className="my-3 text-xs leading-6 text-gray-300">آخر 50 حسابًا ناجحًا في هذه الجلسة. استدعاء الحساب يعيد مدخلاته ووضعه وإعداداته، بما فيها قيمة Ans المستخدمة.</p>
  {history.length===0?<p className="py-8 text-center text-gray-300">السجل فارغ</p>:<><ol className="space-y-3">{history.map(entry=><li key={entry.id}>
   <button type="button" aria-label={`استدعاء ${entry.title}`} className="history-entry" onClick={()=>{recallHistory(entry);onClose()}}>
    <span className="flex justify-between gap-2 text-xs text-[#c1d3b8]"><span>{entry.snapshot.mode}</span><span>{entry.snapshot.angle} · {entry.snapshot.base===10?'DEC':`BASE ${entry.snapshot.base}`}</span></span>
    <span className="mt-2 block overflow-x-auto whitespace-nowrap font-mono text-sm" dir="ltr">{entry.request?entry.title:entry.snapshot.latex}</span>
    <span className="mt-2 block break-words text-sm [overflow-wrap:anywhere]" dir="ltr">{entry.result?entry.result.lines.map(line=>`${line.label}: ${line.value}`).join(' · '):`= ${entry.title}`}</span>
   </button>
  </li>)}</ol><button type="button" className="utility-button mt-4 w-full text-red-200" onClick={clearHistory}>مسح السجل</button></>}
 </dialog>
}
