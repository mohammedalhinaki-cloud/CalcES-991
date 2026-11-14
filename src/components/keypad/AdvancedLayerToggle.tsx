import { useEffect, useRef, useState } from 'react'
import { localize } from '../../i18n/locale'
import { useCalculator } from '../../state/CalculatorProvider'
import type { KeyLayer } from '../../state/types'

export default function AdvancedLayerToggle() {
  const { state, press } = useCalculator()
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const isActive = state.layer !== 'NORMAL'

  useEffect(() => {
    if (!open) return
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false)
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function chooseLayer(layer: Exclude<KeyLayer, 'NORMAL'>) {
    press({ label: layer, command: { kind: 'layer', layer } })
    setOpen(false)
  }

  return (
    <div className="advanced-layer-control" ref={root}>
      <button
        type="button"
        className="advanced-layer-toggle"
        aria-label={localize('الوظائف المتقدمة')}
        aria-controls="advanced-layer-options"
        aria-expanded={open}
        aria-pressed={isActive}
        disabled={state.off}
        onClick={() => setOpen((current) => !current)}
      >
        <svg aria-hidden="true" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="m10 2 1.9 5.1L17 9l-5.1 1.9L10 16l-1.9-5.1L3 9l5.1-1.9L10 2Z"/><path d="m16.5 13 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z"/></svg>
        <span>{localize('متقدم')}</span>
        {isActive && <span className={`advanced-layer-status advanced-layer-status--${state.layer.toLowerCase()}`}>{state.layer}</span>}
        <svg className="advanced-layer-chevron" aria-hidden="true" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m4 6 4 4 4-4"/></svg>
      </button>

      <div id="advanced-layer-options" className="advanced-layer-popover" role="group" aria-label={localize('اختيار وظائف SHIFT وALPHA')} hidden={!open}>
        <span className="advanced-layer-heading">{localize('اختر طبقة الوظائف')}</span>
        <button type="button" className="advanced-layer-choice" aria-pressed={state.layer === 'SHIFT'} onClick={() => chooseLayer('SHIFT')}>
          <span className="advanced-layer-choice-name">SHIFT</span>
          <span>{localize('الوظائف الصفراء')}</span>
        </button>
        <button type="button" className="advanced-layer-choice" aria-pressed={state.layer === 'ALPHA'} onClick={() => chooseLayer('ALPHA')}>
          <span className="advanced-layer-choice-name advanced-layer-choice-name--alpha">ALPHA</span>
          <span>{localize('المتغيرات والرموز')}</span>
        </button>
      </div>
    </div>
  )
}
