import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import CalculatorKey from './CalculatorKey'
import { CONTROL_KEYS, FUNCTION_KEYS, NUMBER_KEYS, resolveKey } from './keyDefinitions'
import type { KeyDefinition, KeyBinding } from './keyDefinitions'

export default function Keypad() {
  const {state,press,ready}=useCalculator()
  const render=(definition:KeyDefinition) => {
    const binding=resolveKey(definition,state.mode,state.pending?'ALPHA':state.layer,state.hyp)
    const invalidDigit=state.mode==='BASE-N' && /^\d$/.test(definition.id) && Number(definition.id)>=state.base
    return <CalculatorKey key={definition.id} definition={definition} binding={binding} layer={state.pending?'ALPHA':state.layer} onPress={press} disabled={definition.id!=='on' && (!ready||state.off||invalidDigit)} />
  }
  const arrow=(direction:'Left'|'Right'|'Up'|'Down',label:string) => {
    const binding:KeyBinding={label,command:{kind:'move',direction}}
    return <button type="button" aria-label={localize(`المؤشر ${label}`)} disabled={!ready||state.off} onPointerDown={e=>e.preventDefault()} onClick={()=>press(binding)} className="calculator-key direction-key min-h-11 w-full touch-manipulation rounded text-sm text-white focus-visible:outline-2 focus-visible:outline-orange-300 disabled:opacity-40"><svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" className="mx-auto" style={{transform:`rotate(${{Up:0,Right:90,Down:180,Left:270}[direction]}deg)`}}><path fill="currentColor" d="M8 3 14 13H2Z"/></svg></button>
  }
  return (
    <section aria-label={localize("لوحة مفاتيح الحاسبة")} className="calculator-keypad mt-4 space-y-2" dir="ltr">
      <div className="keypad-controls grid grid-cols-6 items-end gap-2" aria-label={localize("مفاتيح التحكم")}>
        {localize(CONTROL_KEYS.slice(0,2).map(render))}
        <div className="arrow-key">{localize(arrow('Left','◀'))}</div><div className="arrow-key">{localize(arrow('Right','▶'))}</div>
        {localize(CONTROL_KEYS.slice(2).map(render))}
      </div>
      <div className="keypad-functions grid grid-cols-6 gap-x-2 gap-y-1" aria-label={localize("الدوال العلمية")}>
        {localize(FUNCTION_KEYS.map((definition,index)=>definition?render(definition):<div key={`arrow-${index}`} className="arrow-key">{localize(index===2?arrow('Up','▲'):arrow('Down','▼'))}</div>))}
      </div>
      <div className="keypad-numbers grid grid-cols-5 gap-2 pt-2" aria-label={localize("الأرقام والعمليات")}>
        {localize(NUMBER_KEYS.map(render))}
      </div>

    </section>
  )
}
