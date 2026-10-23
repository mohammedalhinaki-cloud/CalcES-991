import { evaluateExpression, formatResult, math } from './calculatorEngine.js'

export const initialState = {
  expression: '', cursor: 0, result: null, answer: math.bignumber(0),
  shift: false, alpha: false, hyp: false, angle: 'DEG', display: 'decimal',
  variables: Object.fromEntries('ABCDEFMXY'.split('').map((name) => [name, math.bignumber(0)])),
  pending: null, menu: false, error: '', status: '', off: false, evaluated: false, engineering: null,
}
const INSERTS = { 'a b/c': '/', '√': 'sqrt(', 'x²': '^2', 'xʸ': '^', log: 'log10(', ln: 'log(', sin: 'sin(', cos: 'cos(', tan: 'tan(', 'x⁻¹': '^(-1)', '(−)': '−', '(': '(', ')': ')', 'π': 'π', '×10ˣ': '×10^', Ans: 'Ans' }
const SHIFT_INSERTS = { 'a b/c': '/', '√': 'cbrt(', 'x²': '^3', 'xʸ': '^(1/', log: '10^(', ln: 'exp(', sin: 'asin(', cos: 'acos(', tan: 'atan(', 'x⁻¹': '!', 'π': 'e', '×10ˣ': 'π' }
const ALPHA = { '(−)': 'A', '°′″': 'B', hyp: 'C', '(': 'D', ')': 'E', RCL: 'F', 'M+': 'M', 'π': 'X', Ans: 'Y' }
function insert(state, text) {
  const continueAnswer = state.evaluated && /^[+−×÷^!]/.test(text)
  const expression = state.evaluated ? (continueAnswer ? 'Ans' : '') : state.expression
  const cursor = state.evaluated ? expression.length : state.cursor
  return { ...state, expression: expression.slice(0, cursor) + text + expression.slice(cursor), cursor: cursor + text.length, result: null, evaluated: false, error: '', status: '', shift: false, alpha: false, engineering: null }
}
function valueOf(state) {
  return state.evaluated ? state.result : evaluateExpression(state.expression || '0', { angle: state.angle, answer: state.answer, variables: state.variables })
}
export function calculatorReducer(state, action) {
  if (action.type !== 'KEY') return state
  const key = action.key
  if (state.off) return key === 'AC' ? { ...state, off: false } : state
  if (key === 'AC') return { ...initialState, angle: state.angle, answer: state.answer, variables: state.variables, off: state.shift }
  if (key === 'SHIFT') return { ...state, shift: !state.shift, alpha: false, error: '' }
  if (key === 'ALPHA') return { ...state, alpha: !state.alpha, shift: false, error: '' }
  if (state.menu) {
    const angle = { '1': 'DEG', '2': 'RAD', '3': 'GRA' }[key]
    return angle ? { ...state, angle, menu: false, status: '' } : { ...state, menu: false, status: '' }
  }
  if (key === 'MODE') return { ...state, menu: true, shift: false, alpha: false, status: '1: DEG   2: RAD   3: GRA · COMP' }
  try {
    if (state.pending) {
      const variable = ALPHA[key]
      if (!variable) return { ...state, pending: null, status: 'اختر متغيرًا من الحروف الحمراء' }
      if (state.pending === 'store') return { ...state, variables: { ...state.variables, [variable]: valueOf(state) }, pending: null, status: `STO ${variable}`, shift: false, alpha: false }
      return insert({ ...state, pending: null }, variable)
    }
    if (state.alpha && ALPHA[key]) return insert(state, ALPHA[key])
    if (state.alpha) return { ...state, alpha: false, status: 'لا توجد وظيفة ALPHA لهذا الزر' }
    if (key === 'RCL') return { ...state, pending: state.shift ? 'store' : 'recall', shift: false, status: state.shift ? 'STO: اختر المتغير' : 'RCL: اختر المتغير' }
    if (key === 'hyp') return { ...state, hyp: !state.hyp, shift: false }
    if (['sin', 'cos', 'tan'].includes(key) && state.hyp) return insert({ ...state, hyp: false }, `${state.shift ? 'a' : ''}${key}h(`)
    if (key === '◀' || key === '▶') return { ...state, cursor: Math.max(0, Math.min(state.expression.length, state.cursor + (key === '◀' ? -1 : 1))), evaluated: false, shift: false, error: '' }
    if (key === 'DEL') {
      if (state.shift) return { ...state, shift: false, status: 'الإدراج مفعل عند موضع المؤشر' }
      return { ...state, expression: state.expression.slice(0, Math.max(0, state.cursor - 1)) + state.expression.slice(state.cursor), cursor: Math.max(0, state.cursor - 1), result: null, evaluated: false, error: '' }
    }
    if (key === '=') {
      if (!state.expression) return state
      const result = evaluateExpression(state.expression, { angle: state.angle, answer: state.answer, variables: state.variables })
      return { ...state, result, answer: result, evaluated: true, error: '', status: '', shift: false, alpha: false, engineering: null }
    }
    if (key === 'S⇔D') return { ...state, display: state.display === 'decimal' ? 'fraction' : 'decimal', shift: false }
    if (key === 'M+') {
      const value = valueOf(state)
      return { ...state, variables: { ...state.variables, M: math[state.shift ? 'subtract' : 'add'](state.variables.M, value) }, shift: false, status: state.shift ? 'M−' : 'M+' }
    }
    if (key === 'ENG') return { ...state, engineering: (state.engineering ?? 0) + (state.shift ? -3 : 3), shift: false }
    if (key === '°′″') return state.evaluated ? { ...state, display: state.display === 'dms' ? 'decimal' : 'dms', shift: false } : insert(state, '°')
    if (state.shift && key === '.') {
      if (typeof action.random !== 'string') throw new Error('Math ERROR')
      return insert(state, action.random)
    }
    return insert(state, (state.shift ? SHIFT_INSERTS[key] : null) ?? INSERTS[key] ?? key)
  } catch (error) {
    return { ...state, error: error.message === 'Syntax ERROR' || /Unexpected|Parenthesis|Value expected/.test(error.message) ? 'Syntax ERROR' : 'Math ERROR', shift: false, alpha: false }
  }
}
export function resultText(state) {
  try { return state.error || (state.result === null ? '0' : formatResult(state.result, state.display, state.engineering)) }
  catch { return 'Math ERROR' }
}
