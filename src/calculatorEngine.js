import { all, create } from 'mathjs'

// Decimal arithmetic avoids binary floating point errors such as 0.1 + 0.2.
export const math = create(all, { number: 'BigNumber', precision: 64 })
const FUNCTIONS = new Set(['sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sinh', 'cosh', 'tanh', 'asinh', 'acosh', 'atanh', 'sqrt', 'cbrt', 'log', 'log10', 'exp', 'abs', 'nthRoot', 'factorial'])
export function normalizeExpression(value) {
  return value.replace(/(\d+(?:\.\d+)?)°(?:(\d+(?:\.\d+)?)°)?(?:(\d+(?:\.\d+)?)°)?/g, (_, d, m = '0', s = '0') => `(${d}+${m}/60+${s}/3600)`).replaceAll('×', '*').replaceAll('÷', '/').replaceAll('−', '-').replaceAll('π', 'pi').replaceAll('√', 'sqrt').replaceAll('Ans', 'ans')
}

export function evaluateExpression(value, { angle = 'DEG', answer = math.bignumber(0), variables = {} } = {}) {
  if (!value || value.length > 500) throw new Error('Syntax ERROR')
  const node = math.parse(normalizeExpression(value))
  // Accept arithmetic only: no assignment, object access, imports, or arbitrary calls.
  node.traverse((child) => {
    if (!['OperatorNode', 'ConstantNode', 'ParenthesisNode', 'SymbolNode', 'FunctionNode'].includes(child.type)) throw new Error('Syntax ERROR')
    if (child.isFunctionNode && !FUNCTIONS.has(child.fn.name)) throw new Error('Syntax ERROR')
    if (child.isSymbolNode && !FUNCTIONS.has(child.name) && !['pi', 'e', 'ans', ...Object.keys(variables)].includes(child.name)) throw new Error('Syntax ERROR')
    if (child.isOperatorNode && !['+', '-', '*', '/', '^', '!'].includes(child.op)) throw new Error('Syntax ERROR')
    if (child.isOperatorNode && child.op === '^' && child.args[1].isConstantNode && Math.abs(Number(child.args[1].value)) > 10000) throw new Error('Math ERROR')
  })
  const scale = angle === 'RAD' ? math.bignumber(1) : math.divide(math.pi, angle === 'GRA' ? 200 : 180)
  const scope = { ...variables, ans: answer }
  for (const name of ['sin', 'cos', 'tan']) scope[name] = (x) => {
    const radians = math.multiply(x, scale)
    if (name === 'tan' && math.abs(math.cos(radians)).lt('1e-30')) throw new Error('Math ERROR')
    return math[name](radians)
  }
  for (const name of ['asin', 'acos', 'atan']) scope[name] = (x) => math.divide(math[name](x), scale)
  const result = node.evaluate(scope)
  if (!math.isBigNumber(result) || !result.isFinite() || result.abs().gt('1e10000')) throw new Error('Math ERROR')
  return result
}

export function formatResult(result, display = 'decimal', engineering = null) {
  if (result == null) return ''
  if (display === 'dms') {
    const absolute = result.abs()
    const degrees = math.floor(absolute)
    const minutesRaw = math.multiply(math.subtract(absolute, degrees), 60)
    const minutes = math.floor(minutesRaw)
    const seconds = math.multiply(math.subtract(minutesRaw, minutes), 60)
    return `${result.isNegative() ? '−' : ''}${degrees}°${minutes}′${math.format(seconds, { precision: 10 })}″`
  }
  if (display === 'fraction') {
    const f = math.fraction(result.toString())
    return `${f.s < 0n || f.s < 0 ? '-' : ''}${f.n}${String(f.d) === '1' ? '' : `/${f.d}`}`
  }
  if (engineering !== null) {
    const exponent = result.isZero() ? 0 : Math.floor(result.e / 3) * 3 + engineering
    return `${math.format(math.divide(result, math.pow(10, exponent)), { precision: 12 })}×10^${exponent}`
  }
  return math.format(result, { precision: 12, lowerExp: -9, upperExp: 12 })
}
