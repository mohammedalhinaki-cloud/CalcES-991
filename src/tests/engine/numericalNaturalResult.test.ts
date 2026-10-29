import { describe, expect, it } from 'vitest'
import { evaluateScientific } from '../../engine/evaluate'
import { formatScientific } from '../../engine/formatResult'
import { math } from '../../engine/mathInstance'
import { getNaturalResultLatex } from '../../engine/naturalResult'

const valueFor = (latex: string) => evaluateScientific(latex).toString()

describe('64-digit scientific numerical regressions', () => {
  it('keeps exponent precedence ahead of unary minus and decimal arithmetic exact', () => {
    expect(evaluateScientific('-2^2').toString()).toBe('-4')
    expect(evaluateScientific('(-2)^2').toString()).toBe('4')
    expect(evaluateScientific('0.1+0.2').toString()).toBe('0.3')
  })

  it('handles exact quadrants and rejects tangent poles in DEG, RAD, and GRA', () => {
    expect(evaluateScientific('\\sin(-90)', { angle: 'DEG' }).toString()).toBe('-1')
    expect(evaluateScientific('\\cos(-180)', { angle: 'DEG' }).toString()).toBe('-1')
    expect(evaluateScientific('\\sin(\\pi/2)', { angle: 'RAD' }).toString()).toBe('1')
    expect(evaluateScientific('\\sin(-100)', { angle: 'GRA' }).toString()).toBe('-1')
    expect(() => evaluateScientific('\\tan(90)', { angle: 'DEG' })).toThrow()
    expect(() => evaluateScientific('\\tan(\\pi/2)', { angle: 'RAD' })).toThrow()
    expect(() => evaluateScientific('\\tan(100)', { angle: 'GRA' })).toThrow()
  })

  it('accepts only bounded non-negative integer factorials and rejects invalid real results', () => {
    expect(evaluateScientific('10!').toString()).toBe('3628800')
    for (const latex of ['(-1)!', '2.5!', '1001!', '1/0', '\\sqrt{-1}', '\\ln(0)']) {
      expect(() => evaluateScientific(latex)).toThrow()
    }
  })
})

describe('FIX and SCI formatting', () => {
  it('rounds bounded display digits without mutating the stored BigNumber', () => {
    const stored = math.bignumber('1.235')
    expect(formatScientific(stored, { notation: 'fix', digits: 2 })).toBe('1.24')
    expect(formatScientific(stored, { notation: 'sci', digits: 2 })).toBe('1.2e+0')
    expect(formatScientific(stored, { notation: 'sci', digits: 3 })).toBe('1.24e+0')
    expect(formatScientific(stored, { notation: 'fix', digits: 999 })).toBe('1.23500000000000')
    expect(formatScientific(stored, { notation: 'sci', digits: 0 })).toBe('1.235000000e+0')
    expect(stored.toString()).toBe('1.235')
  })

  it('retains the original normal-format default when notation is omitted', () => {
    expect(formatScientific(math.bignumber('123456'))).toBe('123456')
  })
})

describe('source-derived natural results', () => {
  it.each([
    ['\\sqrt{2}', '\\sqrt{2}'],
    ['\\sqrt{8}', '2\\sqrt{2}'],
    ['\\sqrt{2}+\\sqrt{2}', '2\\sqrt{2}'],
    ['\\pi/3', '\\frac{\\pi}{3}'],
    ['1/3', '\\frac{1}{3}'],
  ])('derives %s from the parsed source AST', (latex, expected) => {
    expect(getNaturalResultLatex(latex, valueFor(latex))).toBe(expected)
  })

  it('does not infer symbols from arbitrary decimals and verifies the supplied numeric value', () => {
    const decimal = '1.414213562373095'
    expect(getNaturalResultLatex(decimal, valueFor(decimal))).not.toContain('sqrt')
    expect(getNaturalResultLatex('\\sqrt{2}', '1.4')).toBeNull()
    expect(getNaturalResultLatex('\\sin(30)', valueFor('\\sin(30)'))).toBeNull()
  })
})
