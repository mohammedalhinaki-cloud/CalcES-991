import type { BigNumber } from 'mathjs'
import type { AngleUnit } from '../state/types'
import { math } from './mathInstance'
export type ResultFormat='decimal'|'fraction'|'dms'|'engineering'
export interface FormatOptions { format?:ResultFormat; engineeringOffset?:number; angle?:AngleUnit }
const decimal=(value:BigNumber)=>math.format(value,{precision:14,lowerExp:-9,upperExp:12})
export function formatScientific(value:BigNumber,options:FormatOptions={}):string {
  if(options.format==='fraction'){
    // A binary approximation proposes a rational; accept it only after 64-digit verification.
    if(value.abs().gt('1e12'))return decimal(value)
    const f=math.fraction(math.number(value))
    if(f.d>1000000n)return decimal(value)
    const numerator=math.bignumber(String(f.n)).times(String(f.s))
    const rational=math.divide(numerator,math.bignumber(String(f.d))) as BigNumber
    if(!rational.eq(value))return decimal(value)
    return `${f.s<0n?'-':''}${f.n}${f.d===1n?'':`/${f.d}`}`
  }
  if(options.format==='engineering'){
    const exponent=value.isZero()?0:Math.floor(value.e/3)*3+(options.engineeringOffset??0)
    const mantissa=math.divide(value,math.pow(math.bignumber(10),exponent)) as BigNumber
    return `${decimal(mantissa)}×10^${exponent}`
  }
  if(options.format==='dms'){
    const degrees=(options.angle==='RAD'?math.multiply(value,math.divide(math.bignumber(180),math.bignumber(math.pi))):options.angle==='GRA'?math.multiply(value,math.bignumber('0.9')):value) as BigNumber
    const seconds=math.round(math.multiply(math.abs(degrees),math.bignumber(3600)) as BigNumber,8) as BigNumber
    const d=math.floor(math.divide(seconds,math.bignumber(3600)) as BigNumber) as BigNumber
    const m=math.floor(math.divide(math.mod(seconds,math.bignumber(3600)),math.bignumber(60)) as BigNumber) as BigNumber
    const s=math.mod(seconds,60) as BigNumber
    return `${value.isNegative()?'-':''}${d}°${m}′${decimal(s)}″`
  }
  return decimal(value)
}
