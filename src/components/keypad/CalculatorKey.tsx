import { localize } from '../../i18n/locale'
import type { KeyBinding, KeyDefinition } from './keyDefinitions'
import type { KeyLayer } from '../../state/types'

export default function CalculatorKey({ definition, binding, layer, onPress, disabled = false }: {
  definition: KeyDefinition; binding: KeyBinding; layer: KeyLayer;
  onPress: (binding: KeyBinding) => void; disabled?: boolean
}) {
  const active = layer === 'SHIFT' ? Boolean(definition.shift) : layer === 'ALPHA' ? Boolean(definition.alpha) : false
  const toggle = definition.normal.command.kind === 'layer'
  const face = layer === 'NORMAL' ? binding.label : definition.normal.label
  return <div className="key-cell" data-cell={definition.id}>
    <div aria-hidden="true" className="key-legend">
      <span className={layer === 'SHIFT' ? 'legend-active' : ''}>{definition.shift?.label}</span>
      <span className={layer === 'ALPHA' ? 'legend-active' : ''}>{definition.alpha?.label}</span>
    </div>
    <button type="button" data-key={definition.id} data-secondary-active={active}
      aria-label={localize(binding.label)} aria-pressed={toggle ? layer === definition.normal.label : undefined}
      disabled={disabled} onPointerDown={event => event.preventDefault()} onClick={() => onPress(binding)}
      title={localize(binding.command.kind === 'unavailable' ? binding.command.message : binding.label)}
      className={`calculator-key key-${definition.tone ?? 'function'} ${active ? `layer-${layer.toLowerCase()}` : ''}`}>
      {face === '▰/▱' ? <span aria-hidden="true" className="fraction-key"><span>▯</span><span>▯</span></span> : face}
    </button>
  </div>
}
