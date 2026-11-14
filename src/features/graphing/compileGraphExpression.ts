import { math } from '../../engine/mathInstance'
import type { MathNode } from 'mathjs'

export type GraphFunction = (x: number) => number

type NumericFunction = (...values: number[]) => number

const FUNCTIONS: Record<string, NumericFunction> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  asinh: Math.asinh,
  acosh: Math.acosh,
  atanh: Math.atanh,
  sqrt: Math.sqrt,
  abs: Math.abs,
  exp: Math.exp,
  log: Math.log,
  log10: Math.log10,
  log2: Math.log2,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  min: Math.min,
  max: Math.max,
}

const OPERATORS = new Set(['+', '-', '*', '/', '^', '%'])
const MAX_EXPRESSION_LENGTH = 140
const MAX_NODE_COUNT = 120

export function compileGraphExpression(source: string): GraphFunction {
  const expression = source.trim()
  if (!expression || expression.length > MAX_EXPRESSION_LENGTH) throw new Error('أدخل دالة قصيرة مثل x^2 أو sin(x)')

  let root: MathNode
  try {
    root = math.parse(expression)
  } catch {
    throw new Error('صيغة الدالة غير صالحة')
  }

  let visited = 0
  function compile(node: MathNode): GraphFunction {
    visited += 1
    if (visited > MAX_NODE_COUNT) throw new Error('الدالة طويلة جدًا للرسم')

    if (math.isConstantNode(node)) {
      const value = Number(node.value)
      if (!Number.isFinite(value)) throw new Error('استخدم عددًا ثابتًا صالحًا')
      return () => value
    }

    if (math.isParenthesisNode(node)) return compile(node.content)

    if (math.isSymbolNode(node)) {
      if (node.name === 'x') return x => x
      if (node.name === 'pi') return () => Math.PI
      if (node.name === 'e') return () => Math.E
      throw new Error('استخدم x فقط كمتغير للدالة')
    }

    if (math.isOperatorNode(node)) {
      const operator = node.op as string
      if (!OPERATORS.has(operator)) throw new Error('هذا العامل غير مدعوم في الرسم')
      const args = node.args.map(compile)
      if (args.length === 1 && (operator === '+' || operator === '-')) {
        return operator === '+' ? x => args[0]!(x) : x => -args[0]!(x)
      }
      if (args.length !== 2) throw new Error('تركيب العامل غير صالح')
      const [left, right] = args as [GraphFunction, GraphFunction]
      switch (operator) {
        case '+': return x => left(x) + right(x)
        case '-': return x => left(x) - right(x)
        case '*': return x => left(x) * right(x)
        case '/': return x => left(x) / right(x)
        case '^': return x => left(x) ** right(x)
        case '%': return x => left(x) % right(x)
      }
    }

    if (math.isFunctionNode(node)) {
      if (!math.isSymbolNode(node.fn)) throw new Error('استدعاء الدالة غير مدعوم')
      const name = node.fn.name
      if (!Object.hasOwn(FUNCTIONS, name)) throw new Error('اسم الدالة غير مدعوم')
      const fn = FUNCTIONS[name]!
      const args = node.args.map(compile)
      if (args.length < 1 || args.length > 2 || (args.length === 2 && !['min', 'max'].includes(name))) {
        throw new Error('عدد مدخلات الدالة غير صالح')
      }
      return x => fn(...args.map(argument => argument(x)))
    }

    throw new Error('يسمح الرسم بالعمليات والدوال الرياضية فقط')
  }

  return compile(root)
}
