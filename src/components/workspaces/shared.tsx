import { localize } from '../../i18n/locale'
import { useEffect, useRef } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
export function useWorkspaceSubmit(active:boolean,submit:()=>void){
 const {registerSubmit,linearScreen}=useCalculator();const latest=useRef(submit);latest.current=submit
 useEffect(()=>{if(active&&!linearScreen)return registerSubmit(()=>latest.current())},[active,registerSubmit,linearScreen])
}
export function Choices({value,choices,onChange}:{value:string;choices:Array<[string,string]>;onChange:(value:string)=>void}){
 return <div className="mb-3 flex flex-wrap gap-2">{localize(choices.map(([id,label])=><button key={id} type="button" aria-pressed={value===id} onClick={()=>onChange(id)} className="min-h-11 rounded border border-white/25 px-3 py-2 text-xs aria-pressed:border-amber-300 aria-pressed:bg-amber-400/10">{localize(label)}</button>))}</div>
}
export function ComputeButton({onClick}:{onClick:()=>void}){
 const {advanced,state}=useCalculator()
 return <div className="mt-3 flex flex-wrap gap-2"><button type="button" disabled={state.off} onClick={onClick} className="min-h-11 rounded bg-[#b66b31] px-4 py-2 font-semibold disabled:opacity-40">{localize("احسب")}</button>{localize(advanced.state.status==='running'&&<button type="button" onClick={advanced.cancel} className="min-h-11 rounded border border-white/30 px-4 py-2">{localize("إلغاء الحساب")}</button>)}</div>
}
