import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
export default function Indicators() {
  const { state } = useCalculator()
  return <div className="calculator-indicators" dir="ltr" aria-label={localize('مؤشرات الحاسبة')}>
    <span className={state.layer === 'SHIFT' ? 'indicator-on' : 'indicator-standby'}>S</span>
    <span className={state.layer === 'ALPHA' ? 'indicator-on' : 'indicator-standby'}>A</span>
    <span className={state.variables.M !== '0' ? 'indicator-on' : 'indicator-standby'}>M</span>
    <span className="indicator-mode">{state.mode === 'EQUATION' ? 'EQN' : state.mode}</span>
    {state.hyp && <span>HYP</span>}<span>{state.angle}</span>
    <span>{state.notation === 'fix' ? `FIX ${state.digits}` : state.notation === 'sci' ? `SCI ${state.digits}` : ''}</span>
    <span className="indicator-display">{state.displayMode === 'linear' ? 'LINE' : 'MATH'}</span>
    {state.mode === 'BASE-N' && <span>{state.base === 2 ? 'BIN' : state.base === 8 ? 'OCT' : state.base === 16 ? 'HEX' : 'DEC'}</span>}
  </div>
}
