import {act,render,cleanup} from '@testing-library/react'
import {afterEach,expect,it,vi} from 'vitest'
import {CalculatorProvider,useCalculator} from '../../state/CalculatorProvider'
import {initialState} from '../../state/calculatorReducer'
import {useDeviceController} from '../../components/device/useDeviceController'
import {CONTROL_KEYS,FUNCTION_KEYS,NUMBER_KEYS,resolveKey} from '../../components/keypad/keyDefinitions'
import type {KeyBinding} from '../../components/keypad/keyDefinitions'
import type {CalculatorMode,KeyLayer} from '../../state/types'

vi.mock('../../engagement/rating',()=>({recordSuccessfulCalculation:vi.fn()}))
vi.mock('../../components/display/MathEditor',()=>({default:()=>null}))
afterEach(cleanup)
let device:ReturnType<typeof useDeviceController>
let calculator:ReturnType<typeof useCalculator>
function Probe(){device=useDeviceController();calculator=useCalculator();return <>{device.screen}</>}
const clear:KeyBinding={label:'AC',command:{kind:'clear'}}

it('keeps every physical key binding inside the LCD in all modes, layers and hyperbolic states',()=>{
 render(<CalculatorProvider><Probe/></CalculatorProvider>)
 act(()=>calculator.registerEditor({insert:()=>{},move:()=>{},deleteBackward:()=>{},clear:()=>{},replace:()=>{},focus:()=>{}}))
 const definitions=[...CONTROL_KEYS,...FUNCTION_KEYS.filter(item=>item!==null),...NUMBER_KEYS]
 const modes:CalculatorMode[]=['COMP','CMPLX','STAT','BASE-N','EQUATION','MATRIX']
 const layers:KeyLayer[]=['NORMAL','SHIFT','ALPHA']
 let checked=0
 for(const mode of modes)for(const layer of layers)for(const hyp of [false,true])for(const definition of definitions){
  act(()=>{
   device.press(clear)
   calculator.dispatch({type:'LOAD',snapshot:{...initialState,mode,layer,hyp,latex:'1',answer:'1'}})
  })
  const binding=resolveKey(definition,mode,layer,hyp)
  act(()=>device.press(binding))
  const context=`${mode}/${layer}/hyp=${hyp}/${definition.id}/${binding.label}`
  expect(calculator.workspaceOpen,context).toBe(false)
  expect(calculator.tool,context).toBeNull()
  expect(calculator.state.menu,context).toBeNull()
  checked++
 }
 expect(definitions).toHaveLength(46)
 expect(checked).toBe(modes.length*layers.length*2*definitions.length)
 console.log(`LCD key-routing coverage: ${checked} resolved bindings plus the four REPLAY directions`)
 for(const direction of ['Up','Down','Left','Right'] as const){
  act(()=>{device.press(clear);calculator.dispatch({type:'LOAD',snapshot:{...initialState,latex:'1'}})})
  act(()=>device.press({label:direction,command:{kind:'move',direction}}))
  expect(calculator.workspaceOpen).toBe(false)
  expect(calculator.tool).toBeNull()
 }
})
