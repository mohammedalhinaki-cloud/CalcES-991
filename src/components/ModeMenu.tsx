import { localize, getDirection } from '../i18n/locale'
import { useEffect, useRef } from 'react'
import { useCalculator } from '../state/CalculatorProvider'
import type { CalculatorMode, AngleUnit } from '../state/types'
const MODES:Array<[CalculatorMode,string]>=[['COMP','حساب عام'],['CMPLX','أعداد مركبة'],['STAT','إحصاء'],['MATRIX','مصفوفات'],['EQUATION','معادلات'],['BASE-N','أنظمة عددية']]
export default function ModeMenu() {
  const {state,dispatch,setMode}=useCalculator()
  const dialog=useRef<HTMLDialogElement>(null)
  useEffect(()=>{
    const element=dialog.current
    if(state.menu&&!element?.open)element?.showModal()
    if(!state.menu&&element?.open)element.close()
  },[state.menu])
  return (
    <dialog ref={dialog} aria-labelledby="mode-menu-title" onCancel={()=>dispatch({type:'CLOSE_MENU'})} className="m-auto w-[min(92vw,380px)] rounded-2xl border border-white/20 bg-[#2a2d32] p-5 text-gray-100 backdrop:bg-black/65" dir={getDirection()}>
      <h2 id="mode-menu-title" className="mb-3 text-lg">{localize(state.menu==='setup'?'SETUP · وحدة الزوايا':'MODE · اختر الوضع')}</h2>
      <div className="grid grid-cols-2 gap-2">
        {localize(state.menu==='setup'?(['DEG','RAD','GRA'] as AngleUnit[]).map(angle=><button key={angle} type="button" onClick={()=>dispatch({type:'SET_ANGLE',angle})} aria-pressed={state.angle===angle} className="rounded border border-white/20 p-3 aria-pressed:border-amber-300">{localize(angle)}</button>):MODES.map(([mode,label])=><button key={mode} type="button" onClick={()=>setMode(mode)} aria-pressed={state.mode===mode} className="rounded border border-white/20 p-3 text-start aria-pressed:border-amber-300"><b className="block" dir="ltr">{localize(mode)}</b><span className="text-xs">{localize(label)}</span></button>))}
      </div>
      <p className="mt-3 text-xs leading-6 text-gray-300">{localize("تبديل الوضع يغيّر دلالات الأزرار ويحفظ المعادلة وموضع التحرير. الحسابات المتقدمة تعمل في مساحة الوضع المختار.")}</p>
      <button type="button" onClick={()=>dispatch({type:'CLOSE_MENU'})} className="mt-4 rounded bg-[#b66b31] px-4 py-2">{localize("إغلاق")}</button>
    </dialog>
  )
}
