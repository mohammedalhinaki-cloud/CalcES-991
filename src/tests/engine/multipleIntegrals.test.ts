import {describe,it,expect} from 'vitest'
import {calculateLinearCalculus} from '../../engine/calculus'
import {isLinearCalculus,integralCalls} from '../../editor/linearCalculus'
import {math} from '../../engine/mathInstance'
describe('independent integrals in one expression',()=>{
 it.each([
  ['∫(X^2,0,1)+∫(3X^2,0,2)',25/3],
  ['∫(X^3,0,2)-∫(X^2,0,3)',-5],
  ['∫(sin(X),0,\\pi)*∫(cos(X),0,\\pi/2)',2],
  ['∫(X,0,2)/∫(X^2,0,1)',6],
  ['2+3*∫(X,0,2)^2-∫(1,0,1)',13],
  ['sqrt(∫(2X,0,1)+∫(3X^2,0,1))',Math.SQRT2],
  ['∫(X,0,1)∫(X,0,2)',1],
  ['\\frac{\\int(X,0,2)}{\\int(X^2,0,1)}',6],
  ['∫(X^2,1,0)+∫(X^2,0,1)',0],
  ['∫(1,0,5)!+∫(X,0,2)',122],
  ['sin(∫(1,0,\\pi/2))+∫(1,0,1)',2],
  ['∫(10^{20},0,1)-∫(10^{20},0,1)+∫(X,0,2)',2],
 ] as const)('evaluates %s with correct arithmetic precedence',(source,expected)=>{
  expect(isLinearCalculus(source)).toBe(true)
  expect(Number(calculateLinearCalculus(source,'RAD').scalar)).toBeCloseTo(expected,9)
 })
 it('retains BigNumber precision for small operands',()=>{
  const value=math.bignumber(calculateLinearCalculus('∫(10^{-30},0,1)+∫(10^{-30},0,1)').scalar!)
  expect(value.minus('2e-30').abs().lt('1e-80')).toBe(true)
 })
 it('retains the COMP trigonometric domain checks around integral operands',()=>{
  expect(()=>calculateLinearCalculus('tan(∫(1,0,90))+∫(1,0,1)','DEG')).toThrow()
  expect(()=>calculateLinearCalculus('∫(1,0,1001)!+∫(1,0,1)')).toThrow()
 })
 it('honors DEG for both independent integrals',()=>{
  const expected=2*Math.sin(Math.PI/180)/(Math.PI/180)
  expect(Number(calculateLinearCalculus('∫(cos(X),0,1)+∫(cos(X),0,1)','DEG').scalar)).toBeCloseTo(expected,10)
 })
 it('finds complete operands without absorbing arithmetic between them',()=>{
  const calls=integralCalls('2+\\int\\left(\\cos(X),0,1\\right)+\\int(X^2,0,2)')
  expect(calls).toHaveLength(2)
  expect(calls[0]!.latex).toBe('\\int\\left(\\cos(X),0,1\\right)')
 })
 it.each(['∫(X,0,1)+∫(X,0)','∫(X,0,1)+∫(X,,1)','∫(X,0,1)+∫(X,0,1','∫(X,0,1)+import("bad")','X+∫(X,0,1)'])('rejects incomplete or unsafe expressions: %s',source=>expect(()=>calculateLinearCalculus(source)).toThrow('Syntax ERROR'))
 it('does not hide a pole inside one of the operands',()=>expect(()=>calculateLinearCalculus('∫(1/X,-1,1)+∫(X,0,1)')).toThrow())
})
