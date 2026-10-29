import { describe, expect, it } from 'vitest'
import { integrate, derivative } from '../../engine/calculus'
import { solveRoot, solveLinear, solvePolynomial } from '../../engine/equations'
import { matrixOperation } from '../../engine/matrices'
import { statistics } from '../../engine/statistics'
import { baseOperation, parseBase } from '../../engine/baseN'
import { evaluateComplex, fromPolar } from '../../engine/complex'
import { calculateAdvanced } from '../../engine/advancedDispatcher'
import { finiteSum } from '../../engine/summation'
import { emptyVariables } from '../../engine/evaluate'
const near=(value:string|undefined,expected:number,tolerance=1e-9)=>expect(Math.abs(Number(value)-expected)).toBeLessThan(tolerance)

describe('calculus',()=>{
 it('integrates a polynomial and reports a numerical error estimate',()=>{
  const r=integrate('x^2','0','1');near(r.scalar,1/3);expect(r.lines[1]!.label).toContain('الخطأ')
 })
 it('integrates trig in radians, reverses limits and handles zero width',()=>{
  near(integrate('\\sin(x)','0','3.1415926535897932384626433832795').scalar,2)
  near(integrate('x^2','1','0').scalar,-1/3)
  expect(integrate('x','1','1').scalar).toBe('0')
 })
 it('rejects singular samples',()=>expect(()=>integrate('1/x','-1','1')).toThrow())
 it('symbolically differentiates and evaluates with correct chain rule in DEG',()=>{
  near(derivative('x^3','2').scalar,12)
  near(derivative('\\sin(x)','0','RAD').scalar,1)
  near(derivative('\\sin(x)','0','DEG').scalar,Math.PI/180)
  expect(derivative('x^2','','RAD').lines[0]!.value).toContain('x')
 })
})
describe('finite summation',()=>{
 it('uses inclusive integer bounds, 64-digit BigNumber arithmetic, calculator variables, and x/X iteration symbols',()=>{
  expect(finiteSum('x^2','1','3').scalar).toBe('14')
  expect(finiteSum('X^2','1','3').scalar).toBe('14')
  expect(finiteSum('A','1','3','DEG',{...emptyVariables,A:'0.1'}).scalar).toBe('0.3')
 })
 it('honors the selected angle unit and propagates a failing term instead of returning a partial total',()=>{
  expect(finiteSum('\\sin(x)','90','90','DEG').scalar).toBe('1')
  expect(finiteSum('\\sin(x)','100','100','GRA').scalar).toBe('1')
  expect(()=>finiteSum('1/(x-2)','1','3')).toThrow()
 })
 it('rejects fractional, reversed, invalid, and over-limit bounds',()=>{
  expect(()=>finiteSum('x','1.5','3')).toThrow('أعدادًا صحيحة')
  expect(()=>finiteSum('x','3','1')).toThrow('معكوسة')
  expect(()=>finiteSum('x','nope','3')).toThrow()
  expect(()=>finiteSum('x','1','10001')).toThrow('10000')
 })
})
describe('equations',()=>{
 it('solves a bracketed root with a small residual',()=>{
  const r=solveRoot('x^2-2','0','2');near(r.scalar,Math.sqrt(2));near(r.lines[1]!.value,0,1e-11)
 })
 it('rejects missing brackets and poles',()=>{
  expect(()=>solveRoot('x^2+1','-2','2')).toThrow()
  expect(()=>solveRoot('1/x','-1','1')).toThrow()
  expect(()=>solveRoot('10^{-50}','0','2')).toThrow()
  near(solveRoot('10^{-50}(x-1)','0','3').scalar,1)
  near(solveRoot('X^2=2','0','2').scalar,Math.sqrt(2))
 })
 it('solves 2x2 and 3x3 systems and rejects singular systems',()=>{
  expect(solveLinear([['1','1'],['1','-1']],['3','1']).lines.map(x=>x.value)).toEqual(['2','1'])
  expect(solveLinear([['1','0','0'],['0','2','0'],['0','0','3']],['1','4','9']).lines.map(x=>x.value)).toEqual(['1','2','3'])
  expect(()=>solveLinear([['1','2'],['2','4']],['3','6'])).toThrow()
 })
 it('finds quadratic real/complex and cubic roots',()=>{
  expect(solvePolynomial(['1','-3','2']).lines.map(x=>Number(x.value)).sort()).toEqual([1,2])
  expect(solvePolynomial(['1','0','1']).lines.every(x=>x.value.includes('i'))).toBe(true)
  const roots=solvePolynomial(['1','-6','11','-6']).lines.map(x=>Number(x.value)).sort()
  expect(roots.length).toBe(3);roots.forEach((v,i)=>near(String(v),i+1))
 })
})
describe('matrices',()=>{
 const a=[['1','2'],['3','4']]
 it('computes det, inverse and product',()=>{
  expect(matrixOperation('det',a,[]).scalar).toBe('-2')
  expect(matrixOperation('inverse',a,[]).matrix).toEqual([['-2','1'],['1.5','-0.5']])
  expect(matrixOperation('multiply',a,[['1','0'],['0','1']]).matrix).toEqual(a)
 })
 it('preserves small nonzero pivots and rejects singular/dimension errors',()=>{
  expect(matrixOperation('inverse',[['1e-30','0'],['0','1']],[]).matrix?.[0]?.[0]).toBe('1e+30')
  expect(()=>matrixOperation('inverse',[['1','2'],['2','4']],[])).toThrow()
  expect(()=>matrixOperation('multiply',[['1','2']],[['1','2']])).toThrow()
 })
})
describe('statistics',()=>{
 it('computes mean and both standard deviations',()=>{
  const r=statistics('summary','1 2 3 4 5').lines
  expect(r[1]!.value).toBe('3');near(r[2]!.value,Math.sqrt(2));near(r[3]!.value,Math.sqrt(2.5))
 })
 it('fits exact linear data and handles constant x/y',()=>{
  const r=statistics('regression','1,3\n2,5\n3,7').lines
  expect(r.slice(1).map(x=>x.value)).toEqual(['1','2','1','1'])
  expect(()=>statistics('regression','1,2\n1,3')).toThrow()
  expect(statistics('regression','1,2\n2,2').lines[3]!.value).toBe('غير معرّف')
 })
})
describe('complex and signed 32-bit arithmetic',()=>{
 it('computes complex products and polar forms',()=>{
  expect(evaluateComplex('(1+i)^2','DEG').lines[0]!.value).toBe('2i')
  near(fromPolar('2','90','DEG').lines[1]!.value,2)
  near(evaluateComplex('2\\angle90','DEG').lines[2]!.value,90)
  expect(evaluateComplex('\\sqrt{-1}','RAD').lines[0]!.value).toBe('i')
 })
 it('converts signed boundaries and applies bitwise operators',()=>{
  expect(parseBase('FFFFFFFF',16)).toBe(-1n)
  expect(baseOperation('NOT','0','',10).lines[0]!.value).toBe('-1')
  expect(baseOperation('AND','F0','0F',16).lines[0]!.value).toBe('0')
  expect(baseOperation('OR','1010','0101',2).lines[0]!.value).toBe('15')
  expect(baseOperation('XOR','15','3',10).lines[0]!.value).toBe('12')
  expect(baseOperation('convert','-2147483648','',10).lines[3]!.value).toBe('80000000')
  expect(()=>parseBase('2147483648',10)).toThrow();expect(()=>parseBase('2',2)).toThrow()
 })
 it('dispatches typed jobs and rejects unsafe math input',()=>{
  expect(calculateAdvanced({kind:'base',operation:'NOT',a:'0',b:'',base:10}).lines[0]!.value).toBe('-1')
  expect(calculateAdvanced({kind:'sum',latex:'x',lower:'1',upper:'3',angle:'DEG'}).scalar).toBe('6')
  expect(()=>derivative('a=2','0')).toThrow()
  expect(()=>evaluateComplex('\\operatorname{import}(1)','RAD')).toThrow()
 })
})
