import { getLanguage, localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import MathEditor from '../display/MathEditor'
import Indicators from '../display/Indicators'
import ResultDisplay from '../display/ResultDisplay'
import Keypad from '../keypad/Keypad'
import { useDeviceController } from './useDeviceController'

export default function HardwareCalculator() {
  const { state, result, edit, registerEditor, beginEdit, advanced } = useCalculator()
  const device = useDeviceController()
  const busy = advanced.state.status === 'running'
  const displayResult = state.committedValue !== null || advanced.state.status === 'success'
    ? result
    : { status: 'empty' as const, text: state.latex ? '' : '0' }
  return <div className="hardware-stage">
    <article className="device-shell" data-layer={state.layer} data-interface="device" aria-label={getLanguage() === 'ar' ? 'حاسبة الجهاز العلمية 991 ES PLUS' : '991 ES PLUS scientific device calculator'}>
      <header className="device-brand" dir="ltr">
        <div className="device-brand-copy">
          <h1>CalcES</h1>
          <span className="device-model">991ES PLUS</span>
          <span className="device-natural-label">NATURAL-V.P.A.M.</span>
        </div>
        <div className="device-solar-block"><div className="device-solar" aria-hidden="true"><i /><i /><i /><i /></div><span>ES SERIES</span></div>
      </header>
      <section className={`device-lcd ${state.off ? 'device-lcd-off' : ''}`} aria-label={localize('شاشة الحاسبة')}>
        <div className="device-lcd-inner">
          <Indicators />
          <div className="device-main-editor" hidden={device.screen !== null}>
            <div className="device-expression"><MathEditor onChange={edit} onReady={registerEditor} off={state.off} onEditIntent={beginEdit} /></div>
            <ResultDisplay result={displayResult} />
          </div>
          {device.screen !== null && <div className="device-lcd-screen">{device.screen}</div>}
          {busy && <div className="device-busy" role="status">{getLanguage() === 'ar' ? 'جارٍ الحساب' : 'Calculating'}<span aria-hidden="true"> ▰</span></div>}
          {state.notice && <div className="device-notice" role="status" dir="auto">{localize(state.notice)}</div>}
        </div>
        <span className="device-lcd-caption" aria-hidden="true">NATURAL DISPLAY</span>
      </section>
      <Keypad onPress={device.press} />
      <footer className="device-footer" dir="ltr">CalcES · SCIENTIFIC CALCULATOR</footer>
    </article>
  </div>
}
