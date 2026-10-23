import { expect, it } from 'vitest'
import { integrate, derivative } from '../../engine/calculus'
import { solveLinear, solvePolynomial } from '../../engine/equations'
import { statistics } from '../../engine/statistics'
import { baseOperation } from '../../engine/baseN'
import type { AngleUnit } from '../../state/types'

// Analytic references independent of the integration/differentiation implementations.
it.each([
 ['e^x','0','1',Math.E-1],
 ['1/(1+x^2)','0','1',Math.PI/4],
 ['\\operatorname{abs}(x-0.3)','0','1',0.29],
 ['\\sin(x)','0','180',360/Math.PI,'DEG'],
 ['\\cos(x)','0','100',200/Math.PI,'GRA'],
] as const)('integral reference: %s on [%s,%s]',(latex,lower,upper,reference,angle?:AngleUnit)=>{
 const value=Number(integrate(latex,lower,upper,angle??'RAD').scalar)
 expect(Math.abs(value-reference)).toBeLessThan(1e-9)
})
it.each([
 ['x^2\\sin(x)','1',2*Math.sin(1)+Math.cos(1),'RAD'],
 ['\\ln(1+x^2)','2',0.8,'RAD'],
 ['\\arctan(x)','1',90/Math.PI,'DEG'],
 ['\\sin(x)','0',Math.PI/200,'GRA'],
] as const)('derivative reference: %s at %s',(latex,point,reference,angle)=>{
 expect(Math.abs(Number(derivative(latex,point,angle).scalar)-reference)).toBeLessThan(1e-12)
})
it('solves a coupled 3x3 system with known integer solution',()=>{
 // [x,y,z]=[2,-1,3]; independent rows, not an identity/diagonal fixture.
 const result=solveLinear([['2','1','-1'],['-3','-1','2'],['-2','1','2']],['0','1','1'])
 expect(result.lines.map(line=>line.value)).toEqual(['2','-1','3'])
})
it('reduces a zero leading cubic coefficient without losing the quadratic roots',()=>{
 expect(solvePolynomial(['0','1','-3','2']).lines.map(line=>Number(line.value)).sort()).toEqual([1,2])
})
it('keeps decimal statistics accurate and rejects malformed data',()=>{
 expect(statistics('summary','0.1 0.2 0.3').lines[1]!.value).toBe('0.2')
 expect(()=>statistics('summary','1 nope 3')).toThrow()
 expect(()=>statistics('regression','1,2\n3')).toThrow()
})
it('preserves the sign bit in hexadecimal XOR and rejects 33-bit input',()=>{
 expect(baseOperation('XOR','80000000','FFFFFFFF',16).lines[0]!.value).toBe('2147483647')
 expect(()=>baseOperation('convert','100000000','',16)).toThrow()
})
