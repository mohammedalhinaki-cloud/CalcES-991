import { describe, expect, it } from 'vitest'
import { latexToExpression } from '../../editor/latexToExpression'
import { previewCalculation } from '../../editor/previewCalculation'

describe('structured LaTeX conversion and math.js preview', () => {
  it.each([
    ['\\frac12','0.5'], ['\\frac1{23}','0.043478260869565'], ['\\sqrt9','3'],
    ['0.1+0.2','0.3'], ['2+3\\times4','14'], ['\\frac{1}{2}','0.5'],
    ['\\frac{1+2}{\\frac{3}{4}}','4'], ['2\\left(3+4\\right)','14'],
    ['\\sqrt{9}+2^{3}','11'], ['-2^2','-4'], ['2^{3^{2}}','512'],
    ['3\\cdot2\\div4','1.5'], ['\\frac{-3}{2}','-1.5'],
  ])('converts %s and evaluates to %s', (latex, expected) => {
    expect(latexToExpression(latex)).not.toMatch(/\\/)
    expect(previewCalculation(latex)).toEqual({status:'success',text:expected})
  })
  it.each(['\\frac{1}{}','\\sqrt{}','2+','(2','\\unknown{1}','a=2','\\text{hello}','1;2'])('rejects incomplete or unsupported input: %s', latex => {
    expect(() => latexToExpression(latex)).toThrow()
    expect(previewCalculation(latex).status).toBe('incomplete')
  })
  it('distinguishes empty input and mathematical errors', () => {
    expect(previewCalculation('')).toEqual({status:'empty',text:'—'})
    expect(previewCalculation('1/0').status).toBe('error')
    expect(previewCalculation('\\sqrt{-1}').status).toBe('error')
  })
  it('limits expression size and nesting', () => {
    expect(() => latexToExpression('1'.repeat(501))).toThrow()
    expect(() => latexToExpression('('.repeat(41)+'1'+')'.repeat(41))).toThrow()
  })
})
