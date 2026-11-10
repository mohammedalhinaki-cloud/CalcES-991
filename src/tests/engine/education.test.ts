import {describe,it,expect} from 'vitest'
import {quadratic,convert,categories,constants} from '../../education/tools'
describe('educational equations',()=>{
 it('explains real, repeated and complex roots',()=>{
  expect(quadratic('1','-3','2')).toMatchObject({discriminant:'1',kind:'real',roots:['2','1']})
  expect(quadratic('1','2','1')).toMatchObject({discriminant:'0',kind:'repeated',roots:['-1','-1']})
  expect(quadratic('1','0','1')).toMatchObject({discriminant:'-4',kind:'complex',roots:['0 + 1i','0 − 1i']})
  expect(quadratic('-1','0','-1').roots).toEqual(['0 + 1i','0 − 1i'])
 })
 it('keeps the small root for badly scaled coefficients',()=>{
  expect(quadratic('1','1e20','1').roots).toEqual(['-1e+20','-1e-20'])
  expect(quadratic('1','0','0').roots).toEqual(['0','0'])
 })
 it('rejects invalid and degenerate coefficients',()=>{
  for(const a of ['0','NaN','Infinity','','1+2'])expect(()=>quadratic(a,'1','1')).toThrow()
 })
})
describe('offline conversions',()=>{
 it.each([
  ['1','length','mi','m',1609.344],['12','length','in','ft',1],['1','mass','lb','kg',.45359237],
  ['32','temperature','F','C',0],['100','temperature','C','F',212],['0','temperature','K','C',-273.15],
  ['-40','temperature','C','F',-40],['1','area','acre','m2',4046.8564224],
  ['1','volume','galUS','L',3.785411784],['1','volume','galUK','L',4.54609],
  ['36','speed','km/h','m/s',10],['1','time','wk','s',604800],
 ] as const)('converts %s %s %s to %s',(v,c,f,t,expected)=>expect(Number(convert(v,c,f,t))).toBeCloseTo(expected,10))
 it('all units round-trip across each category',()=>{
  for(const [category,group] of Object.entries(categories))for(const unit of group.units){
   const key=category as keyof typeof categories,base=group.units[0]!.id
   const result=convert('300',key,unit.id,base)
   expect(Number(convert(result,key,base,unit.id))).toBeCloseTo(300,10)
  }
 })
 it('rejects below absolute zero, malformed numbers and cross-category units',()=>{
  expect(()=>convert('-0.01','temperature','K','C')).toThrow()
  expect(()=>convert('-274','temperature','C','F')).toThrow()
  expect(()=>convert('abc','length','m','km')).toThrow()
  expect(()=>convert('1','length','m','kg')).toThrow()
 })
 it('provides numeric values and units for every reference constant',()=>{
  expect(constants.length).toBeGreaterThanOrEqual(10)
  expect(new Set(constants.map(c=>c.symbol)).size).toBe(constants.length)
  for(const c of constants){expect(Number(c.value)).toBeGreaterThan(0);expect(c.unit).not.toBe('')}
  expect(constants.find(c=>c.symbol==='c')?.value).toBe('299792458')
 })
})
