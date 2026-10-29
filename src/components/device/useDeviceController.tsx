import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import type { EditorHandle } from '../../state/CalculatorProvider'
import MathEditor from '../display/MathEditor'
import { evaluateScientific } from '../../engine/evaluate'
import type { KeyBinding } from '../keypad/keyDefinitions'
import type { CalculatorMode, NumericBase } from '../../state/types'
import type { VariableName, Variables } from '../../engine/evaluate'
import { DEVICE_CALCULUS_TEMPLATES, containsInlineCalculus } from '../../engine/inlineCalculus'

type StatOperation = 'summary' | 'regression'
type MatrixOperation = 'det' | 'inverse' | 'multiply'
type BaseOperation = 'convert' | 'AND' | 'OR' | 'XOR' | 'NOT'
type ChoiceId = 'mode' | 'setup' | 'display' | 'angle' | 'norm' | 'stat' | 'equation' | 'matrix' | 'base'
export type DeviceAdvancedRoute = 'inline-calculus' | 'solve' | 'stat' | 'matrix' | 'base' | 'notice'

type InputTask =
  | { kind: 'calc'; names: VariableName[] }
  | { kind: 'solve' }
  | { kind: 'setup-fix' | 'setup-sci' }
  | { kind: 'stat-count'; operation: StatOperation }
  | { kind: 'stat-data'; operation: StatOperation; count: number }
  | { kind: 'equation-poly-degree' }
  | { kind: 'equation-poly'; degree: 2 | 3 }
  | { kind: 'equation-linear-size' }
  | { kind: 'equation-linear'; size: 2 | 3 }
  | { kind: 'matrix-size'; operation: MatrixOperation }
  | { kind: 'matrix'; operation: MatrixOperation; size: 2 | 3 }
  | { kind: 'base'; operation: BaseOperation; base: NumericBase }

type Prompt =
  | { kind: 'choices'; id: ChoiceId; title: string; subtitle?: string; choices: string[]; selected: number }
  | { kind: 'input'; title: string; subtitle?: string; labels: string[]; values: string[]; index: number; task: InputTask }

const choiceDefinitions: Record<ChoiceId, Omit<Extract<Prompt, { kind: 'choices' }>, 'kind' | 'id' | 'selected'>> = {
  mode: { title: 'MODE', choices: ['COMP', 'CMPLX', 'STAT', 'BASE-N', 'EQN', 'MATRIX'] },
  // Original compact 991ES order: direct display and angle choices precede
  // the settings that need a follow-up prompt.
  setup: { title: 'SETUP', choices: ['MthIO', 'LineIO', 'Deg', 'Rad', 'Gra', 'Fix', 'Sci', 'Norm'] },
  display: { title: 'Display', choices: ['MathI/O', 'LineI/O'] },
  angle: { title: 'Angle Unit', choices: ['Deg', 'Rad', 'Gra'] },
  norm: { title: 'Norm', choices: ['Norm 1', 'Norm 2'] },
  stat: { title: 'STAT', choices: ['1-VAR', 'A+BX'] },
  equation: { title: 'EQN', choices: ['Polynomial', 'Simultaneous'] },
  matrix: { title: 'MATRIX', choices: ['det(A)', 'A⁻¹', 'A×B'] },
  base: { title: 'BASE-N', choices: ['Convert', 'AND', 'OR', 'XOR', 'NOT'] },
}

function choicePrompt(id: ChoiceId): Extract<Prompt, { kind: 'choices' }> {
  return { kind: 'choices', id, ...choiceDefinitions[id], selected: 0 }
}

function inputPrompt(task: InputTask, title: string, labels: string[], subtitle?: string, initial: string[] = []): Extract<Prompt, { kind: 'input' }> {
  return { kind: 'input', task, title, subtitle, labels, values: labels.map((_, index) => initial[index] ?? ''), index: 0 }
}

function inputCharacter(binding: KeyBinding): string | null {
  if (binding.command.kind !== 'insert') return null
  const latex = binding.command.latex
  if (/^[0-9]$/.test(latex) || latex === '.' || latex === '-') return latex
  if (/^[A-Fa-f]$/.test(latex)) return latex.toUpperCase()
  if (latex === '\\times ') return '×'
  if (latex === '\\div ') return '÷'
  return null
}

