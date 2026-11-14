import type { BigNumber } from 'mathjs'
import { formatScientific } from '../../engine/formatResult'
import { math } from '../../engine/mathInstance'

export type EquationKind = 'linear' | 'quadratic'
export type EquationStatus = 'solved' | 'none' | 'infinite' | 'invalid'

export interface SolverStep {
  title: string
  formula: string
}

export interface EquationSolution {
  kind: EquationKind
  status: EquationStatus
  roots: string[]
  steps: SolverStep[]
  message?: string
}

const DECIMAL = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i
const bn = (value: number | string) => math.bignumber(value)
const fmt = (value: BigNumber) => formatScientific(value)
const negative = (value: BigNumber) => math.multiply(value, bn(-1)) as BigNumber

function readCoefficient(value: string): BigNumber | null {
  const trimmed = value.trim()
  if (!DECIMAL.test(trimmed)) return null
  const parsed = bn(trimmed)
  return parsed.isFinite() ? parsed : null
}

function polynomialForm(terms: readonly (readonly [BigNumber, string])[]): string {
  let formula = ''
  for (const [coefficient, variable] of terms) {
    if (coefficient.isZero()) continue
    const magnitude = coefficient.abs()
    const term = variable && magnitude.eq(1) ? variable : `${fmt(magnitude)}${variable}`
    if (!formula) formula = coefficient.isNegative() ? `−${term}` : term
    else formula += `${coefficient.isNegative() ? ' − ' : ' + '}${term}`
  }
  return formula || '0'
}

function linearForm(a: BigNumber, b: BigNumber): string {
  return `${polynomialForm([[a, 'x'], [b, '']])} = 0`
}

function quadraticForm(a: BigNumber, b: BigNumber, c: BigNumber): string {
  return `${polynomialForm([[a, 'x²'], [b, 'x'], [c, '']])} = 0`
}

function result(status: EquationStatus, kind: EquationKind, roots: string[], steps: SolverStep[], message?: string): EquationSolution {
  return { status, kind, roots, steps, ...(message ? { message } : {}) }
}

function solveLinear(a: BigNumber, b: BigNumber): EquationSolution {
  const steps: SolverStep[] = [{ title: 'الشكل القياسي', formula: `${linearForm(a, b)}` }]
  if (a.isZero()) {
    if (b.isZero()) {
      steps.push({ title: 'تحقق من المعادلة', formula: '0 = 0' })
      return result('infinite', 'linear', [], steps, 'عدد لا نهائي من الحلول')
    }
    steps.push({ title: 'تحقق من المعادلة', formula: `0 = ${fmt(negative(b))}` })
    return result('none', 'linear', [], steps, 'لا يوجد حل')
  }

  const opposite = negative(b)
  const root = math.divide(opposite, a) as BigNumber
  steps.push(
    { title: 'انقل الثابت إلى الطرف الآخر', formula: `${fmt(a)}x = ${fmt(opposite)}` },
    { title: 'اقسم الطرفين على معامل x', formula: `x = ${fmt(opposite)} ÷ ${fmt(a)} = ${fmt(root)}` },
  )
  return result('solved', 'linear', [fmt(root)], steps, 'حل وحيد')
}

function formatComplex(real: BigNumber, imaginary: BigNumber): string {
  if (imaginary.isZero()) return fmt(real)
  const sign = imaginary.isNegative() ? '−' : '+'
  const magnitude = imaginary.abs()
  const coefficient = magnitude.eq(1) ? '' : fmt(magnitude)
  const realPart = real.isZero() ? '' : fmt(real)
  return `${realPart}${realPart ? ` ${sign} ` : imaginary.isNegative() ? '−' : ''}${coefficient}i`
}

export function solveEquation(kind: EquationKind, aText: string, bText: string, cText = '0'): EquationSolution {
  const a = readCoefficient(aText)
  const b = readCoefficient(bText)
  const c = kind === 'quadratic' ? readCoefficient(cText) : bn(0)
  if (!a || !b || !c) return result('invalid', kind, [], [], 'أدخل معاملات رقمية صالحة')

  if (kind === 'linear') return solveLinear(a, b)

  if (a.isZero()) {
    const reduced = solveLinear(b, c)
    return {
      ...reduced,
      steps: [
        { title: 'خفض درجة المعادلة', formula: `a = 0 ⟹ ${linearForm(b, c)}` },
        ...reduced.steps,
      ],
    }
  }

  const fourAC = math.multiply(bn(4), math.multiply(a, c) as BigNumber) as BigNumber
  const discriminant = math.subtract(math.multiply(b, b), fourAC) as BigNumber
  const denominator = math.multiply(bn(2), a) as BigNumber
  const minusB = negative(b)
  const steps: SolverStep[] = [
    { title: 'الشكل القياسي', formula: quadraticForm(a, b, c) },
    { title: 'احسب المميّز', formula: `Δ = b² − 4ac = (${fmt(b)})² − 4(${fmt(a)})(${fmt(c)}) = ${fmt(discriminant)}` },
  ]

  if (discriminant.isZero()) {
    const root = math.divide(minusB, denominator) as BigNumber
    steps.push(
      { title: 'المميّز يساوي صفرًا؛ الجذر مكرر', formula: `x = −b ÷ (2a) = ${fmt(minusB)} ÷ ${fmt(denominator)}` },
      { title: 'الحل', formula: `x₁ = x₂ = ${fmt(root)}` },
    )
    return result('solved', 'quadratic', [fmt(root), fmt(root)], steps, 'جذر حقيقي مكرر')
  }

  if (discriminant.isPositive()) {
    const squareRoot = math.sqrt(discriminant) as BigNumber
    const first = math.divide(math.add(minusB, squareRoot), denominator) as BigNumber
    const second = math.divide(math.subtract(minusB, squareRoot), denominator) as BigNumber
    steps.push(
      { title: 'عوّض في القانون العام', formula: `x = (−b ± √Δ) ÷ (2a) = (${fmt(minusB)} ± ${fmt(squareRoot)}) ÷ ${fmt(denominator)}` },
      { title: 'الحلان الحقيقيان', formula: `x₁ = ${fmt(first)} ؛ x₂ = ${fmt(second)}` },
    )
    return result('solved', 'quadratic', [fmt(first), fmt(second)], steps, 'جذران حقيقيان')
  }

  const imaginaryNumerator = math.sqrt(negative(discriminant)) as BigNumber
  const realPart = math.divide(minusB, denominator) as BigNumber
  const imaginaryMagnitude = math.divide(imaginaryNumerator, denominator.abs()) as BigNumber
  const orientation = a.isNegative() ? negative(imaginaryMagnitude) : imaginaryMagnitude
  const first = formatComplex(realPart, orientation)
  const second = formatComplex(realPart, negative(orientation))
  steps.push(
    { title: 'المميّز سالب؛ استخدم الوحدة التخيلية i', formula: `x = (−b ± i√|Δ|) ÷ (2a)` },
    { title: 'الحلان المركبان', formula: `x₁ = ${first} ؛ x₂ = ${second}` },
  )
  return result('solved', 'quadratic', [first, second], steps, 'جذران مركبان')
}
