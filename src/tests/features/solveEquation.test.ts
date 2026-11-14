import { describe, expect, it } from 'vitest'
import { solveEquation } from '../../features/equation-solver/solveEquation'

describe('linear and quadratic equation solver', () => {
  it('solves a linear equation and shows the isolation steps', () => {
    const result = solveEquation('linear', '2', '4')
    expect(result.status).toBe('solved')
    expect(result.roots).toEqual(['-2'])
    expect(result.steps.map(step => step.title)).toContain('اقسم الطرفين على معامل x')
  })

  it('finds two real roots and the discriminant for a quadratic', () => {
    const result = solveEquation('quadratic', '1', '-3', '2')
    expect(result.status).toBe('solved')
    expect(result.roots).toEqual(['2', '1'])
    expect(result.steps.some(step => step.formula.includes('Δ ='))).toBe(true)
  })

  it('reports a repeated root and complex roots correctly', () => {
    expect(solveEquation('quadratic', '1', '2', '1').roots).toEqual(['-1', '-1'])
    const complex = solveEquation('quadratic', '1', '0', '1')
    expect(complex.message).toBe('جذران مركبان')
    expect(complex.roots).toEqual(['i', '−i'])
  })

  it('reduces a quadratic with a zero leading coefficient to a linear equation', () => {
    const result = solveEquation('quadratic', '0', '2', '-4')
    expect(result.kind).toBe('linear')
    expect(result.roots).toEqual(['2'])
    expect(result.steps[0]?.title).toBe('خفض درجة المعادلة')
  })

  it('distinguishes inconsistent and underdetermined equations with correct zero-coefficient forms', () => {
    const inconsistent = solveEquation('linear', '0', '5')
    const identity = solveEquation('linear', '0', '0')
    expect(inconsistent.status).toBe('none')
    expect(inconsistent.steps[0]?.formula).toBe('5 = 0')
    expect(identity.status).toBe('infinite')
    expect(identity.steps[0]?.formula).toBe('0 = 0')
  })

  it('rejects malformed and non-finite coefficients', () => {
    expect(solveEquation('linear', '', '2').status).toBe('invalid')
    expect(solveEquation('quadratic', '1', 'Infinity', '3').status).toBe('invalid')
  })
})
