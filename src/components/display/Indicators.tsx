import { useCalculator } from '../../state/CalculatorProvider'
export default function Indicators() {
  const {state}=useCalculator()
  return <div className="mb-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px]" dir="ltr" aria-label="مؤشرات الحاسبة">
    <span>{state.mode}</span><span>{state.angle}</span><span>MATH</span>
    <span className={state.layer==='SHIFT'?'font-bold':'opacity-25'}>SHIFT</span>
    <span className={state.layer==='ALPHA'?'font-bold':'opacity-25'}>ALPHA</span>
    {state.hyp&&<span>HYP</span>}{state.variables.M!=='0'&&<span>M</span>}{state.mode==='BASE-N'&&<span>{state.base===2?'BIN':state.base===8?'OCT':state.base===16?'HEX':'DEC'} · signed 32-bit</span>}
  </div>
}
