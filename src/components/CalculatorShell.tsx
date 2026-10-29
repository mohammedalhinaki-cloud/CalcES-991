import { getLanguage, localize } from '../i18n/locale'
import { useCalculator } from '../state/CalculatorProvider'
import Keypad from './keypad/Keypad'
import MathEditor from './display/MathEditor'
import Indicators from './display/Indicators'
import ResultDisplay from './display/ResultDisplay'
import { useDeviceController } from './device/useDeviceController'

/** The silver alternative uses exactly the same integrated input system. */
export default function CalculatorShell() {
  const { state, result, edit, registerEditor, beginEdit, advanced } = useCalculator()
  const device = useDeviceController()
  const displayResult = state.committedValue !== null || advanced.state.status === 'success'
    ? result
    : {status:'empty' as const,text:state.latex?'':'0'}
  return <div className="calculator-layout integrated-silver">
    <article id="calculator" className="calculator-body" aria-labelledby="calculator-title" data-layer={state.layer} data-interface="silver">
      <header className="calculator-brand" dir="ltr">
        <h1 id="calculator-title" className="sr-only">{getLanguage() === 'en' ? 'CalcES 991 — Scientific Calculator' : 'CalcES 991 — حاسبة علمية'}</h1>
        <div><div className="brand-wordmark">CalcES <strong>991</strong></div><span className="brand-tagline">NATURAL SCIENTIFIC</span></div>
        <div className="brand-edition"><span>ES</span><small>CLASSIC</small></div>
      </header>
      <section className={`calculator-display lcd-panel ${state.off?'lcd-off':''}`} aria-label={localize('الشاشة التفاعلية')}>
        <div className="lcd-content">
          <Indicators />
          <div className="device-main-editor" hidden={device.screen!==null}>
            <div className="lcd-expression"><MathEditor onChange={edit} onReady={registerEditor} off={state.off} onEditIntent={beginEdit}/></div>
            <ResultDisplay result={displayResult}/>
          </div>
          {device.screen!==null&&<div className="device-lcd-screen">{device.screen}</div>}
          {advanced.state.status==='running'&&<div className="device-busy" role="status">{getLanguage()==='ar'?'جارٍ الحساب':'Calculating'}</div>}
          {state.notice&&<div className="device-notice" role="status" dir="auto">{localize(state.notice)}</div>}
        </div>
      </section>
      <Keypad onPress={device.press}/>
      <footer className="calculator-footnote" dir="ltr">CalcES · INDEPENDENT SCIENTIFIC CALCULATOR</footer>
    </article>
  </div>
}