function keyboardBinding(event: KeyboardEvent): KeyBinding | null {
  if(event.ctrlKey || event.metaKey || event.altKey) return null
  const operations:Record<string,string>={'+':'+','*':'\\times ','/':'\\div ','(':'(',')':')','^':'^{#?}','!':'!','%':'\\%'}
  if(operations[event.key]) return {label:event.key,command:{kind:'insert',latex:operations[event.key]!}}
  if (/^[0-9]$/.test(event.key) || event.key === '.' || event.key === '-') return { label: event.key, command: { kind: 'insert', latex: event.key } }
  if (/^[a-fA-F]$/.test(event.key)) return { label: event.key.toUpperCase(), command: { kind: 'insert', latex: event.key.toUpperCase() } }
  if (event.key === 'Enter' || event.key === '=') return { label: '=', command: { kind: 'equals' } }
  if (event.key === 'Backspace') return { label: 'DEL', command: { kind: 'delete' } }
  if (event.key === 'Escape') return { label: 'AC', command: { kind: 'clear' } }
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    return { label: event.key, command: { kind: 'move', direction: event.key.slice(5) as 'Up' | 'Down' | 'Left' | 'Right' } }
  }
  return null
}

function matrixLabels(prefix: string, size: number): string[] {
  return Array.from({ length: size * size }, (_, index) => `${prefix}${Math.floor(index / size) + 1}${(index % size) + 1}`)
}

function resultRows(result: { lines: Array<{ label: string; value: string }>; matrix?: string[][] }): string[] {
  const rows = result.lines.map(line => `${line.label}: ${line.value}`)
  if (result.matrix) rows.push(...result.matrix.map(row => `[ ${row.join(' , ')} ]`))
  return rows.length ? rows : ['Done']
}

/**
 * Classifies every `advanced` keypad command before the shared provider can
 * reach its legacy workspace-opening branch. `notice` remains LCD-only.
 */
export function deviceAdvancedRoute(mode: CalculatorMode, tool: string): DeviceAdvancedRoute {
  if (tool === 'root') return 'solve'
  if (mode === 'COMP' && (tool === 'integrate' || tool === 'derivative' || tool === 'sum')) return 'inline-calculus'
  if (mode === 'STAT' && (tool === 'summary' || tool === 'regression')) return 'stat'
  if (mode === 'MATRIX' && (tool === 'det' || tool === 'inverse' || tool === 'multiply')) return 'matrix'
  if (mode === 'BASE-N' && (tool === 'AND' || tool === 'OR' || tool === 'XOR' || tool === 'NOT')) return 'base'
  return 'notice'
}

/**
 * Routes original keypad bindings to the compact 991ES-style LCD interaction.
 * The shell renders `screen` in its LCD and keeps MathLive mounted underneath it.
 */
