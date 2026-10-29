import type { BigNumber, MathNode } from 'mathjs'
import type { AngleUnit } from '../state/types'
import { math } from './mathInstance'

/** MathLive snippets inserted by the hardware keypad into the main LCD. */
export const DEVICE_CALCULUS_TEMPLATES = {
  integrate: '\\int_{#?}^{#?}{#?}\\,\\mathrm{d}x',
  derivative: '\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#?\\right)\\right|_{x=#?}',
  sum: '\\sum_{x=#?}^{#?}{#?}',
} as const

/** True for the three bounded-calculus constructs supported in the main LCD. */
export function containsInlineCalculus(latex: string): boolean {
  const compact = latex.replace(/\s+/gu, '')
  return /\\(?:int|sum)(?![A-Za-z])/u.test(compact)
    || /\\(?:d|t)?frac\{(?:\\mathrm\{)?d\}?\}\{(?:\\mathrm\{)?d\}?x\}/u.test(compact)
}

export class InlineCalculusError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InlineCalculusError'
  }
}

export const INLINE_CALCULUS_FUNCTIONS = new Set(['inlineIntegral', 'inlineDerivative', 'inlineSum'])

const MAX_INTEGRAL_EVALUATIONS = 60_000
const MAX_SUM_TERMS = 10_000
const MAX_CALCULUS_NESTING = 6
const MAX_INTEGRAL_DEPTH = 42
const MAX_ABS_VALUE = '1e10000'
// Stricter than the approximately 1e-13 device display target while leaving
// headroom for BigNumber transcendental-function roundoff during adaptation.
const ABSOLUTE_TOLERANCE = '1e-17'
const RELATIVE_TOLERANCE = '1e-15'
const ANGLE_SCOPE_KEY = '__calculatorInlineAngle'

type ScopeMap = Pick<Map<string, unknown>, 'get' | 'entries' | typeof Symbol.iterator>
type RawCalculusFunction = ((args: MathNode[], mathNamespace: unknown, scope: ScopeMap) => BigNumber) & { rawArgs?: boolean }

function fail(message: string): never {
  throw new InlineCalculusError(message)
}

function finite(value: unknown): BigNumber {
  if (!math.isBigNumber(value) || !value.isFinite() || value.abs().gt(MAX_ABS_VALUE)) {
    return fail('الدالة ليست حقيقية ومنتهية في مجال الحساب')
  }
  return value
}

function raw(callback: (args: MathNode[], scope: ScopeMap) => BigNumber): RawCalculusFunction {
  const fn = ((args: MathNode[], _mathNamespace: unknown, scope: ScopeMap) => callback(args, scope)) as RawCalculusFunction
  fn.rawArgs = true
  return fn
}

function localScope(scope: ScopeMap, values: Record<string, unknown>): Map<string, unknown> {
  // MathJS's PartitionedMap is iterable, while its entries() result is a
  // lightweight iterator rather than a spreadable iterator.
  return new Map([...Array.from(scope), ...Object.entries(values)])
}

function evaluateNode(node: MathNode, scope: ScopeMap | Map<string, unknown>): BigNumber {
  try {
    return finite(node.compile().evaluate(scope))
  } catch (error) {
    if (error instanceof InlineCalculusError) throw error
    return fail('تعذر تقييم الدالة ضمن مجال الحساب')
  }
}

function expectArguments(args: MathNode[], count: number, operation: string): void {
  if (args.length !== count) fail(`بنية ${operation} غير مكتملة`)
}

