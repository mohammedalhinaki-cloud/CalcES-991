import { useCalculator } from '../../state/CalculatorProvider'
import Indicators from './Indicators'
import MathEditor from './MathEditor'
import ResultDisplay from './ResultDisplay'
export default function CalculatorDisplay() {
  const {state,tool,result,edit,registerEditor,beginEdit}=useCalculator()
  return (
    <section className="calculator-display" aria-label="الشاشة التفاعلية">
      <div className={state.off?'invisible':''} aria-hidden={state.off}>
        <Indicators />
        <div className="lcd-panel">
        <div hidden={['MATRIX','STAT','BASE-N'].includes(state.mode)||(state.mode==='EQUATION'&&(tool==='linear'||tool==='polynomial'))||(state.mode==='CMPLX'&&tool==='polar')}><MathEditor onChange={edit} onEditIntent={beginEdit} onReady={registerEditor} off={state.off} /></div>
        <ResultDisplay result={result} />
        </div>
      </div>
      <p role="status" className="mt-1 break-words text-xs leading-5 [overflow-wrap:anywhere]" aria-live="polite">{state.off?'اضغط ON للتشغيل':state.notice}</p>
    </section>
  )
}
