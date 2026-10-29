import { describe, expect, it } from 'vitest'
import { validateLatex } from 'mathlive'
import { latexToExpression } from '../../editor/latexToExpression'
import { previewCalculation } from '../../editor/previewCalculation'
import { calculateAdvanced } from '../../engine/advancedDispatcher'
import { emptyVariables, evaluateScientific } from '../../engine/evaluate'
import { containsInlineCalculus, DEVICE_CALCULUS_TEMPLATES } from '../../engine/inlineCalculus'

const near = (actual: string, expected: number, tolerance = 1e-14) => {
  expect(Math.abs(Number(actual) - expected)).toBeLessThan(tolerance)
}

const integral = '\\int_{0}^{1}{x^2}\\,\\mathrm{d}x'
const derivative = '\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(x^3\\right)\\right|_{x=2}'
const sum = '\\sum_{x=1}^{3}{x^2}'

describe('inline calculus MathLive templates', () => {
  it('exports renderable templates with editable MathLive placeholders', () => {
    expect(DEVICE_CALCULUS_TEMPLATES).toEqual({
      integrate: '\\int_{#?}^{#?}{#?}\\,\\mathrm{d}x',
      derivative: '\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(#?\\right)\\right|_{x=#?}',
      sum: '\\sum_{x=#?}^{#?}{#?}',
    })
    for (const template of Object.values(DEVICE_CALCULUS_TEMPLATES)) {
      expect(template).toContain('#?')
      expect(validateLatex(template)).toEqual([])
      expect(containsInlineCalculus(template)).toBe(true)
    }
  })

  it("converts the keypad's exact natural notation into only named calculator AST calls", () => {
    expect(latexToExpression(integral)).toContain('inlineIntegral')
    expect(latexToExpression(derivative)).toContain('inlineDerivative')
    expect(latexToExpression(sum)).toContain('inlineSum')
  })

  it('never evaluates adaptive calculus during ordinary live preview', () => {
    expect(previewCalculation(integral)).toEqual({ status: 'incomplete', text: '—' })
    expect(previewCalculation(derivative)).toEqual({ status: 'incomplete', text: '—' })
    expect(previewCalculation(sum)).toEqual({ status: 'incomplete', text: '—' })
  })
})

describe('inline calculus evaluator', () => {
  it('evaluates finite integrals accurately, including a reversed interval and an outer expression', () => {
    near(evaluateScientific(integral).toString(), 1 / 3, 1e-15)
    near(evaluateScientific('\\int_{0}^{\\frac{\\pi}{2}}{\\cos(x)}\\,\\mathrm{d}x', { angle: 'RAD' }).toString(), 1, 1e-15)
    near(evaluateScientific('\\int_{1}^{0}{x^2}\\,\\mathrm{d}x').toString(), -1 / 3, 1e-15)
    near(evaluateScientific(`2+${integral}`).toString(), 2 + 1 / 3, 1e-15)
  })

  it('evaluates an inclusive bounded integer sum and rejects partial/domain-invalid results', () => {
    expect(evaluateScientific(sum).toString()).toBe('14')
    expect(() => evaluateScientific('\\sum_{x=1}^{10001}{x}')).toThrow('10000')
    expect(() => evaluateScientific('\\sum_{x=1}^{3}{\\sqrt{x-2}}')).toThrow()
  })

  it('symbolically differentiates at a point with angle-unit chain rules', () => {
    expect(evaluateScientific(derivative).toString()).toBe('12')
    near(evaluateScientific('\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(\\sin(x)\\right)\\right|_{x=0}', { angle: 'RAD' }).toString(), 1, 1e-15)
    near(evaluateScientific('\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(\\sin(x)\\right)\\right|_{x=0}', { angle: 'DEG' }).toString(), Math.PI / 180, 1e-15)
    near(evaluateScientific('\\left.\\frac{\\mathrm{d}}{\\mathrm{d}x}\\left(\\sin(x)\\right)\\right|_{x=0}', { angle: 'GRA' }).toString(), Math.PI / 200, 1e-15)
  })

  it('uses x and X only as the local calculus binding, not the saved X value', () => {
    const variables = { ...emptyVariables, A: '2', X: '999' }
    near(evaluateScientific('A+\\int_{0}^{1}{X^2}\\,\\mathrm{d}x', { variables }).toString(), 2 + 1 / 3, 1e-15)
    near(evaluateScientific('\\mathrm{Ans}+\\int_{0}^{1}{x^2}\\,\\mathrm{d}x', { answer: '4' }).toString(), 4 + 1 / 3, 1e-15)
    expect(evaluateScientific('X', { variables }).toString()).toBe('999')
    expect(() => evaluateScientific('x+1')).toThrow()
  })

  it('rejects sampled singularities rather than returning a partial numeric result', () => {
    expect(() => evaluateScientific('\\int_{-1}^{1}{\\frac{1}{x}}\\,\\mathrm{d}x')).toThrow()
    expect(() => evaluateScientific('\\int_{0}^{1}{\\frac{1}{x-0.1}}\\,\\mathrm{d}x')).toThrow()
  })

  it('returns scalar scientific values through the worker dispatcher request', () => {
    const result = calculateAdvanced({ kind: 'scientific', latex: integral, angle: 'DEG' })
    expect(result.title).toBe('الحساب العلمي')
    near(result.scalar!, 1 / 3, 1e-15)
  })
})
