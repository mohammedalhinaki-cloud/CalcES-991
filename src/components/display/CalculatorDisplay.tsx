import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import Indicators from './Indicators'
import MathEditor from './MathEditor'
import ResultDisplay from './ResultDisplay'
import AdvancedLayerToggle from '../keypad/AdvancedLayerToggle'

/**
 * Calculator screen: a slim status bar (indicators + advanced layers) above a tall LCD whose
 * input line gets most of the height, with the result anchored along the bottom edge.
 */
export default function CalculatorDisplay() {
  const {state,tool,result,edit,registerEditor,beginEdit}=useCalculator()
  const editorHidden=['MATRIX','STAT','BASE-N'].includes(state.mode)||(state.mode==='EQUATION'&&(tool==='linear'||tool==='polynomial'))||(state.mode==='CMPLX'&&tool==='polar')
  return (
    <section className="calculator-display" data-off={state.off} aria-label={localize("الشاشة التفاعلية")}>
      <div className="display-topbar">
        <div className={`display-indicators ${state.off?'invisible':''}`} aria-hidden={state.off}><Indicators /></div>
        <AdvancedLayerToggle />
      </div>
      <div className="lcd-panel">
        <div className={`lcd-content ${state.off?'invisible':''}`} aria-hidden={state.off}>
          <div className="lcd-input" hidden={editorHidden}><MathEditor onChange={edit} onEditIntent={beginEdit} onReady={registerEditor} off={state.off} /></div>
          <ResultDisplay result={result} />
        </div>
      </div>
      <p role="status" className="calculator-display-status" aria-live="polite">{localize(state.off?'اضغط ON للتشغيل':state.notice)}</p>
    </section>
  )
}
