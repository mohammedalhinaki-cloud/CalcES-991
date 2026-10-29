import { getDirection, getLanguage, localize } from '../i18n/locale'
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { Variables } from '../engine/evaluate'
import { useCalculator } from '../state/CalculatorProvider'

const copy={
  en:{title:'CALC · Substitute values',help:'Enter a finite numeric value for each variable in this expression. The expression itself is not changed.',calculate:'Calculate',cancel:'Cancel'},
  ar:{title:'CALC · تعويض القيم',help:'أدخل قيمة رقمية منتهية لكل متغير موجود في هذا التعبير. لن يتغير التعبير نفسه.',calculate:'احسب',cancel:'إلغاء'},
}

/** Shell-mounted dialog for a COMP-mode CALC request with variables. */
export default function CalcSubstitution(){
  const {substitutionVariables, state, closeSubstitution, calculateWithSubstitutions}=useCalculator()
  const dialog=useRef<HTMLDialogElement>(null)
  const text=copy[getLanguage()]
  const [draft,setDraft]=useState<Partial<Variables>>({})
  const [error,setError]=useState('')
  const key=substitutionVariables?.join(',')??''
  useEffect(()=>{
    if(!substitutionVariables)return
    setDraft(Object.fromEntries(substitutionVariables.map(name=>[name,state.variables[name]])) as Partial<Variables>)
    setError('')
  },[key,substitutionVariables,state.variables])
  useEffect(()=>{
    const element=dialog.current
    if(substitutionVariables&&!element?.open)element?.showModal()
    if(!substitutionVariables&&element?.open)element.close()
  },[substitutionVariables])
  const submit=(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault()
    const message=calculateWithSubstitutions(draft)
    setError(message??'')
  }
  return <dialog ref={dialog} className="calc-substitution-dialog" aria-labelledby="calc-substitution-title" aria-describedby="calc-substitution-help" dir={getDirection()} onCancel={event=>{event.preventDefault();closeSubstitution()}}>
    <form onSubmit={submit}>
      <header><h2 id="calc-substitution-title">{localize(text.title)}</h2></header>
      <p id="calc-substitution-help">{localize(text.help)}</p>
      <div>
        {substitutionVariables?.map(name=><label key={name}>
          <span dir="ltr">{name} =</span>
          <input
            autoFocus={name===substitutionVariables[0]}
            aria-label={`${name} =`}
            dir="ltr"
            inputMode="decimal"
            value={draft[name]??''}
            onChange={event=>setDraft(previous=>({...previous,[name]:event.target.value}))}
          />
        </label>)}
      </div>
      {error&&<p role="alert">{localize(error)}</p>}
      <footer>
        <button type="button" onClick={closeSubstitution}>{localize(text.cancel)}</button>
        <button type="submit">{localize(text.calculate)}</button>
      </footer>
    </form>
  </dialog>
}
