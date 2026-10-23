import { describe, expect, it } from 'vitest'
import { evaluateScientific, emptyVariables } from '../../engine/evaluate'
import { formatScientific } from '../../engine/formatResult'
import { math } from '../../engine/mathInstance'
import { previewCalculation } from '../../editor/previewCalculation'

describe('real scientific arithmetic',()=>{
  it.each([
    ['0.1+0.2','0.3'],['200\\times10\\%','20'],['2+3\\times4','14'],
    ['5!','120'],['0!','1'],['2^{3!}','64'],['-2^2','-4'],['2^{23}','8388608'],['2^23','12'],
    ['\\sqrt[3]{-8}','-2'],['\\sqrt[4]{16}','2'],['\\sqrt9','3'],
    ['\\left|-12\\right|','12'],['\\operatorname{abs}(-3)','3'],['\\operatorname{\\mathrm{abs}}(-3)','3'],
    ['\\log(1000)','3'],['\\ln(e)','1'],['\\log_{2}(8)','3'],['e^{0}','1'],
    ['\\sin(30)','0.5'],['\\sin(180)','0'],['\\cos(90)','0'],['\\tan(45)','1'],
    ['\\sin^{-1}(0.5)','30'],['\\arccos(0.5)','60'],['\\arctan(1)','45'],
    ['\\operatorname{sinh}(0)','0'],['\\operatorname{cosh}(0)','1'],['\\operatorname{sinh}^{-1}(0)','0'],
  ])('%s = %s',(latex,expected)=>expect(formatScientific(evaluateScientific(latex))).toBe(expected))
  it('uses angle units and explicit degree literals consistently',()=>{
    expect(formatScientific(evaluateScientific('\\sin(\\pi/2)',{angle:'RAD'}))).toBe('1')
    expect(formatScientific(evaluateScientific('\\sin(100)',{angle:'GRA'}))).toBe('1')
    expect(formatScientific(evaluateScientific('\\arcsin(1)',{angle:'GRA'}))).toBe('100')
    expect(formatScientific(evaluateScientific('\\sin(30^{\\circ})',{angle:'RAD'}))).toBe('0.5')
    expect(formatScientific(evaluateScientific("12^{\\circ}30'"))).toBe('12.5')
  })
  it('reads exact stored values and Ans without evaluating past expressions',()=>{
    expect(evaluateScientific('A+\\mathrm{Ans}',{variables:{...emptyVariables,A:'0.1'},answer:'0.2'}).toString()).toBe('0.3')
  })
  it.each(['1/0','\\sqrt{-1}','\\ln(0)','\\ln(-1)','\\arcsin(2)','\\tan(90)','\\tan(100)','(-1)!','1.5!','1001!'])('rejects domain/limit violations %s',latex=>{
    const options=latex==='\\tan(100)'?{angle:'GRA' as const}:{}
    expect(()=>evaluateScientific(latex,options)).toThrow()
    expect(previewCalculation(latex,options).status).toBe('error')
  })
  it('preserves 64-digit intermediates rather than calculating with display-rounded values',()=>{
    const third=evaluateScientific('1/3').toString()
    const result=evaluateScientific('\\mathrm{Ans}\\times3',{answer:third})
    expect(result.minus(1).abs().lt('1e-60')).toBe(true)
  })
})
describe('display formats do not modify the numeric value',()=>{
  it('formats exact small rational results and keeps irrational approximations decimal',()=>{
    expect(formatScientific(evaluateScientific('-1/2'),{format:'fraction'})).toBe('-1/2')
    expect(formatScientific(evaluateScientific('1/3'),{format:'fraction'})).toBe('1/3')
    expect(formatScientific(evaluateScientific('\\pi'),{format:'fraction'})).not.toContain('/')
  })
  it('formats engineering exponents and handles zero',()=>{
    expect(formatScientific(math.bignumber('123456'),{format:'engineering'})).toBe('123.456×10^3')
    expect(formatScientific(math.bignumber('123456'),{format:'engineering',engineeringOffset:-3})).toBe('123456×10^0')
    expect(formatScientific(math.bignumber(0),{format:'engineering'})).toBe('0×10^0')
  })
  it('formats degree/minute/second values with rollover and radians',()=>{
    expect(formatScientific(math.bignumber('12.5'),{format:'dms'})).toBe('12°30′0″')
    expect(formatScientific(math.bignumber('12.999999999999999'),{format:'dms'})).toBe('13°0′0″')
    expect(formatScientific(evaluateScientific('\\pi/2'),{format:'dms',angle:'RAD'})).toBe('90°0′0″')
  })
})
