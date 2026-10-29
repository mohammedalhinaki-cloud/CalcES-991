import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import CalculatorKey from './CalculatorKey'
import { CONTROL_KEYS, FUNCTION_KEYS, NUMBER_KEYS, resolveKey } from './keyDefinitions'
import type { KeyDefinition, KeyBinding } from './keyDefinitions'

export default function Keypad({ onPress }: { onPress?: (binding:KeyBinding) => void } = {}) {
  const { state, press, ready } = useCalculator()
  const handlePress = onPress ?? press
  const render = (definition: KeyDefinition) => {
    const binding = resolveKey(definition, state.mode, state.pending ? 'ALPHA' : state.layer, state.hyp)
    const invalidDigit = state.mode === 'BASE-N' && /^\d$/.test(definition.id) && Number(definition.id) >= state.base
    return <CalculatorKey key={definition.id} definition={definition} binding={binding} layer={state.pending ? 'ALPHA' : state.layer} onPress={handlePress} disabled={definition.id !== 'on' && (!ready || state.off || invalidDigit)} />
  }
  const arrow = (direction: 'Left' | 'Right' | 'Up' | 'Down', label: string) => {
    const binding: KeyBinding = { label, command: { kind: 'move', direction } }
    return <button type="button" aria-label={localize(`المؤشر ${label}`)} disabled={!ready || state.off}
      onPointerDown={event => event.preventDefault()} onClick={() => handlePress(binding)}
      className={`direction-key replay-${direction.toLowerCase()}`}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" style={{ transform: `rotate(${{ Up: 0, Right: 90, Down: 180, Left: 270 }[direction]}deg)` }}><path fill="currentColor" d="M8 3 14 13H2Z" /></svg>
    </button>
  }
  const controls = [CONTROL_KEYS[0]!, CONTROL_KEYS[1]!, CONTROL_KEYS[2]!, CONTROL_KEYS[3]!, FUNCTION_KEYS[0]!, FUNCTION_KEYS[1]!, FUNCTION_KEYS[4]!, FUNCTION_KEYS[5]!]
  return <section aria-label={localize('لوحة مفاتيح الحاسبة')} className="calculator-keypad" dir="ltr">
    <div className="keypad-controls" aria-label={localize('مفاتيح التحكم')}>
      {controls.map(render)}
      <div className="replay-pad" role="group" aria-label="REPLAY">
        {arrow('Up', '▲')}{arrow('Left', '◀')}
        <span className="replay-label" aria-hidden="true">REPLAY</span>
        {arrow('Right', '▶')}{arrow('Down', '▼')}
      </div>
    </div>
    <div className="keypad-functions grid grid-cols-6" aria-label={localize('الدوال العلمية')}>
      {FUNCTION_KEYS.slice(6).filter((key): key is KeyDefinition => key !== null).map(render)}
    </div>
    <div className="keypad-numbers grid grid-cols-5" aria-label={localize('الأرقام والعمليات')}>
      {NUMBER_KEYS.map(render)}
    </div>
  </section>
}
