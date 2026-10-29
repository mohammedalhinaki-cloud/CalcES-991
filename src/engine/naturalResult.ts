import type { BigNumber } from 'mathjs'
import { latexToExpression } from '../editor/latexToExpression'
import type { EvaluationOptions } from './evaluate'
import { math } from './mathInstance'

type Rational = { numerator: bigint; denominator: bigint }
type Monomial = 'one' | 'pi' | `sqrt:${string}`
type Natural = Map<Monomial, Rational>
type AstNode = {
  type: string
  value?: unknown
  name?: string
  op?: string
  args?: AstNode[]
  content?: AstNode
  fn?: AstNode
}

const MAX_EXACT_DIGITS = 80
const MAX_FACTORABLE_RADICAND = 100_000_000n
const MAX_POWER = 16n
const DECIMAL_PRECISION = 64

function abs(value: bigint): bigint { return value < 0n ? -value : value }
function gcd(a: bigint, b: bigint): bigint {
  let x = abs(a), y = abs(b)
  while (y !== 0n) [x, y] = [y, x % y]
  return x
}
function rational(numerator: bigint, denominator = 1n): Rational | null {
  if (denominator === 0n) return null
  if (numerator === 0n) return { numerator: 0n, denominator: 1n }
  const sign = denominator < 0n ? -1n : 1n
  const divisor = gcd(numerator, denominator)
  const result = { numerator: sign * numerator / divisor, denominator: sign * denominator / divisor }
  return withinExactBounds(result) ? result : null
}
function withinExactBounds(value: Rational): boolean {
  return value.numerator.toString().length <= MAX_EXACT_DIGITS && value.denominator.toString().length <= MAX_EXACT_DIGITS
}
function addRational(left: Rational, right: Rational): Rational | null {
  return rational(left.numerator * right.denominator + right.numerator * left.denominator, left.denominator * right.denominator)
}
function multiplyRational(left: Rational, right: Rational): Rational | null {
  return rational(left.numerator * right.numerator, left.denominator * right.denominator)
}
function divideRational(left: Rational, right: Rational): Rational | null {
  return right.numerator === 0n ? null : rational(left.numerator * right.denominator, left.denominator * right.numerator)
}
function negateRational(value: Rational): Rational | null { return rational(-value.numerator, value.denominator) }
function powerRational(value: Rational, exponent: bigint): Rational | null {
  if (abs(exponent) > MAX_POWER || (exponent < 0n && value.numerator === 0n)) return null
  const power = exponent < 0n ? -exponent : exponent
  const numerator = value.numerator ** power
  const denominator = value.denominator ** power
  return exponent < 0n ? rational(denominator, numerator) : rational(numerator, denominator)
}
function parseDecimal(value: unknown): Rational | null {
  const text = String(value)
  if (!/^\d+(?:\.\d*)?$|^\.\d+$/.test(text)) return null
  const [integerPart, fractionalPart = ''] = text.split('.')
  const digits = `${integerPart || '0'}${fractionalPart}`.replace(/^0+(?=\d)/, '')
  if (digits.length > MAX_EXACT_DIGITS) return null
  return rational(BigInt(digits || '0'), 10n ** BigInt(fractionalPart.length))
}
function cloneNatural(value: Natural): Natural { return new Map(value) }
function monomial(value: Monomial, coefficient: Rational): Natural {
  return coefficient.numerator === 0n ? new Map() : new Map([[value, coefficient]])
}
function rationalNatural(value: Rational): Natural { return monomial('one', value) }
function entries(value: Natural): [Monomial, Rational][] { return [...value.entries()].filter(([, coefficient]) => coefficient.numerator !== 0n) }
function single(value: Natural): [Monomial, Rational] | null {
  const result = entries(value)
  return result.length === 1 ? result[0]! : null
}
function addNatural(left: Natural, right: Natural): Natural | null {
  const result = cloneNatural(left)
  for (const [name, coefficient] of right) {
    const next = result.has(name) ? addRational(result.get(name)!, coefficient) : coefficient
    if (!next) return null
    if (next.numerator === 0n) result.delete(name)
    else result.set(name, next)
  }
  return result
}
function negateNatural(value: Natural): Natural | null {
  const result = new Map<Monomial, Rational>()
  for (const [name, coefficient] of value) {
    const negated = negateRational(coefficient)
    if (!negated) return null
    result.set(name, negated)
  }
  return result
}
function radicalName(radicand: bigint): Monomial { return `sqrt:${radicand}` }
function radicalValue(name: Monomial): bigint | null {
  return name.startsWith('sqrt:') ? BigInt(name.slice(5)) : null
}
function multiplyNatural(left: Natural, right: Natural): Natural | null {
  const first = single(left), second = single(right)
  if (!first || !second) return null
  const [leftName, leftCoefficient] = first
  const [rightName, rightCoefficient] = second
  const coefficient = multiplyRational(leftCoefficient, rightCoefficient)
  if (!coefficient) return null
  if (leftName === 'one') return monomial(rightName, coefficient)
  if (rightName === 'one') return monomial(leftName, coefficient)
  if (leftName === 'pi' || rightName === 'pi') return null
  const leftRadicand = radicalValue(leftName), rightRadicand = radicalValue(rightName)
  if (leftRadicand === null || rightRadicand === null) return null
  if (leftRadicand === rightRadicand) return rationalNatural(multiplyRational(coefficient, rational(leftRadicand)!)!)
  const radicand = leftRadicand * rightRadicand
  if (radicand > MAX_FACTORABLE_RADICAND) return null
  return monomial(radicalName(radicand), coefficient)
}
function divideNatural(left: Natural, right: Natural): Natural | null {
  const divisor = single(right)
  if (!divisor || divisor[0] !== 'one') return null
  const result = new Map<Monomial, Rational>()
  for (const [name, coefficient] of left) {
    const quotient = divideRational(coefficient, divisor[1])
    if (!quotient) return null
    result.set(name, quotient)
  }
  return result
}
function powerNatural(base: Natural, exponent: Rational): Natural | null {
  if (exponent.denominator !== 1n || abs(exponent.numerator) > MAX_POWER) return null
  if (exponent.numerator === 0n) return rationalNatural(rational(1n)!)
  const item = single(base)
  if (!item) return null
  const [name, coefficient] = item
  if (name === 'one') {
    const result = powerRational(coefficient, exponent.numerator)
    return result ? rationalNatural(result) : null
  }
  if (name === 'pi') return exponent.numerator === 1n ? base : null
  const radicand = radicalValue(name)
  if (radicand === null) return null
  const magnitude = abs(exponent.numerator)
  const coefficientPower = powerRational(coefficient, exponent.numerator)
  if (!coefficientPower) return null
  if (magnitude % 2n === 0n) {
    const half = magnitude / 2n
    const radicandPower = exponent.numerator > 0n ? radicand ** half : 1n
    const result = exponent.numerator > 0n
      ? multiplyRational(coefficientPower, rational(radicandPower)!)
      : divideRational(coefficientPower, rational(radicand ** half)!)
    return result ? rationalNatural(result) : null
  }
  const half = (magnitude - 1n) / 2n
  const result = exponent.numerator > 0n
    ? multiplyRational(coefficientPower, rational(radicand ** half)!)
    : divideRational(coefficientPower, rational(radicand ** (half + 1n))!)
  return result ? monomial(name, result) : null
}
function splitSquareFactors(value: bigint): { outside: bigint; inside: bigint } | null {
  if (value < 1n || value > MAX_FACTORABLE_RADICAND) return null
  let remaining = value, outside = 1n, inside = 1n, factor = 2n
  while (factor * factor <= remaining) {
    let count = 0
    while (remaining % factor === 0n) { remaining /= factor; count++ }
    if (count >= 2) outside *= factor ** BigInt(Math.floor(count / 2))
    if (count % 2 === 1) inside *= factor
    factor = factor === 2n ? 3n : factor + 2n
  }
  if (remaining > 1n) inside *= remaining
  return { outside, inside }
}
function sqrtRational(value: Rational): Natural | null {
  if (value.numerator < 0n) return null
  if (value.numerator === 0n) return rationalNatural(rational(0n)!)
  const numerator = splitSquareFactors(value.numerator)
  const denominator = splitSquareFactors(value.denominator)
  if (!numerator || !denominator) return null
  const radicand = numerator.inside * denominator.inside
  if (radicand > MAX_FACTORABLE_RADICAND) return null
  const coefficient = rational(numerator.outside, denominator.outside * denominator.inside)
  if (!coefficient) return null
  return radicand === 1n ? rationalNatural(coefficient) : monomial(radicalName(radicand), coefficient)
}
function toNatural(node: AstNode): Natural | null {
  if (node.type === 'ParenthesisNode') return node.content ? toNatural(node.content) : null
  if (node.type === 'ConstantNode') {
    const value = parseDecimal(node.value)
    return value ? rationalNatural(value) : null
  }
  if (node.type === 'SymbolNode') return node.name === 'pi' ? monomial('pi', rational(1n)!) : null
  if (node.type === 'FunctionNode') {
    if (node.fn?.name !== 'sqrt' || node.args?.length !== 1) return null
    const argument = toNatural(node.args[0]!)
    const item = argument && single(argument)
    return item?.[0] === 'one' ? sqrtRational(item[1]) : null
  }
  if (node.type !== 'OperatorNode' || !node.op || !node.args) return null
  if (node.op === '-' && node.args.length === 1) {
    const value = toNatural(node.args[0]!)
    return value ? negateNatural(value) : null
  }
  if (node.op === '+' && node.args.length === 2) {
    const left = toNatural(node.args[0]!), right = toNatural(node.args[1]!)
    return left && right ? addNatural(left, right) : null
  }
  if (node.op === '-' && node.args.length === 2) {
    const left = toNatural(node.args[0]!), right = toNatural(node.args[1]!)
    const negated = right && negateNatural(right)
    return left && negated ? addNatural(left, negated) : null
  }
  if (node.op === '*' && node.args.length === 2) {
    const left = toNatural(node.args[0]!), right = toNatural(node.args[1]!)
    return left && right ? multiplyNatural(left, right) : null
  }
  if (node.op === '/' && node.args.length === 2) {
    const left = toNatural(node.args[0]!), right = toNatural(node.args[1]!)
    return left && right ? divideNatural(left, right) : null
  }
  if (node.op === '^' && node.args.length === 2) {
    const base = toNatural(node.args[0]!), power = toNatural(node.args[1]!)
    const powerItem = power && single(power)
    return base && powerItem?.[0] === 'one' ? powerNatural(base, powerItem[1]) : null
  }
  return null
}
function rationalToBigNumber(value: Rational): BigNumber {
  return math.divide(math.bignumber(value.numerator.toString()), math.bignumber(value.denominator.toString())) as BigNumber
}
function naturalToBigNumber(value: Natural): BigNumber | null {
  try {
    let total = math.bignumber(0)
    for (const [name, coefficient] of value) {
      let term = rationalToBigNumber(coefficient)
      if (name === 'pi') term = math.multiply(term, math.pi) as BigNumber
      else {
        const radicand = radicalValue(name)
        if (radicand !== null) term = math.multiply(term, math.sqrt(math.bignumber(radicand.toString()))) as BigNumber
      }
      total = math.add(total, term) as BigNumber
    }
    return total.isFinite() ? total : null
  } catch { return null }
}
function isEquivalent(candidate: BigNumber, provided: BigNumber): boolean {
  if (!candidate.isFinite() || !provided.isFinite()) return false
  const exponent = Math.max(candidate.isZero() ? 0 : candidate.e, provided.isZero() ? 0 : provided.e, 0)
  // Every supported expression has a bounded number of 64-digit BigNumber operations.
  // Eight guard digits cover accumulated rounding while keeping comparison far tighter than display precision.
  const tolerance = math.pow(math.bignumber(10), exponent - (DECIMAL_PRECISION - 8)) as BigNumber
  return candidate.minus(provided).abs().lte(tolerance)
}
function unsignedRationalLatex(value: Rational): string {
  const numerator = value.numerator.toString(), denominator = value.denominator.toString()
  return value.denominator === 1n ? numerator : `\\frac{${numerator}}{${denominator}}`
}
function monomialLatex(name: Monomial, coefficient: Rational): string {
  const negative = coefficient.numerator < 0n
  const absolute = rational(abs(coefficient.numerator), coefficient.denominator)!
  const symbol = name === 'pi' ? '\\pi' : `\\sqrt{${radicalValue(name)}}`
  let body: string
  if (absolute.denominator === 1n) body = absolute.numerator === 1n ? symbol : `${absolute.numerator}${symbol}`
  else if (absolute.numerator === 1n) body = name === 'pi' ? `\\frac{\\pi}{${absolute.denominator}}` : `\\frac{\\sqrt{${radicalValue(name)}}}{${absolute.denominator}}`
  else body = `\\frac{${absolute.numerator}${symbol}}{${absolute.denominator}}`
  return negative ? `-${body}` : body
}
function naturalToLatex(value: Natural): string | null {
  const nonZero = entries(value)
  if (nonZero.length === 0) return '0'
  const order = (name: Monomial) => name === 'one' ? 0 : name === 'pi' ? 1 : 2
  nonZero.sort(([left], [right]) => order(left) - order(right) || left.localeCompare(right))
  let result = ''
  for (const [name, coefficient] of nonZero) {
    const part = name === 'one' ? unsignedRationalLatex(coefficient) : monomialLatex(name, coefficient)
    if (!result) result = part
    else result += part.startsWith('-') ? part : `+${part}`
  }
  return result || null
}

/**
 * Returns a source-derived exact LaTeX form only for a small, auditable subset:
 * rational arithmetic, \pi with rational coefficients, and square roots of bounded rationals.
 * It never infers a symbolic value from the decimal result alone.
 */
export function getNaturalResultLatex(latex: string, value: string, _options: EvaluationOptions = {}): string | null {
  try {
    const expected = math.bignumber(value)
    if (!expected.isFinite()) return null
    const node = math.parse(latexToExpression(latex)) as unknown as AstNode
    const natural = toNatural(node)
    if (!natural) return null
    const evaluated = naturalToBigNumber(natural)
    if (!evaluated || !isEquivalent(evaluated, expected)) return null
    return naturalToLatex(natural)
  } catch { return null }
}
