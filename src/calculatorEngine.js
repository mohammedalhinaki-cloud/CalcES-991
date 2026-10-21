import { create, all, fraction } from 'mathjs'
import katex from 'katex'

const math = create(all, { number: 'Fraction', precision: 64 })

export const MODES = [
  ['COMP', 'حساب عام'],
  ['CMPLX', 'أعداد مركبة'],
  ['STAT', 'إحصاء وانحدار'],
  ['BASE-N', 'أنظمة الأعداد'],
  ['EQN', 'حل المعادلات'],
  ['MATRIX', 'مصفوفات'],
  ['TABLE', 'جدول قيم'],
  ['VECTOR', 'متجهات'],
]

export function normalizeExpression(value) {
  return value
    .replaceAll('×', '*')
    .replaceAll('÷', '/')
    .replaceAll('−', '-')
    .replaceAll('π', 'pi')
    .replaceAll('√', 'sqrt')
    .replace(/Ans/g, 'ans')
}

export function toLatex(value) {
  if (!value) return ''
  const normalized = normalizeExpression(value)
  try {
    const node = math.parse(normalized)
    return node.toTex({ parenthesis: 'keep' })
  } catch {
    return normalized
      .replaceAll('*', '\\times ')
      .replaceAll('/', '\\div ')
      .replaceAll('sqrt', '\\sqrt')
      .replaceAll('pi', '\\pi ')
  }
}

export function renderNatural(value) {
  if (!value) return ''
  try {
    return katex.renderToString(toLatex(value), { throwOnError: false, displayMode: false })
  } catch {
    return value
  }
}

function trigScope(angle) {
  const scale = angle === 'DEG' ? Math.PI / 180 : angle === 'GRA' ? Math.PI / 200 : 1
  const inverseScale = 1 / scale
  return {
    sin: (x) => Math.sin(Number(x) * scale),
    cos: (x) => Math.cos(Number(x) * scale),
    tan: (x) => Math.tan(Number(x) * scale),
    asin: (x) => Math.asin(Number(x)) * inverseScale,
    acos: (x) => Math.acos(Number(x)) * inverseScale,
    atan: (x) => Math.atan(Number(x)) * inverseScale,
  }
}

export function evaluateExpression(value, { angle = 'DEG', answer = 0 } = {}) {
  const scope = { ans: answer, ...trigScope(angle) }
  return math.evaluate(normalizeExpression(value), scope)
}

export function formatResult(result) {
  if (result == null) return ''
  if (typeof result === 'number') return Number(result.toPrecision(12)).toString()
  if (math.isFraction(result)) return `${result.n}/${result.d}`
  return String(result)
}

export function decimalToFraction(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || Math.abs(numeric) > 1e9) return null
  const exact = fraction(numeric)
  if (exact.d === 1) return String(exact.n)
  return `${exact.n}/${exact.d}`
}
