import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import Indicators from './Indicators'
import MathEditor from './MathEditor'
import ResultDisplay from './ResultDisplay'

/**
 * Calculator screen: one thin status line (indicators + mode-workspace toggle), then the LCD.
 * The input line owns the LCD height; the result is a compact line in the bottom-right corner.
 */
export default function CalculatorDisplay() {
  const {state,tool,result,edit,registerEditor,beginEdit,workspaceOpen,setWorkspaceOpen}=useCalculator()
  const editorHidden=['MATRIX','STAT','BASE-N'].includes(state.mode)||(state.mode==='EQUATION'&&(tool==='linear'||tool==='polynomial'))||(state.mode==='CMPLX'&&tool==='polar')
  return (
    <section className="calculator-display" data-off={state.off} aria-label={localize("الشاشة التفاعلية")}>
      <div className="display-topbar">
        <div className={`display-indicators ${state.off?'invisible':''}`} aria-hidden={state.off}><Indicators /></div>
        <button type="button" className="display-chip workspace-toggle" aria-label={localize("مساحة العمل")} title={localize("مساحة العمل")} aria-expanded={workspaceOpen} aria-controls="workspace" disabled={state.off} onClick={()=>setWorkspaceOpen(!workspaceOpen)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></svg>
        </button>
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
