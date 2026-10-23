import type { CalculatorMode, KeyLayer, NumericBase } from '../../state/types'

export type KeyCommand =
  | { kind:'advanced';tool:string }
  | { kind: 'insert'; latex: string }
  | { kind: 'move'; direction: 'Left' | 'Right' | 'Up' | 'Down' }
  | { kind: 'layer'; layer: 'SHIFT' | 'ALPHA' }
  | { kind: 'menu'; menu: 'mode' | 'setup' }
  | { kind: 'clear' | 'delete' | 'equals' | 'on' | 'off' | 'answer' | 'hyp' }
  | { kind:'calculate'|'store'|'recall' }
  | { kind:'memory';subtract:boolean }
  | { kind:'format';format:'decimal'|'fraction'|'engineering'|'dms';delta?:number }
  | { kind: 'base'; base: NumericBase }
  | { kind: 'unavailable'; message: string }
export interface KeyBinding { label: string; command: KeyCommand }
export interface KeyDefinition {
  id: string
  normal: KeyBinding
  shift?: KeyBinding
  alpha?: KeyBinding
  tone?: 'function' | 'number' | 'delete' | 'clear' | 'equals' | 'shift' | 'alpha'
  modes?: Partial<Record<CalculatorMode, KeyBinding>>
}
const insert = (label: string, latex = label): KeyBinding => ({ label, command: { kind: 'insert', latex } })
const pending = (label: string, message: string): KeyBinding => ({ label, command: { kind: 'unavailable', message } })
const key = (id: string, normal: KeyBinding, shift?: KeyBinding, alpha?: string): KeyDefinition => ({ id, normal, shift, ...(alpha ? { alpha: insert(alpha) } : {}) })
export const CONTROL_KEYS: KeyDefinition[] = [
  { id:'shift',normal:{label:'SHIFT',command:{kind:'layer',layer:'SHIFT'}},tone:'shift' },
  { id:'alpha',normal:{label:'ALPHA',command:{kind:'layer',layer:'ALPHA'}},tone:'alpha' },
  { id:'mode',normal:{label:'MODE',command:{kind:'menu',menu:'mode'}},shift:{label:'SETUP',command:{kind:'menu',menu:'setup'}} },
  { id:'on',normal:{label:'ON',command:{kind:'on'}} },
]
export const FUNCTION_KEYS: Array<KeyDefinition | null> = [
  key('calc', {label:'CALC',command:{kind:'calculate'}}, {label:'SOLVE',command:{kind:'advanced',tool:'root'}}),
  key('integral', {label:'∫',command:{kind:'advanced',tool:'integrate'}},{label:'d/dx',command:{kind:'advanced',tool:'derivative'}}),
  null, null,
  key('inverse', insert('x⁻¹','^{ -1}'), insert('x!','!')),
  key('logbase', insert('logₐ','\\log_{#?}\\left(#?\\right)'), insert('Σ','\\sum_{x=#?}^{#?}#?')),
  key('fraction', insert('▰/▱','\\frac{#?}{#?}'), insert('a b/c','{#?}+\\frac{#?}{#?}')),
  key('sqrt', insert('√','\\sqrt{#?}'), insert('∛','\\sqrt[3]{#?}')),
  key('square', insert('x²','^{2}'), insert('x³','^{3}')),
  key('power', insert('xʸ','^{#?}'), insert('ʸ√x','\\sqrt[#?]{#?}')),
  key('log', insert('log','\\log\\left(#?\\right)'), insert('10ˣ','10^{#?}')),
  key('ln', insert('ln','\\ln\\left(#?\\right)'), insert('eˣ','e^{#?}')),
  key('negative', insert('(−)','-'), insert('∠','\\angle'), 'A'),
  key('dms', insert('°′″','\\degree'), {label:'DMS',command:{kind:'format',format:'dms'}}, 'B'),
  key('hyp',{label:'hyp',command:{kind:'hyp'}},insert('Abs','\\operatorname{abs}\\left(#?\\right)'),'C'),
  key('sin',insert('sin','\\sin\\left(#?\\right)'),insert('sin⁻¹','\\sin^{-1}\\left(#?\\right)'),'D'),
  key('cos',insert('cos','\\cos\\left(#?\\right)'),insert('cos⁻¹','\\cos^{-1}\\left(#?\\right)'),'E'),
  key('tan',insert('tan','\\tan\\left(#?\\right)'),insert('tan⁻¹','\\tan^{-1}\\left(#?\\right)'),'F'),
  key('recall',{label:'RCL',command:{kind:'recall'}},{label:'STO',command:{kind:'store'}}),
  key('eng',{label:'ENG',command:{kind:'format',format:'engineering',delta:-3}},{label:'←ENG',command:{kind:'format',format:'engineering',delta:3}}),
  key('open',insert('('),insert('%','\\%')),
  key('close',insert(')'),insert(',',' , '),'X'),
  key('decimal',{label:'S⇔D',command:{kind:'format',format:'fraction'}},{label:'d/c',command:{kind:'format',format:'fraction'}},'Y'),
  key('memory',{label:'M+',command:{kind:'memory',subtract:false}},{label:'M−',command:{kind:'memory',subtract:true}},'M'),
]
const overrides: Record<string, Partial<Record<CalculatorMode, KeyBinding>>> = {
  calc: { EQUATION:{label:'f(x)=0',command:{kind:'advanced',tool:'root'}} },
  integral: { STAT:{label:'x̄',command:{kind:'advanced',tool:'summary'}}, MATRIX:{label:'det',command:{kind:'advanced',tool:'det'}}, CMPLX: insert('Abs','\\operatorname{abs}\\left(#?\\right)'), 'BASE-N': {label:'DEC',command:{kind:'base',base:10}} },
  inverse: { STAT:{label:'σx',command:{kind:'advanced',tool:'summary'}}, MATRIX:{label:'Mat⁻¹',command:{kind:'advanced',tool:'inverse'}}, CMPLX: insert('arg','\\operatorname{arg}\\left(#?\\right)'), 'BASE-N': {label:'HEX',command:{kind:'base',base:16}} },
  logbase: { STAT:{label:'Reg',command:{kind:'advanced',tool:'regression'}}, MATRIX:{label:'Mat',command:{kind:'advanced',tool:'multiply'}}, CMPLX: insert('i','i'), 'BASE-N': {label:'BIN',command:{kind:'base',base:2}} },
  log: { 'BASE-N':{label:'OCT',command:{kind:'base',base:8}} },
  sin: { 'BASE-N':{label:'AND',command:{kind:'advanced',tool:'AND'}} },
  cos: { 'BASE-N':{label:'OR',command:{kind:'advanced',tool:'OR'}} },
  tan: { 'BASE-N':{label:'XOR',command:{kind:'advanced',tool:'XOR'}} },
  hyp: { 'BASE-N':{label:'NOT',command:{kind:'advanced',tool:'NOT'}} },
}
for (const definition of FUNCTION_KEYS) if (definition && overrides[definition.id]) definition.modes=overrides[definition.id]
export const NUMBER_KEYS: KeyDefinition[] = [
  ...['7','8','9'].map(d=>({...key(d,insert(d)),tone:'number' as const})),
  {id:'delete',normal:{label:'DEL',command:{kind:'delete'}},shift:pending('INS','MathLive يدعم الإدراج مباشرة عند المؤشر'),tone:'delete'},
  {id:'clear',normal:{label:'AC',command:{kind:'clear'}},shift:{label:'OFF',command:{kind:'off'}},tone:'clear'},
  ...['4','5','6','×','÷','1','2','3','+','−','0','.'].map(d=>({...key(d,insert(d,d==='×'?'\\times ':d==='÷'?'\\div ':d==='−'?'-':d)),tone:'number' as const})),
  {...key('exponent',insert('×10ˣ','\\times10^{#?}'),insert('π','\\pi'),'e'),tone:'number'},
  {id:'answer',normal:{label:'Ans',command:{kind:'answer'}},tone:'number'},
  {id:'equals',normal:{label:'=',command:{kind:'equals'}},tone:'equals'},
]
export function resolveKey(definition: KeyDefinition, mode: CalculatorMode, layer: KeyLayer, hyp = false): KeyBinding {
  if (layer === 'ALPHA' && definition.alpha) return definition.alpha
  if (hyp && ['sin','cos','tan'].includes(definition.id)) {
    const name=definition.id+'h'
    return insert(name+(layer==='SHIFT'?'⁻¹':''),`\\operatorname{${name}}${layer==='SHIFT'?'^{-1}':''}\\left(#?\\right)`)
  }
  if (layer === 'SHIFT' && definition.shift) return definition.shift
  return definition.modes?.[mode] ?? definition.normal
}
