import { localize } from '../../i18n/locale'
import { useCallback, useEffect, useRef } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import type { EditorHandle } from '../../state/CalculatorProvider'
// Plain numeric/data cells; the expression editor remains MathLive. No native input widgets.
export default function DataEntry({label,value,onChange,multiline=false,textKeyboard=false}:{label:string;value:string;onChange:(value:string)=>void;multiline?:boolean;textKeyboard?:boolean}){
 const {state,registerDataTarget,advanced,dispatch}=useCalculator()
 const host=useRef<HTMLDivElement>(null),unregister=useRef<(()=>void)|undefined>(undefined)
 const changeRef=useRef(onChange);changeRef.current=onChange
 const cancelRef=useRef(advanced.cancel);cancelRef.current=advanced.cancel
 const changed=useCallback(()=>{cancelRef.current();if(host.current)changeRef.current(host.current.innerText)},[])
 useEffect(()=>{if(host.current&&host.current.innerText!==value&&document.activeElement!==host.current)host.current.textContent=value},[value])
 useEffect(()=>()=>unregister.current?.(),[])
 function focusRange(){
  const element=host.current!,selection=window.getSelection()!
  element.focus()
  if(!selection.rangeCount||!element.contains(selection.anchorNode)||!element.contains(selection.focusNode)){
   const range=document.createRange();range.selectNodeContents(element);range.collapse(false);selection.removeAllRanges();selection.addRange(range)
  }
  return selection
 }
 const handle:EditorHandle={
  insert:latex=>{
   const text=latex==='\\times10^{#?}'?'e':latex
   if(!/^[0-9A-Fa-f+\-.\s,;]+$/.test(text)){dispatch({type:'NOTICE',notice:'هذا الحقل للأعداد والبيانات؛ استخدم المحرر الرئيسي للدوال'});return}
   const selection=focusRange(),range=selection.getRangeAt(0)
   range.deleteContents();const node=document.createTextNode(text);range.insertNode(node);range.setStartAfter(node);range.collapse(true);selection.removeAllRanges();selection.addRange(range);changed()
  },
  deleteBackward:()=>{const selection=focusRange();if(selection.isCollapsed)selection.modify('extend','backward','character');const range=selection.getRangeAt(0);if(host.current!.contains(range.startContainer)&&host.current!.contains(range.endContainer)){range.deleteContents();changed()}},
  move:direction=>{const selection=focusRange();selection.modify('move',direction==='Left'||direction==='Up'?'backward':'forward',direction==='Up'||direction==='Down'?'line':'character')},
  clear:()=>{host.current!.textContent='';changed()},focus:()=>host.current?.focus(),
 }
 return <label className="block min-w-0 text-xs"><span className="mb-1 block">{localize(label)}</span><div ref={host} role="textbox" aria-label={localize(label)} aria-multiline={multiline} contentEditable={!state.off} suppressContentEditableWarning inputMode={multiline||textKeyboard?'text':'decimal'} spellCheck={false} onInput={changed} onFocus={()=>{unregister.current?.();unregister.current=registerDataTarget(handle)}} dir="ltr" className={`min-h-11 min-w-0 overflow-x-auto whitespace-pre-wrap break-words rounded border border-white/25 bg-black/15 p-2 text-base text-gray-100 outline-none focus:border-amber-300 ${multiline?'min-h-28':''}`} /></label>
}
