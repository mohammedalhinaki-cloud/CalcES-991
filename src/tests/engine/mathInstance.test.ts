import { describe, expect, it } from 'vitest'
import { math } from '../../engine/mathInstance'

describe('math.js installation and decimal configuration', () => {
  it('adds decimal values without binary rounding artifacts', () => {
    const result = math.evaluate('0.1 + 0.2')
    expect(math.isBigNumber(result)).toBe(true)
    expect(result.toString()).toBe('0.3')
  })
  it('loads the matrix and symbolic differentiation libraries', () => {
    expect(math.det([[1, 2], [3, 4]])).toBe(-2)
    const derivative = math.derivative('x^3', 'x').evaluate({ x: math.bignumber(2) })
    expect(math.isBigNumber(derivative)).toBe(true)
    expect(derivative.toString()).toBe('12')
  })
})