function integral(args: MathNode[], scope: ScopeMap): BigNumber {
  expectArguments(args, 3, 'التكامل')
  let lower = evaluateNode(args[0]!, scope)
  let upper = evaluateNode(args[1]!, scope)
  const integrand = args[2]!
  const compiledIntegrand = integrand.compile()
  if (lower.eq(upper)) return math.bignumber(0)

  let sign = math.bignumber(1)
  if (lower.gt(upper)) {
    ;[lower, upper] = [upper, lower]
    sign = math.bignumber(-1)
  }

  let evaluations = 0
  const sample = (x: BigNumber): BigNumber => {
    evaluations += 1
    if (evaluations > MAX_INTEGRAL_EVALUATIONS) {
      fail('لم يتقارب التكامل ضمن حد التقييمات؛ تحقق من الاستمرارية والمجال')
    }
    // Both spellings bind to this calculus variable. The parser has already
    // rejected a free lowercase x outside an inline calculus body.
    try {
      return finite(compiledIntegrand.evaluate(localScope(scope, { x, X: x })))
    } catch (error) {
      if (error instanceof InlineCalculusError) throw error
      return fail('تعذر تقييم الدالة ضمن مجال الحساب')
    }
  }
  const simpson = (left: BigNumber, right: BigNumber, fLeft: BigNumber, fMid: BigNumber, fRight: BigNumber): BigNumber =>
    right.minus(left).times(fLeft.plus(fMid.times(4)).plus(fRight)).div(6)

  const segments = 16
  let estimatedError = math.bignumber(0)
  const integrateSegment = (
    left: BigNumber,
    right: BigNumber,
    fLeft: BigNumber,
    fMid: BigNumber,
    fRight: BigNumber,
    whole: BigNumber,
    tolerance: BigNumber,
    depth: number,
  ): BigNumber => {
    const midpoint = left.plus(right).div(2)
    const fQuarterLeft = sample(left.plus(midpoint).div(2))
    const fQuarterRight = sample(midpoint.plus(right).div(2))
    const leftEstimate = simpson(left, midpoint, fLeft, fQuarterLeft, fMid)
    const rightEstimate = simpson(midpoint, right, fMid, fQuarterRight, fRight)
    const difference = leftEstimate.plus(rightEstimate).minus(whole)
    if (difference.abs().lte(tolerance.times(15))) {
      const correction = difference.div(15)
      estimatedError = estimatedError.plus(correction.abs())
      return leftEstimate.plus(rightEstimate).plus(correction)
    }
    if (depth <= 0) {
      fail('لم يتقارب التكامل؛ يلزم مجال منتهٍ ودالة مستمرة بلا أقطاب')
    }
    return integrateSegment(left, midpoint, fLeft, fQuarterLeft, fMid, leftEstimate, tolerance.div(2), depth - 1)
      .plus(integrateSegment(midpoint, right, fMid, fQuarterRight, fRight, rightEstimate, tolerance.div(2), depth - 1))
  }

  let total = math.bignumber(0)
  const width = upper.minus(lower)
  for (let index = 0; index < segments; index += 1) {
    const left = lower.plus(width.times(index).div(segments))
    const right = lower.plus(width.times(index + 1).div(segments))
    const midpoint = left.plus(right).div(2)
    const fLeft = sample(left)
    const fMid = sample(midpoint)
    const fRight = sample(right)
    const whole = simpson(left, right, fLeft, fMid, fRight)
    const tolerance = math.bignumber(ABSOLUTE_TOLERANCE).div(segments)
      .plus(whole.abs().times(RELATIVE_TOLERANCE).div(segments))
    total = total.plus(integrateSegment(left, right, fLeft, fMid, fRight, whole, tolerance, MAX_INTEGRAL_DEPTH))
  }

  const result = finite(total.times(sign))
  const allowedError = math.bignumber(ABSOLUTE_TOLERANCE).plus(result.abs().times(RELATIVE_TOLERANCE))
  if (estimatedError.gt(allowedError)) {
    fail('الإلغاء العددي يمنع تحقيق دقة التكامل المطلوبة؛ عدّل المجال')
  }
  return result
}

function normalizeDerivativeAngle(node: MathNode, angle: AngleUnit): MathNode {
  if (angle === 'RAD') return node
  const scale = math.bignumber(math.pi.toString()).div(angle === 'DEG' ? 180 : 200).toString()
  const normalize = (current: MathNode): MathNode => {
    const mapped = current.map(child => normalize(child))
    if (!math.isFunctionNode(mapped)) return mapped
    const name = mapped.fn.name
    const argument = mapped.args[0]
    if (!argument) return mapped
    if (name === 'sin' || name === 'cos' || name === 'tan') {
      return math.parse(`${name}((${argument.toString()})*(${scale}))`)
    }
    if (name === 'asin' || name === 'acos' || name === 'atan') {
      return math.parse(`(${name}(${argument.toString()}))/(${scale})`)
    }
    return mapped
  }
  return normalize(node)
}