export function useDeviceController(): { press: (binding: KeyBinding) => void; screen: ReactNode | null } {
  const {
    state,
    dispatch,
    press: providerPress,
    setMode,
    setTool,
    setWorkspaceOpen,
    ensureDeviceDefaults,
    restoreDeviceNaturalAfterClear,
    advanced,
    runAdvanced,
    substitutionVariables,
    calculateWithSubstitutions,
    closeSubstitution,
  } = useCalculator()
  const [prompt, setPrompt] = useState<Prompt | null>(null)
  const [resultRow, setResultRow] = useState(0)
  const inputEditor = useRef<EditorHandle | null>(null)
  const currentPrompt = useRef(prompt)
  currentPrompt.current = prompt
  const registerInputEditor = useCallback((handle:EditorHandle|null) => {
    inputEditor.current = handle
    const current = currentPrompt.current
    if(handle && current?.kind === 'input') {handle.replace?.(current.values[current.index] ?? '');handle.focus()}
  },[])
  const editInput = useCallback((latex:string) => {
    dispatch({type:'NOTICE',notice:''})
    setPrompt(current => {
      if(current?.kind !== 'input') return current
      const values = [...current.values]
      values[current.index] = latex
      return {...current,values}
    })
  },[dispatch])

  // Entering the hardware interface deliberately abandons an unfinished legacy
  // workspace, while shared expression/result/history state remains untouched.
  useEffect(() => {
    ensureDeviceDefaults()
    setTool(null)
    setWorkspaceOpen(false)
    dispatch({ type: 'CLOSE_MENU' })
    closeSubstitution()
  }, [closeSubstitution, dispatch, ensureDeviceDefaults, setTool, setWorkspaceOpen])

  const openChoices = useCallback((id: ChoiceId) => setPrompt(choicePrompt(id)), [])
  const openInput = useCallback((task: InputTask, title: string, labels: string[], subtitle?: string, initial?: string[]) => {
    setPrompt(inputPrompt(task, title, labels, subtitle, initial))
  }, [])

  const openModeWizard = useCallback((mode = state.mode) => {
    setTool(null)
    setWorkspaceOpen(false)
    if (mode === 'STAT') openChoices('stat')
    else if (mode === 'EQUATION') openChoices('equation')
    else if (mode === 'MATRIX') openChoices('matrix')
    else if (mode === 'BASE-N') openChoices('base')
  }, [openChoices, setTool, setWorkspaceOpen, state.mode])

  const submitInput = useCallback((current: Extract<Prompt, { kind: 'input' }>, values: string[]) => {
    const { task } = current
    switch (task.kind) {
      case 'calc': {
        const substitutions = Object.fromEntries(task.names.map((name, index) => [name, values[index] ?? ''])) as Partial<Variables>
        const error = calculateWithSubstitutions(substitutions)
        if (error) openInput(task, current.title, current.labels, current.subtitle, values)
        return
      }
      case 'solve':
        runAdvanced({ kind: 'root', latex: state.latex, lower: values[0]!, upper: values[1]!, angle: state.angle })
        return
      case 'setup-fix': {
        const digits = Number(values[0])
        if (!Number.isInteger(digits) || digits < 0 || digits > 9) {
          dispatch({ type: 'NOTICE', notice: 'Fix: enter 0–9' })
          openInput(task, current.title, current.labels, current.subtitle, values)
          return
        }
        dispatch({ type: 'SET_NOTATION', notation: 'fix', digits })
        return
      }
      case 'setup-sci': {
        const digits = Number(values[0])
        if (!Number.isInteger(digits) || digits < 0 || digits > 9) {
          dispatch({ type: 'NOTICE', notice: 'Sci: enter 0–9' })
          openInput(task, current.title, current.labels, current.subtitle, values)
          return
        }
        dispatch({ type: 'SET_NOTATION', notation: 'sci', digits })
        return
      }
      case 'stat-count': {
        const count = Number(values[0])
        if (!Number.isInteger(count) || count < 1 || count > 100) {
          dispatch({ type: 'NOTICE', notice: 'Enter n from 1 to 100' })
          openInput(task, current.title, current.labels, current.subtitle, values)
          return
        }
        const labels = task.operation === 'summary'
          ? Array.from({ length: count }, (_, index) => `x${index + 1}`)
          : Array.from({ length: count }, (_, index) => [`x${index + 1}`, `y${index + 1}`]).flat()
        openInput({ kind: 'stat-data', operation: task.operation, count }, task.operation === 'summary' ? '1-VAR data' : 'A+BX data', labels, 'Press = after every value')
        return
      }
      case 'stat-data': {
        const data = task.operation === 'summary'
          ? values.join(' ')
          : Array.from({ length: task.count }, (_, index) => `${values[index * 2]},${values[index * 2 + 1]}`).join('\n')
        runAdvanced({ kind: 'statistics', operation: task.operation, data })
        return
      }
      case 'equation-poly-degree': {
        const degree = Number(values[0])
        if (degree !== 2 && degree !== 3) {
          dispatch({ type: 'NOTICE', notice: 'Polynomial degree: 2 or 3' })
          openInput(task, current.title, current.labels, current.subtitle, values)
          return
        }
        openInput({ kind: 'equation-poly', degree }, `Polynomial degree ${degree}`, Array.from({ length: degree + 1 }, (_, index) => `a${degree - index}`), 'Leading coefficient first')
        return
      }
      case 'equation-poly':
        runAdvanced({ kind: 'polynomial', coefficients: values })
        return
      case 'equation-linear-size': {
        const size = Number(values[0])
        if (size !== 2 && size !== 3) {
          dispatch({ type: 'NOTICE', notice: 'Unknowns: 2 or 3' })
          openInput(task, current.title, current.labels, current.subtitle, values)
          return
        }
        const labels = Array.from({ length: size }, (_, row) => [
          ...Array.from({ length: size }, (_, column) => `a${row + 1}${column + 1}`),
          `b${row + 1}`,
        ]).flat()
        openInput({ kind: 'equation-linear', size }, `${size} equations`, labels, 'Enter each equation row, then its result')
        return
      }
      case 'equation-linear': {
        const a = Array.from({ length: task.size }, (_, row) => values.slice(row * (task.size + 1), row * (task.size + 1) + task.size))
        const b = Array.from({ length: task.size }, (_, row) => values[row * (task.size + 1) + task.size]!)
        runAdvanced({ kind: 'linear', a, b })
        return
      }
      case 'matrix-size': {
        const size = Number(values[0])
        if (size !== 2 && size !== 3) {
          dispatch({ type: 'NOTICE', notice: 'Matrix size: 2 or 3' })
          openInput(task, current.title, current.labels, current.subtitle, values)
          return
        }
        const labels = [...matrixLabels('A', size), ...(task.operation === 'multiply' ? matrixLabels('B', size) : [])]
        openInput({ kind: 'matrix', operation: task.operation, size }, `${task.operation} · ${size}×${size}`, labels, 'Press = after every cell')
        return
      }
      case 'matrix': {
        const a = Array.from({ length: task.size }, (_, row) => values.slice(row * task.size, (row + 1) * task.size))
        const b = task.operation === 'multiply'
          ? Array.from({ length: task.size }, (_, row) => values.slice(task.size * task.size + row * task.size, task.size * task.size + (row + 1) * task.size))
          : []
        runAdvanced({ kind: 'matrix', operation: task.operation, a, b })
        return
      }
      case 'base':
        runAdvanced({ kind: 'base', operation: task.operation, a: values[0]!, b: values[1] ?? '', base: task.base })
        return
    }
  }, [calculateWithSubstitutions, dispatch, openInput, runAdvanced, state.angle, state.latex])

  const submitCurrentInput = useCallback(() => {
    if (!prompt || prompt.kind !== 'input') return
    const value = prompt.values[prompt.index]?.trim() ?? ''
    if (!value) {
      dispatch({ type: 'NOTICE', notice: `${prompt.labels[prompt.index]}?` })
      return
    }
    const values = [...prompt.values]
    try {
      if(prompt.task.kind === 'base') values[prompt.index] = value.replace(/\s+/g,'').toUpperCase()
      else {
        if(containsInlineCalculus(value)) throw new Error('استخدم شاشة COMP لإجراء حساب التفاضل والتكامل')
        values[prompt.index] = evaluateScientific(value,{angle:state.angle,variables:state.variables,answer:state.answer}).toString()
      }
    } catch(error) {
      dispatch({type:'NOTICE',notice:error instanceof Error?error.message:'Math ERROR'})
      return
    }
    if (prompt.index < prompt.labels.length - 1) {
      setPrompt({ ...prompt, values, index: prompt.index + 1 })
      return
    }
    setPrompt(null)
    submitInput(prompt, values)
  }, [dispatch, prompt, state.angle, state.variables, state.answer, submitInput])

  const choose = useCallback((index: number) => {
    if (!prompt || prompt.kind !== 'choices') return
    dispatch({type:'NOTICE',notice:''})
    switch (prompt.id) {
      case 'mode': {
        const mode = ['COMP', 'CMPLX', 'STAT', 'BASE-N', 'EQUATION', 'MATRIX'][index] as typeof state.mode
        setTool(null)
        setMode(mode)
        setWorkspaceOpen(false)
        if(mode === 'STAT') setPrompt(choicePrompt('stat'))
        else if(mode === 'EQUATION') setPrompt(choicePrompt('equation'))
        else if(mode === 'MATRIX') setPrompt(choicePrompt('matrix'))
        else if(mode === 'BASE-N') setPrompt(choicePrompt('base'))
        else setPrompt(null)
        return
      }
      case 'setup':
        if (index === 0) { dispatch({ type: 'SET_DISPLAY_MODE', displayMode: 'natural' }); setPrompt(null) }
        else if (index === 1) { dispatch({ type: 'SET_DISPLAY_MODE', displayMode: 'linear' }); setPrompt(null) }
        else if (index === 2) { dispatch({ type: 'SET_ANGLE', angle: 'DEG' }); setPrompt(null) }
        else if (index === 3) { dispatch({ type: 'SET_ANGLE', angle: 'RAD' }); setPrompt(null) }
        else if (index === 4) { dispatch({ type: 'SET_ANGLE', angle: 'GRA' }); setPrompt(null) }
        else if (index === 5) openInput({ kind: 'setup-fix' }, 'Fix', ['Digits'], '0–9')
        else if (index === 6) openInput({ kind: 'setup-sci' }, 'Sci', ['Digits'], '0–9')
        else openChoices('norm')
        return
      case 'display':
        dispatch({ type: 'SET_DISPLAY_MODE', displayMode: index === 0 ? 'natural' : 'linear' })
        setPrompt(null)
        return
      case 'angle':
        dispatch({ type: 'SET_ANGLE', angle: (['DEG', 'RAD', 'GRA'][index] ?? 'DEG') as 'DEG' | 'RAD' | 'GRA' })
        setPrompt(null)
        return
      case 'norm':
        dispatch({ type: 'SET_NOTATION', notation: 'norm', digits: index === 0 ? 10 : 9 })
        setPrompt(null)
        return
      case 'stat':
        openInput({ kind: 'stat-count', operation: index === 0 ? 'summary' : 'regression' }, index === 0 ? '1-VAR' : 'A+BX', ['n'], 'Number of data rows')
        return
      case 'equation':
        if (index === 0) openInput({ kind: 'equation-poly-degree' }, 'Polynomial', ['Degree'], '2 or 3')
        else openInput({ kind: 'equation-linear-size' }, 'Simultaneous', ['Unknowns'], '2 or 3')
        return
      case 'matrix':
        openInput({ kind: 'matrix-size', operation: (['det', 'inverse', 'multiply'][index] ?? 'det') as MatrixOperation }, prompt.choices[index]!, ['Size'], '2 or 3')
        return
      case 'base': {
        const operation = (['convert', 'AND', 'OR', 'XOR', 'NOT'][index] ?? 'convert') as BaseOperation
        const labels = operation === 'convert' || operation === 'NOT' ? ['A'] : ['A', 'B']
        openInput({ kind: 'base', operation, base: state.base }, `${state.base}-BASE ${operation}`, labels, operation === 'convert' ? 'Enter one signed 32-bit number' : 'Enter operands')
        return
      }
    }
  }, [dispatch, openChoices, openInput, prompt, setMode, setTool, setWorkspaceOpen, state.base, state.mode])

  // Provider CALC determines exactly which actual variables occur in the expression.
  useEffect(() => {
    if (!substitutionVariables?.length || prompt) return
    openInput({ kind: 'calc', names: substitutionVariables }, 'CALC', substitutionVariables, 'Press = after every value')
  }, [openInput, prompt, substitutionVariables])

  useEffect(() => {
    if (advanced.state.status === 'success') setResultRow(0)
  }, [advanced.state])

  const press = useCallback((binding: KeyBinding) => {
    const command = binding.command
    if (command.kind === 'on') {
      setPrompt(null)
      advanced.cancel()
      providerPress(binding)
      return
    }
    if (state.off) return
    if (command.kind === 'off') {
      setPrompt(null)
      advanced.cancel()
      closeSubstitution()
      providerPress(binding)
      return
    }
    if (command.kind === 'clear') {
      setPrompt(null)
      advanced.cancel()
      closeSubstitution()
      providerPress(binding)
      restoreDeviceNaturalAfterClear()
      return
    }
    if (advanced.state.status === 'running') return
    if(command.kind === 'layer' || command.kind === 'hyp') {
      providerPress(binding)
      return
    }
    if (advanced.state.status === 'error' || (advanced.state.status === 'success' && advanced.state.result.scalar === undefined)) {
      if (advanced.state.status === 'success' && command.kind === 'move' && (command.direction === 'Up' || command.direction === 'Down')) {
        const rows = resultRows(advanced.state.result)
        setResultRow(current => (current + (command.direction === 'Up' ? -1 : 1) + rows.length) % rows.length)
        return
      }
      advanced.cancel()
    }
    if (command.kind === 'menu') {
      setPrompt(choicePrompt(command.menu === 'mode' ? 'mode' : 'setup'))
      return
    }
    if (prompt?.kind === 'choices') {
      const digit = inputCharacter(binding)
      if (digit && /^[1-9]$/.test(digit)) {
        const index = Number(digit) - 1
        if (index < prompt.choices.length) choose(index)
        else dispatch({ type: 'NOTICE', notice: 'Choose a displayed number' })
        return
      }
      if (command.kind === 'move' && (command.direction === 'Up' || command.direction === 'Down')) {
        setPrompt({ ...prompt, selected: (prompt.selected + (command.direction === 'Up' ? -1 : 1) + prompt.choices.length) % prompt.choices.length })
        return
      }
      if (command.kind === 'equals') {
        choose(prompt.selected)
        return
      }
      return
    }
    if (prompt?.kind === 'input') {
      const character = inputCharacter(binding)
      if (command.kind === 'insert' && inputEditor.current) {
        inputEditor.current.insert(command.latex)
        dispatch({type:'CONSUME_LAYER'})
        return
      }
      if (character) {
        const values = [...prompt.values]
        values[prompt.index] = `${values[prompt.index] ?? ''}${character}`
        setPrompt({ ...prompt, values })
        dispatch({type:'CONSUME_LAYER'})
        return
      }
      if (command.kind === 'answer' && state.answer !== null) {
        if(inputEditor.current) {inputEditor.current.insert('\\mathrm{Ans}');return}
        const values = [...prompt.values]
        values[prompt.index] = `${values[prompt.index] ?? ''}${state.answer}`
        setPrompt({ ...prompt, values })
        return
      }
      if (command.kind === 'delete') {
        if(inputEditor.current) {inputEditor.current.deleteBackward();return}
        const values = [...prompt.values]
        values[prompt.index] = (values[prompt.index] ?? '').slice(0, -1)
        setPrompt({ ...prompt, values })
        return
      }
      if(command.kind === 'move') {inputEditor.current?.move(command.direction);return}
      if (command.kind === 'equals' || command.kind === 'calculate') {
        submitCurrentInput()
        return
      }
      return
    }
    if (command.kind === 'advanced') {
      switch (deviceAdvancedRoute(state.mode, command.tool)) {
        case 'inline-calculus':
          providerPress({ ...binding, command: { kind: 'insert', latex: DEVICE_CALCULUS_TEMPLATES[command.tool as keyof typeof DEVICE_CALCULUS_TEMPLATES] } })
          return
        case 'solve':
          openInput({ kind: 'solve' }, 'SOLVE', ['Lower', 'Upper'], 'Solve f(x)=0 in an interval')
          return
        case 'stat':
          openInput({ kind: 'stat-count', operation: command.tool === 'regression' ? 'regression' : 'summary' }, command.tool === 'regression' ? 'A+BX' : '1-VAR', ['n'], 'Number of data rows')
          return
        case 'matrix': {
          const operation = command.tool === 'inverse' ? 'inverse' : command.tool === 'multiply' ? 'multiply' : 'det'
          openInput({ kind: 'matrix-size', operation }, binding.label, ['Size'], '2 or 3')
          return
        }
        case 'base': {
          const operation = command.tool as Exclude<BaseOperation, 'convert'>
          openInput({ kind: 'base', operation, base: state.base }, `${state.base}-BASE ${operation}`, operation === 'NOT' ? ['A'] : ['A', 'B'])
          return
        }
        case 'notice':
          dispatch({ type: 'NOTICE', notice: `${binding.label}: not available in ${state.mode}` })
          return
      }
    }
    if (command.kind === 'calculate') {
      if (state.mode === 'COMP') {
        providerPress(binding)
        return
      }
      if (state.mode === 'CMPLX') {
        runAdvanced({ kind: 'complex', latex: state.latex, angle: state.angle })
        return
      }
      openModeWizard()
      return
    }
    if (command.kind === 'equals') {
      if (state.mode === 'COMP' && containsInlineCalculus(state.latex)) {
        runAdvanced({ kind: 'scientific', latex: state.latex, angle: state.angle, variables: state.variables, answer: state.answer })
        return
      }
      if (state.mode === 'CMPLX') {
        runAdvanced({ kind: 'complex', latex: state.latex, angle: state.angle })
        return
      }
      if (state.mode !== 'COMP') {
        openModeWizard()
        return
      }
    }
    providerPress(binding)
  }, [advanced, choose, closeSubstitution, dispatch, openInput, openModeWizard, prompt, providerPress, restoreDeviceNaturalAfterClear, runAdvanced, state, submitCurrentInput])

  const hasAdvancedOverlay = advanced.state.status === 'running' || advanced.state.status === 'error' || (advanced.state.status === 'success' && advanced.state.result.scalar === undefined)
  const capturesKeyboard = state.off || prompt !== null || hasAdvancedOverlay
  useEffect(() => {
    if (!capturesKeyboard) return
    const onKeyDown = (event: KeyboardEvent) => {
      const binding = keyboardBinding(event)
      if (!binding) {
        if(event.key==='Tab') return
        const inPromptEditor=event.composedPath().some(node=>node instanceof HTMLElement&&node.classList.contains('device-input-value'))
        if(prompt?.kind==='input'&&inPromptEditor&&!state.off) return
        event.preventDefault()
        event.stopPropagation()
        return
      }
      event.preventDefault()
      event.stopPropagation()
      press(binding)
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [capturesKeyboard, press, prompt, state.off])

  const screen = useMemo<ReactNode | null>(() => {
    if (state.off) return <div className="device-prompt device-off-screen" aria-live="polite">OFF</div>
    if (prompt?.kind === 'choices') {
      return <section className="device-menu" aria-label={prompt.title}>
        <p className="device-screen-title">{prompt.title}</p>
        {prompt.subtitle && <p className="device-screen-subtitle">{prompt.subtitle}</p>}
        <ol>{prompt.choices.map((choice, index) => <li key={choice}><button type="button" aria-pressed={prompt.selected === index} onClick={() => choose(index)}>{index + 1}: {choice}</button></li>)}</ol>
        <p className="device-screen-hint">Number, ↑↓, = · AC cancel</p>
      </section>
    }
    if (prompt?.kind === 'input') {
      const label = prompt.labels[prompt.index] ?? ''
      return <section className="device-prompt" aria-label={prompt.title}>
        <p className="device-screen-title">{prompt.title}</p>
        {prompt.subtitle && <p className="device-screen-subtitle">{prompt.subtitle}</p>}
        <p className="device-question">{label}?</p>
        <div className="device-input-value"><MathEditor key={`${prompt.title}:${prompt.index}`} onChange={editInput} onReady={registerInputEditor} off={false} onEditIntent={()=>{}} /></div>
        <p className="device-screen-progress">{prompt.index + 1}/{prompt.labels.length} · = next</p>
      </section>
    }
    if (advanced.state.status === 'running') return <div className="device-prompt" role="status">Calculating…</div>
    if (advanced.state.status === 'error') return <div className="device-prompt device-error" role="alert"><p>Math ERROR</p><p>{advanced.state.error}</p><small>AC to return</small></div>
    if (advanced.state.status === 'success' && advanced.state.result.scalar === undefined) {
      const rows = resultRows(advanced.state.result)
      return <section className="device-results" aria-label={advanced.state.result.title}>
        <p className="device-screen-title">{advanced.state.result.title}</p>
        <output aria-live="polite">{rows[resultRow % rows.length]}</output>
        <p className="device-screen-progress">{resultRow + 1}/{rows.length} · ↑↓ replay rows</p>
        {advanced.state.result.note && <small>{advanced.state.result.note}</small>}
      </section>
    }
    return null
  }, [advanced.state, choose, editInput, prompt, registerInputEditor, resultRow, state.off])

  return { press, screen }
}
