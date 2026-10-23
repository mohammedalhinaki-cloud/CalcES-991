import { describe, expect, it } from 'vitest'
import { calculatorReducer as reduce, initialState } from '../../state/calculatorReducer'
import { FUNCTION_KEYS, NUMBER_KEYS, CONTROL_KEYS, resolveKey } from '../../components/keypad/keyDefinitions'

describe('calculator state transitions',()=>{
  it('toggles exclusive layers and consumes them after a key',()=>{
    let s=reduce(initialState,{type:'TOGGLE_LAYER',layer:'SHIFT'})
    expect(s.layer).toBe('SHIFT')
    s=reduce(s,{type:'TOGGLE_LAYER',layer:'ALPHA'})
    expect(s.layer).toBe('ALPHA')
    expect(reduce(s,{type:'TOGGLE_LAYER',layer:'ALPHA'}).layer).toBe('NORMAL')
    expect(reduce(s,{type:'CONSUME_LAYER'}).layer).toBe('NORMAL')
  })
  it('switches modes while preserving input and clears transient flags',()=>{
    const s=reduce({...initialState,latex:'123',layer:'SHIFT',hyp:true,menu:'mode'},{type:'SET_MODE',mode:'MATRIX'})
    expect(s).toMatchObject({mode:'MATRIX',latex:'123',layer:'NORMAL',hyp:false,menu:null})
  })
  it('keeps input out of the reducer selection model and retains Ans across AC',()=>{
    const s=reduce({...initialState,latex:'2+3'}, {type:'CALCULATE',value:'5'})
    expect(s.answer).toBe('5')
    expect(reduce(s,{type:'CLEAR'})).toMatchObject({latex:'',answer:'5'})
    expect('selection' in s).toBe(false)
  })
  it('ignores operations when off and allows ON',()=>{
    const s=reduce(initialState,{type:'POWER',off:true})
    expect(reduce(s,{type:'TOGGLE_LAYER',layer:'SHIFT'})).toBe(s)
    expect(reduce(s,{type:'SET_MODE',mode:'STAT'})).toBe(s)
    expect(reduce(s,{type:'POWER',off:false}).off).toBe(false)
  })
  it('applies angle/base setup and consumes the layer',()=>{
    expect(reduce({...initialState,menu:'setup'},{type:'SET_ANGLE',angle:'RAD'})).toMatchObject({angle:'RAD',menu:null})
    expect(reduce(initialState,{type:'SET_BASE',base:2}).base).toBe(2)
  })
})
describe('key definitions',()=>{
  const get=(id:string)=>FUNCTION_KEYS.find(k=>k?.id===id)!
  it('resolves inverse trig, alpha variables, and hyperbolic inverse independently',()=>{
    expect(resolveKey(get('sin'),'COMP','SHIFT').label).toBe('sin⁻¹')
    expect(resolveKey(get('sin'),'COMP','ALPHA').label).toBe('D')
    expect(resolveKey(get('sin'),'COMP','SHIFT',true).label).toBe('sinh⁻¹')
  })
  it('changes mode-specific binding commands as well as labels',()=>{
    expect(resolveKey(get('integral'),'MATRIX','NORMAL').command).toMatchObject({kind:'advanced',tool:'det'})
    expect(resolveKey(get('sin'),'BASE-N','NORMAL').label).toBe('AND')
    expect(resolveKey(get('logbase'),'CMPLX','NORMAL').label).toBe('i')
    expect(resolveKey(get('calc'),'EQUATION','NORMAL').label).toBe('f(x)=0')
    expect(resolveKey(get('integral'),'STAT','NORMAL').label).toBe('x̄')
  })
  it('has complete six-column function rows and five-column numeric rows',()=>{
    expect(FUNCTION_KEYS.length%6).toBe(0)
    expect(NUMBER_KEYS.length).toBe(20)
    const all=[...CONTROL_KEYS,...FUNCTION_KEYS.filter(k=>k!==null),...NUMBER_KEYS]
    expect(new Set(all.map(k=>k.id)).size).toBe(all.length)
  })
})
