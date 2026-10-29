import { getDirection, getLanguage, localize } from '../i18n/locale'
import { useEffect, useRef } from 'react'
import { useCalculator } from '../state/CalculatorProvider'
import type { AngleUnit, CalculatorMode, DisplayMode, Notation } from '../state/types'

const MODES:Array<[CalculatorMode,string]>=[
  ['COMP','حساب عام'],['CMPLX','أعداد مركبة'],['STAT','إحصاء'],
  ['BASE-N','أنظمة عددية'],['EQUATION','معادلات'],['MATRIX','مصفوفات'],
]
const ANGLES:AngleUnit[]=['DEG','RAD','GRA']
const NOTATIONS:Notation[]=['norm','fix','sci']
const DISPLAY_MODES:DisplayMode[]=['natural','linear']
const labels={
  en:{mode:'MODE · Select mode',setup:'SETUP · Display and calculation',close:'Close',hint:'Press 1–6 or choose a supported mode.',angle:'Angle',notation:'Notation',digits:'Digits',display:'Output',natural:'Natural',linear:'Linear',norm:'Norm',fix:'Fix',sci:'Sci',setupHint:'Choose the angle, notation, precision, and output style.'},
  ar:{mode:'MODE · اختر الوضع',setup:'SETUP · العرض والحساب',close:'إغلاق',hint:'اضغط 1–6 أو المس وضعًا مدعومًا.',angle:'وحدة الزوايا',notation:'صيغة العرض',digits:'الأرقام',display:'شكل الناتج',natural:'طبيعي',linear:'خطي',norm:'Norm',fix:'Fix',sci:'Sci',setupHint:'اختر وحدة الزوايا وصيغة العرض والدقة وشكل الناتج.'},
}

export default function ModeMenu() {
  const {state,dispatch,setMode}=useCalculator()
  const dialog=useRef<HTMLDialogElement>(null)
  const text=labels[getLanguage()]
  useEffect(()=>{
    const element=dialog.current
    if(state.menu&&!element?.open)element?.showModal()
    if(!state.menu&&element?.open)element.close()
  },[state.menu])
  useEffect(()=>{
    if(state.menu!=='mode')return
    const selectMode=(event:KeyboardEvent)=>{
      if(event.altKey||event.ctrlKey||event.metaKey)return
      const target=event.target
      if(target instanceof HTMLInputElement||target instanceof HTMLSelectElement||target instanceof HTMLTextAreaElement||target instanceof HTMLElement&&target.isContentEditable)return
      const index=Number(event.key)-1
      if(index<0||index>=MODES.length||!Number.isInteger(index))return
      event.preventDefault()
      setMode(MODES[index]![0])
    }
    document.addEventListener('keydown',selectMode)
    return ()=>document.removeEventListener('keydown',selectMode)
  },[state.menu,setMode])
  const notationLabel=(notation:Notation)=>text[notation]
  return (
    <dialog ref={dialog} aria-labelledby="mode-menu-title" aria-describedby="mode-menu-help" onCancel={event=>{event.preventDefault();dispatch({type:'CLOSE_MENU'})}} className="mode-lcd-dialog" dir={getDirection()}>
      <header>
        <h2 id="mode-menu-title">{localize(state.menu==='setup'?text.setup:text.mode)}</h2>
        <button type="button" onClick={()=>dispatch({type:'CLOSE_MENU'})} aria-label={getLanguage()==='ar'?'إغلاق القائمة':'Close menu'}>×</button>
      </header>
      {state.menu==='setup'?<section aria-label={localize(text.setup)}>
        <p id="mode-menu-help">{localize(text.setupHint)}</p>
        <fieldset>
          <legend>{localize(text.angle)}</legend>
          <div role="group" aria-label={localize(text.angle)}>
            {ANGLES.map(angle=><button key={angle} type="button" onClick={()=>dispatch({type:'SET_ANGLE',angle})} aria-pressed={state.angle===angle}>{localize(angle)}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend>{localize(text.notation)}</legend>
          <div role="group" aria-label={localize(text.notation)}>
            {NOTATIONS.map(notation=><button key={notation} type="button" onClick={()=>dispatch({type:'SET_NOTATION',notation})} aria-pressed={state.notation===notation}>{localize(notationLabel(notation))}</button>)}
          </div>
        </fieldset>
        <label>
          <span>{state.notation==='sci'?(getLanguage()==='ar'?'أرقام معنوية (0 = 10)':'Significant digits (0 = 10)'):state.notation==='fix'?(getLanguage()==='ar'?'منازل عشرية':'Decimal places'):localize(text.digits)}</span>
          <select value={state.digits} disabled={state.notation==='norm'} onChange={event=>dispatch({type:'SET_DIGITS',digits:Number(event.target.value)})} aria-label={localize(text.digits)}>
            {Array.from({length:15},(_,digit)=><option key={digit} value={digit}>{digit}</option>)}
          </select>
        </label>
        <fieldset>
          <legend>{localize(text.display)}</legend>
          <div role="group" aria-label={localize(text.display)}>
            {DISPLAY_MODES.map(displayMode=><button key={displayMode} type="button" onClick={()=>dispatch({type:'SET_DISPLAY_MODE',displayMode})} aria-pressed={state.displayMode===displayMode}>{localize(text[displayMode])}</button>)}
          </div>
        </fieldset>
      </section>:<section aria-label={localize(text.mode)}>
        <p id="mode-menu-help">{localize(text.hint)}</p>
        <ol>
          {MODES.map(([mode,label],index)=><li key={mode}>
            <button type="button" onClick={()=>setMode(mode)} aria-label={mode==='EQUATION'?'EQUATION · EQN':localize(mode)} aria-pressed={state.mode===mode}>
              <kbd aria-hidden="true">{index+1}</kbd>
              <span dir="ltr" aria-hidden={mode==='EQUATION'}>{mode==='EQUATION'?'EQN':localize(mode)}</span>
              <small>{localize(label)}</small>
            </button>
          </li>)}
        </ol>
      </section>}
      <footer><button type="button" onClick={()=>dispatch({type:'CLOSE_MENU'})}>{localize(text.close)}</button></footer>
    </dialog>
  )
}
