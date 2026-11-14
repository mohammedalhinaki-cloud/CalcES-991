import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
export default function Indicators() {
  const {state}=useCalculator()
  return <div className="calculator-indicators" dir="ltr" aria-label={localize("مؤشرات الحاسبة")}>
    <span>{localize(state.mode)}</span><span>{localize(state.angle)}</span><span>MATH</span>
    <span className={state.layer==='SHIFT'?'indicator-on indicator-shift':'indicator-off'}>SHIFT</span>
    <span className={state.layer==='ALPHA'?'indicator-on indicator-alpha':'indicator-off'}>ALPHA</span>
    {localize(state.hyp&&<span>HYP</span>)}{localize(state.variables.M!=='0'&&<span>M</span>)}{localize(state.mode==='BASE-N'&&<span>{localize(state.base===2?'BIN':state.base===8?'OCT':state.base===16?'HEX':'DEC')} · signed 32-bit</span>)}
  </div>
}
