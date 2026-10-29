import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import Indicators from './Indicators'
import MathEditor from './MathEditor'
import ResultDisplay from './ResultDisplay'
export default function CalculatorDisplay() {
  const { state, tool, result, edit, registerEditor, beginEdit } = useCalculator()
  return <section className="calculator-display" aria-label={localize('الشاشة التفاعلية')}>
    <div className={`lcd-panel ${state.off ? 'lcd-off' : ''}`}>
      <div className="lcd-content" aria-hidden={state.off}>
        <Indicators />
        <div className="lcd-expression" hidden={['MATRIX', 'STAT', 'BASE-N'].includes(state.mode) || (state.mode === 'EQUATION' && (tool === 'linear' || tool === 'polynomial')) || (state.mode === 'CMPLX' && tool === 'polar')}>
          <MathEditor onChange={edit} onEditIntent={beginEdit} onReady={registerEditor} off={state.off} />
        </div>
        <ResultDisplay result={result} />
      </div>
    </div>
    <p role="status" className="display-notice" aria-live="polite">{localize(state.off ? 'اضغط ON للتشغيل' : state.notice)}</p>
  </section>
}
