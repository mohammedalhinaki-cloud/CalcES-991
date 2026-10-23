import type { KeyBinding, KeyDefinition } from './keyDefinitions'
import type { KeyLayer } from '../../state/types'
export default function CalculatorKey({definition,binding,layer,onPress,disabled=false}:{definition:KeyDefinition;binding:KeyBinding;layer:KeyLayer;onPress:(binding:KeyBinding)=>void;disabled?:boolean}) {
  const active=layer==='SHIFT'?Boolean(definition.shift):layer==='ALPHA'?Boolean(definition.alpha):false
  const toggle=definition.normal.command.kind==='layer'
  return (
    <div className="min-w-0">
      <div aria-hidden="true" className="key-legend mb-1 flex h-3 justify-between whitespace-nowrap text-[8px] leading-3">
        <span className="text-[#e8c64a]">{definition.shift?.label}</span><span className="text-[#b28aef]">{definition.alpha?.label}</span>
      </div>
      <button type="button" data-key={definition.id} data-secondary-active={active} aria-label={binding.label} aria-pressed={toggle?layer===definition.normal.label:undefined} disabled={disabled}
        onPointerDown={event=>event.preventDefault()} onClick={()=>onPress(binding)}
        title={binding.command.kind==='unavailable'?binding.command.message:binding.label}
        className={`calculator-key h-11 w-full min-w-0 touch-manipulation rounded-md px-0.5 text-[12px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300 disabled:opacity-40 sm:text-sm key-${definition.tone??'function'} ${active?(layer==='SHIFT'?'ring-2 ring-[#e8c64a]':'ring-2 ring-[#b28aef]'):''}`}>
        {binding.label==='▰/▱'?<span aria-hidden="true" className="fraction-key"><span>x</span><span>y</span></span>:binding.label==='DEL'?<svg aria-hidden="true" className="mx-auto" width="27" height="22" viewBox="0 0 28 22"><path d="M9 2h16v18H9L1 11Z" fill="currentColor"/><path d="m13 7 8 8m0-8-8 8" stroke="#ec9148" strokeWidth="2.5"/></svg>:binding.label}
      </button>
    </div>
  )
}
