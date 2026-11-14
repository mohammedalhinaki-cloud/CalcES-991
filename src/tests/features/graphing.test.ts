import { describe, expect, it } from 'vitest'
import { buildGraphPlot } from '../../features/graphing/buildGraphPlot'
import { compileGraphExpression } from '../../features/graphing/compileGraphExpression'

describe('local graph expression engine', () => {
  it('evaluates arithmetic, functions, constants, and implicit multiplication', () => {
    expect(compileGraphExpression('x^2 + 2x')(3)).toBe(15)
    expect(compileGraphExpression('sin(pi/2)')(0)).toBeCloseTo(1)
  })

  it('rejects unknown symbols, executable nodes, and inherited function names', () => {
    expect(() => compileGraphExpression('y + x')).toThrow('استخدم x فقط')
    expect(() => compileGraphExpression('x = 3')).toThrow()
    expect(() => compileGraphExpression('import("x")')).toThrow()
    expect(() => compileGraphExpression('constructor(x)')).toThrow('اسم الدالة غير مدعوم')
    expect(() => compileGraphExpression('__proto__(x)')).toThrow('اسم الدالة غير مدعوم')
    expect(() => compileGraphExpression('toString(x)')).toThrow('اسم الدالة غير مدعوم')
  })

  it('builds a finite SVG path and reports invalid series locally', () => {
    const plot = buildGraphPlot([
      { id: 1, expression: 'sin(x)' },
      { id: 2, expression: 'y + 1' },
    ], -10, 10, ['#63d6c5', '#a994ff'])
    expect(plot.series[0]?.path.startsWith('M')).toBe(true)
    expect(plot.series[0]?.path).toContain('L')
    expect(plot.series[1]?.error).toContain('استخدم x فقط')
    expect(plot.series[1]?.path).toBe('')
  })
})