function nativeRadiansScope(scope: ScopeMap, point: BigNumber): Map<string, unknown> {
  return localScope(scope, {
    x: point,
    X: point,
    sin: (value: BigNumber) => math.sin(value),
    cos: (value: BigNumber) => math.cos(value),
    tan: (value: BigNumber) => math.tan(value),
    asin: (value: BigNumber) => math.asin(value),
    acos: (value: BigNumber) => math.acos(value),
    atan: (value: BigNumber) => math.atan(value),
  })
}

function scopeAngle(scope: ScopeMap): AngleUnit {
  const angle = scope.get(ANGLE_SCOPE_KEY)
  return angle === 'RAD' || angle === 'GRA' ? angle : 'DEG'
}

function derivative(args: MathNode[], scope: ScopeMap): BigNumber {
  expectArguments(args, 2, 'المشتقة')
  const body = args[0]!
  const point = evaluateNode(args[1]!, scope)
  try {
    const normalized = normalizeDerivativeAngle(body, scopeAngle(scope))
    const symbolicDerivative = math.derivative(normalized, 'x')
    return evaluateNode(symbolicDerivative, nativeRadiansScope(scope, point))
  } catch (error) {
    if (error instanceof InlineCalculusError) throw error
    return fail('تعذر اشتقاق التعبير؛ استخدم دالة مدعومة ومتغير x')
  }
}

function sum(args: MathNode[], scope: ScopeMap): BigNumber {
  expectArguments(args, 3, 'المجموع')
  const first = evaluateNode(args[0]!, scope)
  const last = evaluateNode(args[1]!, scope)
  if (!first.isInteger() || !last.isInteger()) fail('حدود المجموع يجب أن تكون أعدادًا صحيحة')
  if (first.gt(last)) fail('حدود المجموع معكوسة؛ يجب أن يكون الحد الأدنى أقل من أو يساوي الحد الأعلى')
  const count = last.minus(first).plus(1)
  if (count.gt(MAX_SUM_TERMS)) fail('المجموع محدود بـ 10000 حد')

  let total = math.bignumber(0)
  const terms = count.toNumber()
  const body = args[2]!
  const compiledBody = body.compile()
  for (let offset = 0; offset < terms; offset += 1) {
    const x = first.plus(offset)
    try {
      total = finite(total.plus(finite(compiledBody.evaluate(localScope(scope, { x, X: x })))))
    } catch (error) {
      if (error instanceof InlineCalculusError) throw error
      return fail('تعذر تقييم الدالة ضمن مجال الحساب')
    }
  }
  return total
}

let activeCalculus = 0
function guarded(operation: () => BigNumber): BigNumber {
  activeCalculus += 1
  if (activeCalculus > MAX_CALCULUS_NESTING) {
    activeCalculus -= 1
    return fail('تداخل عمليات التفاضل والتكامل أكبر من الحد المسموح')
  }
  try {
    return operation()
  } finally {
    activeCalculus -= 1
  }
}

/**
 * These three callbacks are registered only on the calculator's isolated
 * MathJS instance. `rawArgs` receives parsed MathJS nodes, not generated JS;
 * every child evaluation uses a copied scope map with local x/X shadowing.
 */
math.import({
  inlineIntegral: raw((args, scope) => guarded(() => integral(args, scope))),
  inlineDerivative: raw((args, scope) => guarded(() => derivative(args, scope))),
  inlineSum: raw((args, scope) => guarded(() => sum(args, scope))),
})

/** Internal scope key supplied by evaluateScientific for derivative angle rules. */
export const INLINE_CALCULUS_ANGLE_SCOPE_KEY = ANGLE_SCOPE_KEY
