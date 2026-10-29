import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CalculatorProvider, useCalculator } from '../../state/CalculatorProvider'
import { deviceAdvancedRoute, useDeviceController } from '../../components/device/useDeviceController'
import { FUNCTION_KEYS, resolveKey } from '../../components/keypad/keyDefinitions'
import type { KeyBinding } from '../../components/keypad/keyDefinitions'
import type { CalculatorMode, KeyLayer } from '../../state/types'

vi.mock('../../engagement/rating', () => ({ recordSuccessfulCalculation: vi.fn() }))

let device: ReturnType<typeof useDeviceController>
let calculator: ReturnType<typeof useCalculator>

function Probe() {
  device = useDeviceController()
  calculator = useCalculator()
  return <>{device.screen}</>
}

function mount() {
  return render(<CalculatorProvider><Probe /></CalculatorProvider>)
}

const menu = (value: 'mode' | 'setup'): KeyBinding => ({ label: value.toUpperCase(), command: { kind: 'menu', menu: value } })
const digit = (value: string): KeyBinding => ({ label: value, command: { kind: 'insert', latex: value } })
const equals: KeyBinding = { label: '=', command: { kind: 'equals' } }
const calculate: KeyBinding = { label: 'CALC', command: { kind: 'calculate' } }
const advanced = (tool: string): KeyBinding => ({ label: tool, command: { kind: 'advanced', tool } })
const clear: KeyBinding = { label: 'AC', command: { kind: 'clear' } }

describe('hardware device controller', () => {
  it('selects a numbered MODE choice using the original keypad binding', () => {
    mount()
    expect(calculator.state.format).toBe('fraction')
    act(() => device.press(menu('mode')))
    expect(screen.getByRole('button', { name: '2: CMPLX' })).toBeInTheDocument()

    act(() => device.press(digit('2')))
    expect(calculator.state.mode).toBe('CMPLX')
    expect(device.screen).toBeNull()
  })

  it('keeps SETUP as compact numbered original choices, including direct key 4 RAD', () => {
    mount()
    act(() => device.press(menu('setup')))
    act(() => device.press(digit('4')))
    expect(calculator.state.angle).toBe('RAD')
    expect(device.screen).toBeNull()
  })

  it('returns a natural LCD to fractions after AC but preserves a LineIO decimal clear', () => {
    mount()
    act(() => device.press(clear))
    expect(calculator.state.format).toBe('fraction')

    act(() => calculator.dispatch({ type: 'SET_DISPLAY_MODE', displayMode: 'linear' }))
    act(() => device.press(clear))
    expect(calculator.state).toMatchObject({ displayMode: 'linear', format: 'decimal' })
  })

  it('uses CALC to prompt only for actual expression variables and commits through the provider', async () => {
    mount()
    act(() => calculator.edit('A+2'))
    act(() => device.press(calculate))

    await waitFor(() => expect(screen.getByText('A?')).toBeInTheDocument())
    expect(screen.queryByText('B?')).not.toBeInTheDocument()

    act(() => device.press(digit('3')))
    act(() => device.press(equals))
    await waitFor(() => expect(calculator.state).toMatchObject({ latex: 'A+2', committedValue: '5', answer: '5' }))
    expect(calculator.state.variables.A).toBe('3')
  })

  it('classifies every resolved original advanced binding as an LCD route or LCD notice', () => {
    const modes: CalculatorMode[] = ['COMP', 'CMPLX', 'STAT', 'BASE-N', 'EQUATION', 'MATRIX']
    const layers: KeyLayer[] = ['NORMAL', 'SHIFT', 'ALPHA']
    const resolved = modes.flatMap(mode => layers.flatMap(layer => FUNCTION_KEYS.flatMap(definition => {
      if (!definition) return []
      const binding = resolveKey(definition, mode, layer)
      return binding.command.kind === 'advanced' ? [{ mode, tool: binding.command.tool }] : []
    })))

    expect(new Set(resolved.map(binding => binding.tool))).toEqual(new Set(['root', 'integrate', 'derivative', 'sum', 'summary', 'regression', 'det', 'inverse', 'multiply', 'AND', 'OR', 'XOR', 'NOT']))
    for (const binding of resolved) {
      expect(['inline-calculus', 'solve', 'stat', 'matrix', 'base', 'notice']).toContain(deviceAdvancedRoute(binding.mode, binding.tool))
    }
  })

  it('turns an unsupported advanced command into an LCD notice without opening a legacy workspace', () => {
    mount()
    act(() => device.press(advanced('summary')))
    expect(calculator.tool).toBeNull()
    expect(calculator.workspaceOpen).toBe(false)
    expect(calculator.state.notice).toContain('not available')
  })
})
