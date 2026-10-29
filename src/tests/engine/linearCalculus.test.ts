import {describe,expect,it} from 'vitest'
import {parseLinearCalculus} from '../../editor/linearCalculus'
import {calculateLinearCalculus,integrate} from '../../engine/calculus'
import {calculateAdvanced} from '../../engine/advancedDispatcher'
describe('linear calculus parser and math.js execution',()=>{
 it('accepts the documented plain-text Casio spelling and X',()=>{
  expect(Number(integrate('∫(cos(X),0,1)').scalar)).toBeCloseTo(Math.sin(1),10)
 })
 it('handles nested functions, LaTeX fractions and commas at their own depth',()=>{
  expect(parseLinearCalculus('∫(cos(X+log(X,2)),0,1)')).toEqual({kind:'integrate',func:'cos(X+log(X,2))',args:['0','1']})
  expect(Number(calculateLinearCalculus('\\int\\left(\\frac{X^2}{2},0,2\\right)').scalar)).toBeCloseTo(4/3,12)
 })
 it('evaluates expressions in bounds without a separate floating-point engine',()=>{
  expect(Number(calculateLinearCalculus('∫(sin(X),0,\\pi)').scalar)).toBeCloseTo(2,9)
  expect(Number(calculateLinearCalculus('∫(X,1/2,1)').scalar)).toBeCloseTo(0.375,12)
 })
 it('honors the selected angular unit',()=>{
  expect(Number(calculateLinearCalculus('∫(cos(X),0,1)','DEG').scalar)).toBeCloseTo(Math.sin(Math.PI/180)/(Math.PI/180),10)
 })
 it('supports reversed integral bounds',()=>expect(Number(calculateLinearCalculus('∫(X^2,1,0)').scalar)).toBeCloseTo(-1/3,12))
 it('differentiates symbolically or evaluates at an inline point',()=>{
  expect(calculateLinearCalculus('\\operatorname{d/dx}(X^3,2)').scalar).toBe('12')
  expect(calculateLinearCalculus('d/dx(X^3)').lines[0]?.value).toContain('x ^ 2')
 })
 it('solves a scalar equation from the same inline syntax',()=>{
  expect(Number(calculateLinearCalculus('\\operatorname{SOLVE}(X^2=2,0,2)').scalar)).toBeCloseTo(Math.SQRT2,10)
 })
 it('works through the existing worker dispatcher',()=>expect(calculateAdvanced({kind:'linear-calculus',latex:'∫(X,0,2)',angle:'RAD'}).scalar).toBe('2'))
 it.each(['∫(cos(X),0,1','∫(X,0)','∫(X,,1)','∫(X,0,1,2)','∫(X,0,1)+1','∫(X,0,1)]','∫(X,\\placeholder{},1)','∫(X,foo,1)','∫(X,X,1)','∫(X,1/0,2)','d/dx(X,1,2)','SOLVE(X,2,1)','∫(import("bad"),0,1)'])('reports Syntax ERROR for invalid input: %s',latex=>{
  expect(()=>calculateLinearCalculus(latex)).toThrow('Syntax ERROR')
 })
})
