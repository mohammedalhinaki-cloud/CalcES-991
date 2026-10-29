import {useLanguage} from '../../i18n/LanguageGate'
import { localize } from '../../i18n/locale'
import { useEffect, useRef, useState } from 'react'
import type { MathfieldElement } from 'mathlive'
import { loadMathLive } from '../../editor/mathliveAdapter'
import type { EditorHandle } from '../../state/CalculatorProvider'
import {parseLinearCalculus,normalizeLinearFunction} from '../../editor/linearCalculus'

// Rendering adapter only. Calculator state, history and the worker continue to
// receive the existing linear syntax; MathLive owns the editable 2D layout.
function naturalIntegral(latex:string):string {
 if(!/^\s*(?:\\int|∫)\s*(?:\\left\s*)?\(/.test(latex))return latex
 const slot='CALCES_RENDER_SLOT'
 try{
  const safe=latex.replace(/#\?|\\placeholder\{[^}]*\}/g,slot)
  const parsed=parseLinearCalculus(safe)
  if(parsed.kind!=='integrate')return latex
  const restore=(value:string)=>value.replaceAll(slot,'\\placeholder{}')
  const func=normalizeLinearFunction(restore(parsed.func))
  const mark=(slot:string,value:string)=>`\\htmlData{calces-slot=${slot}}{${value}}`
  return `\\int\\limits_{${mark('lower',restore(parsed.args[0]!))}}^{${mark('upper',restore(parsed.args[1]!))}}{${mark('function',func)}}\\,\\mathrm{d}x`
 }catch{return latex}
}
function texAtom(source:string,start:number):{value:string;end:number}|null {
 let i=start
 while(/\s/.test(source[i]??'')&&i<source.length)i++
 if(i>=source.length)return null
 if(source[i]==='{'){
  const begin=++i;let depth=1
  for(;i<source.length;i++){
   if(source[i]==='{'&&source[i-1]!=='\\')depth++
   if(source[i]==='}'&&source[i-1]!=='\\'){depth--;if(depth===0)return {value:source.slice(begin,i),end:i+1}}
  }
  return null
 }
 const token=/^\\[a-zA-Z]+|^./.exec(source.slice(i))?.[0]
 return token?{value:token,end:i+token.length}:null
}
// Invisible MathLive annotations identify editable regions, without adding UI
// controls. Remove them before returning the existing linear expression.
function removeSlotMarkup(latex:string):string {
 const marker=/\\htmlData\{calces-slot=(?:lower|upper|function)\}/g
 let match:RegExpExecArray|null
 while((match=marker.exec(latex))){
  const atom=texAtom(latex,marker.lastIndex)
  if(!atom)break
  latex=latex.slice(0,match.index)+atom.value+latex.slice(atom.end)
  marker.lastIndex=match.index
 }
 return latex
}
type IntegralSlot='function'|'lower'|'upper'
function integralSlots(field:MathfieldElement){
 const slots={} as Partial<Record<IntegralSlot,{start:number;end:number;placeholder?:number}>>
 for(let i=0;i<=field.lastOffset;i++){
  const info=field.getElementInfo(i),slot=info?.data?.['calces-slot'] as IntegralSlot|undefined
  if(!slot||!['function','lower','upper'].includes(slot)||info?.latex?.startsWith('\\htmlData'))continue
  const range=slots[slot]??={start:i,end:i}
  range.end=i
  if(info?.latex?.startsWith('\\placeholder'))range.placeholder=i
 }
 return slots
}
// Match cursor offsets to logical arguments before the one-time layout change.
// Offsets inside each argument keep their relative position after reordering
// function/lower/upper into MathLive's subscript/superscript/body branches.
function integralBookmark(field:MathfieldElement){
 const order:IntegralSlot[]=['function','lower','upper']
 const argumentsAt=Array.from({length:field.lastOffset+1},(_,offset)=>{
  const prefix=field.getValue(0,offset).replace(/\\(?:left|right)/g,'')
  const call=/^\s*(?:\\int|∫)\s*\(/.exec(prefix)
  if(!call)return -1
  let depth=1,index=0
  for(const ch of prefix.slice(call[0].length)){
   if('({['.includes(ch))depth++
   else if(')}]'.includes(ch)){if(--depth===0)break}
   else if(ch===','&&depth===1)index++
  }
  return index<3?index:-1
 })
 return (offset:number)=>{
  const index=argumentsAt[offset]??-1
  return {slot:order[index],relative:index<0?offset:offset-argumentsAt.indexOf(index),end:offset===field.lastOffset}
 }
}
function selectIntegralSlot(field:MathfieldElement,slot:IntegralSlot,atEnd=false){
 const range=integralSlots(field)[slot]
 if(!range)return false
 if(range.placeholder!==undefined)field.selection={ranges:[[range.placeholder-1,range.placeholder]]}
 else field.position=atEnd?range.end:range.start
 return true
}
function moveIntegral(field:MathfieldElement,direction:'Left'|'Right'|'Up'|'Down'){
 if(!/^\\int\\limits/.test(field.getValue('latex')))return false
 const slots=integralSlots(field)
 const slot=(Object.keys(slots) as IntegralSlot[]).find(key=>field.position>=slots[key]!.start&&field.position<=slots[key]!.end)
 if(!slot)return false
 const range=slots[slot]!,order:IntegralSlot[]=['function','lower','upper']
 if(direction==='Up'||direction==='Down'){
  const position=field.position
  field.executeCommand(direction==='Up'?'moveUp':'moveDown')
  if(field.position===position||!field.getElementInfo(field.position)?.data?.['calces-slot']){
   selectIntegralSlot(field,direction==='Up'?(slot==='upper'?'function':'upper'):(slot==='lower'?'function':'lower'))
  }
  return true
 }
 if(direction==='Right'&&field.position===range.end)return selectIntegralSlot(field,order[(order.indexOf(slot)+1)%3]!)
 if(direction==='Left'&&(field.position===range.start||range.placeholder===field.position))return selectIntegralSlot(field,order[(order.indexOf(slot)+2)%3]!,true)
 return false
}
function linearIntegral(latex:string):string {
 const prefix=/^\s*\\int(?:\\(?:limits|nolimits))?/.exec(latex)
 if(!prefix)return latex
 let i=prefix[0].length,lower='\\placeholder{}',upper='\\placeholder{}'
 while(i<latex.length){
  while(/\s/.test(latex[i]??'')&&i<latex.length)i++
  const script=latex[i]
  if(script!=='_'&&script!=='^')break
  const atom=texAtom(latex,i+1)
  if(!atom)return latex
  if(script==='_')lower=removeSlotMarkup(atom.value)||'\\placeholder{}'
  else upper=removeSlotMarkup(atom.value)||'\\placeholder{}'
  i=atom.end
 }
 const body=latex.slice(i)
 const differential=/(?:\\[,!;]|\s)*(?:\\mathrm\{d\}|d)\s*x\s*$/.exec(body)
 if(!differential)return latex
 const func=removeSlotMarkup(body.slice(0,differential.index)).trim()||'\\placeholder{}'
 return `\\int\\left(${func},${lower},${upper}\\right)`
}

interface Props { onChange: (latex: string) => void; onReady: (handle: EditorHandle | null) => void; off: boolean; onEditIntent: () => void }
export default function MathEditor({ onChange, onReady, off, onEditIntent }: Props) {
  const {language}=useLanguage()
  useEffect(()=>{
    let active=true
    void loadMathLive().then(Mathfield=>{if(active){Mathfield.locale=language;editor.current?.setAttribute('aria-label',localize('محرر المعادلة'))}}).catch(()=>{})
    return ()=>{active=false}
  },[language])
  const intentRef=useRef(onEditIntent)
  intentRef.current=onEditIntent
  const host = useRef<HTMLDivElement>(null)
  const editor = useRef<MathfieldElement | null>(null)
  const readyRef=useRef(onReady)
  readyRef.current=onReady
  const offRef=useRef(off)
  offRef.current=off
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  const [error, setError] = useState('')
  useEffect(() => {
    let disposed = false
    let field: MathfieldElement | undefined
    let resizeObserver:ResizeObserver|undefined
    let frame=0,baseFontSize=26
    const fitIntegral=()=>{
      cancelAnimationFrame(frame)
      frame=requestAnimationFrame(()=>{
        if(!field)return
        if(!/^\\int\\limits/.test(field.getValue('latex'))){field.style.removeProperty('font-size');return}
        const pane=host.current?.parentElement?.parentElement
        const content=field.shadowRoot?.querySelector('.ML__latex')
        if(!pane||!content)return
        const height=content.getBoundingClientRect().height
        const overhead=field.getBoundingClientRect().height-height
        if(height<=0||pane.clientHeight<=0)return
        const current=parseFloat(getComputedStyle(field).fontSize)
        const size=Math.max(10,Math.min(baseFontSize,current*Math.max(8,pane.clientHeight-overhead-2)/height))
        if(Math.abs(size-current)>0.15)field.style.fontSize=`${size}px`
      })
    }
    const handleIntent=()=>intentRef.current()
    const handleNavigation=(event:KeyboardEvent)=>{
      if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))handleIntent()
      if(field&&/^Arrow(Left|Right|Up|Down)$/.test(event.key)&&!event.shiftKey&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&
        moveIntegral(field,event.key.slice(5) as 'Left'|'Right'|'Up'|'Down')){
        event.preventDefault();event.stopPropagation()
      }
    }
    const publish=()=>{
      if(!field)return
      const latex=field.getValue('latex'),natural=naturalIntegral(latex)
      // Conversion occurs once on a linear insert/paste. Editing an existing
      // natural integral never replaces its value or selection.
      if(natural!==latex){
        const selection=field.selection,bookmark=integralBookmark(field)
        const saved=selection.ranges.map(range=>range.map(bookmark))
        field.setValue(natural,{silenceNotifications:true})
        const slots=integralSlots(field)
        const restore=(point:ReturnType<typeof bookmark>)=>point.end?field!.lastOffset:
          point.slot&&slots[point.slot]?Math.min(slots[point.slot]!.end,slots[point.slot]!.start+point.relative):Math.min(point.relative,field!.lastOffset)
        field.selection={ranges:saved.map(range=>[restore(range[0]!),restore(range[1]!)] as [number,number]),direction:selection.direction}
      }
      onChangeRef.current(linearIntegral(field.getValue('latex')))
      fitIntegral()
    }
    const handleInput=publish
    void loadMathLive().then((Mathfield) => {
      if (disposed || !host.current) return
      field = new Mathfield()
      editor.current = field
      field.mathVirtualKeyboardPolicy = 'manual'
      field.disabled = offRef.current
      field.setAttribute('aria-label', localize('محرر المعادلة'))
      field.setAttribute('dir', 'ltr')
      field.setAttribute('default-mode', 'math')
      field.addEventListener('input', handleInput)
      field.addEventListener('pointerdown',handleIntent)
      field.addEventListener('keydown',handleNavigation,true)
      host.current.append(field)
      baseFontSize=parseFloat(getComputedStyle(field).fontSize)
      resizeObserver=new ResizeObserver(fitIntegral)
      resizeObserver.observe(field)
      if(host.current.parentElement?.parentElement)resizeObserver.observe(host.current.parentElement.parentElement)
      const execute=(operation:()=>void) => {
        if(!field||field.disabled)return
        operation()
        publish()
        field.focus()
      }
      readyRef.current({
        insert: latex=>execute(()=>{
          const natural=naturalIntegral(latex),isIntegral=natural!==latex
          field!.insert(natural,{selectionMode:/#\?|\\placeholder/.test(natural)?'placeholder':'after'})
          // Start at the integrand when all three slots are initially blank.
          // Bounds remain native superscript/subscript branches for Up/Down.
          if(isIntegral&&/^(?:\\int|∫).*?(?:#\?|\\placeholder)/.test(latex)&&
            /^(?:\\int|∫)(?:\\left)?\(\s*(?:#\?|\\placeholder)/.test(latex)){
            selectIntegralSlot(field!,'function')
          }
        }),
        move: direction=>execute(()=>{if(!moveIntegral(field!,direction))field!.executeCommand(({Left:'moveToPreviousChar',Right:'moveToNextChar',Up:'moveUp',Down:'moveDown'} as const)[direction])}),
        deleteBackward: ()=>execute(()=>field!.executeCommand('deleteBackward')),
        clear: ()=>execute(()=>field!.setValue('',{silenceNotifications:true})),
        // Explicit history restore is silent; ordinary input never rewrites selection.
        replace: latex=>{field?.setValue(naturalIntegral(latex),{silenceNotifications:true});if(field)field.position=-1;fitIntegral()},
        focus: ()=>field?.focus(),
      })
    }).catch(() => { if (!disposed) setError('تعذر تحميل المحرر الرياضي') })
    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      resizeObserver?.disconnect()
      field?.removeEventListener('input', handleInput)
      field?.removeEventListener('pointerdown',handleIntent)
      field?.removeEventListener('keydown',handleNavigation,true)
      field?.remove()
      editor.current = null
      readyRef.current(null)
    }
  }, [])
  useEffect(()=>{if(editor.current)editor.current.disabled=off},[off])
  // Uncontrolled custom element: React never writes its value/selection on input.
  return (
    <div>
      <p id="editor-help" className="sr-only">{localize("المس أي موضع للتحرير، أو اسحب لتحديد جزء من المعادلة.")}</p>
      <div ref={host} className="math-editor-host" aria-describedby="editor-help" />
      {localize(error && <p role="alert">{localize(error)}</p>)}
    </div>
  )
}
