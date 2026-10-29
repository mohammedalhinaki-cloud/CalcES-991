import { act, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalculatorProvider, expressionVariables, useCalculator } from '../../state/CalculatorProvider'
import type { EditorHandle } from '../../state/CalculatorProvider'
import type { KeyBinding } from '../../components/keypad/keyDefinitions'

vi.mock('../../engagement/rating',()=>({recordSuccessfulCalculation:vi.fn()}))

type Controller=ReturnType<typeof useCalculator>
let controller:Controller
function Probe(){controller=useCalculator();return null}
function mount(){return render(<CalculatorProvider><Probe/></CalculatorProvider>)}
const equals:KeyBinding={label:'=',command:{kind:'equals'}}
const calculate:KeyBinding={label:'CALC',command:{kind:'calculate'}}
const move=(direction:'Left'|'Right'|'Up'|'Down'):KeyBinding=>({label:direction,command:{kind:'move',direction}})

afterEach(()=>{vi.clearAllMocks()})

describe('COMP controller additions',()=>{
  it('finds only calculator variables in valid MathLive expressions',()=>{
    expect(expressionVariables('\\sin\\left(A\\right)+B+\\mathrm{Ans}')).toEqual(['A','B'])
    expect(expressionVariables('2+3')).toEqual([])
  })

  it('opens CALC substitution only for variables, evaluates the unchanged expression, and surfaces invalid values',()=>{
    mount()
    act(()=>controller.edit('A+2'))
    act(()=>controller.press(calculate))
    expect(controller.substitutionVariables).toEqual(['A'])
    expect(controller.state.latex).toBe('A+2')

    let error:string|null|undefined
    act(()=>{error=controller.calculateWithSubstitutions({A:'not-a-number'})})
    expect(error).toBeTruthy()
    expect(controller.state.notice).toBe(error)
    expect(controller.substitutionVariables).toEqual(['A'])

    act(()=>{error=controller.calculateWithSubstitutions({A:'3'})})
    expect(error).toBeNull()
    expect(controller.state).toMatchObject({latex:'A+2',committedValue:'5',answer:'5'})
    expect(controller.state.variables.A).toBe('3')
    expect(controller.history[0]?.snapshot.variables.A).toBe('3')

    act(()=>controller.edit('2+3'))
    act(()=>controller.press(calculate))
    expect(controller.substitutionVariables).toBeNull()
    expect(controller.state.committedValue).toBe('5')
  })

  it('replays previous successful entries after a result while keeping left/right and focused fields as edit movement',()=>{
    mount()
    const editorMoves:string[]=[]
    const replaced:string[]=[]
    const editor:EditorHandle={
      insert:vi.fn(),move:direction=>editorMoves.push(direction),deleteBackward:vi.fn(),clear:vi.fn(),focus:vi.fn(),replace:latex=>replaced.push(latex),
    }
    act(()=>controller.registerEditor(editor))
    act(()=>controller.edit('1'))
    act(()=>controller.press(equals))
    act(()=>controller.edit('2'))
    act(()=>controller.press(equals))
    expect(controller.history).toHaveLength(2)

    act(()=>controller.press(move('Up')))
    expect(controller.state).toMatchObject({latex:'1',committedValue:'1'})
    expect(replaced).toEqual(['1'])

    act(()=>controller.press(move('Right')))
    expect(editorMoves).toEqual(['Right'])

    const fieldMoves:string[]=[]
    const field:EditorHandle={insert:vi.fn(),move:direction=>fieldMoves.push(direction),deleteBackward:vi.fn(),clear:vi.fn(),focus:vi.fn()}
    let unregister:(()=>void)|undefined
    act(()=>{unregister=controller.registerDataTarget(field);controller.press(move('Up'))})
    expect(fieldMoves).toEqual(['Up'])
    expect(controller.state.latex).toBe('1')
    act(()=>unregister?.())
  })
})
