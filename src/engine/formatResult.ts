import type { BigNumber } from 'mathjs'
import type { AngleUnit } from '../state/types'
import { math } from './mathInstance'
export type ResultFormat='decimal'|'fraction'|'dms'|'engineering'
export interface FormatOptions {
  format?:ResultFormat
  engineeringOffset?:number
  angle?:AngleUnit
  notation?:'norm'|'fix'|'sci'
  digits?:number
}
const DEFAULT_PRECISION=14
const MAX_DISPLAY_DIGITS=14
const decimal=(value:BigNumber)=>math.format(value,{precision:DEFAULT_PRECISION,lowerExp:-9,upperExp:12})
function displayDigits(digits:number|undefined):number {
  if(!Number.isFinite(digits))return DEFAULT_PRECISION
  return Math.min(MAX_DISPLAY_DIGITS,Math.max(0,Math.trunc(digits!)))
}
function decimalWithNotation(value:BigNumber,options:FormatOptions):string {
  if(options.notation==='fix')return math.format(value,{notation:'fixed',precision:displayDigits(options.digits)})
  // SCI uses significant digits, whereas FIX uses decimal places. SCI 0 means 10 digits.
  if(options.notation==='sci')return math.format(value,{notation:'exponential',precision:displayDigits(options.digits)||10})
  return decimal(value)
}
export function formatScientific(value:BigNumber,options:FormatOptions={}):string {
  if(options.format==='fraction'){
    // A binary approximation proposes a rational; accept it only after 64-digit verification.
    if(value.abs().gt('1e12'))return decimalWithNotation(value,options)
    const f=math.fraction(math.number(value))
    if(f.d>1000000n)return decimalWithNotation(value,options)
    const numerator=math.bignumber(String(f.n)).times(String(f.s))
    const rational=math.divide(numerator,math.bignumber(String(f.d))) as BigNumber
    if(!rational.eq(value))return decimalWithNotation(value,options)
    return `${f.s<0n?'-':''}${f.n}${f.d===1n?'':`/${f.d}`}`
  }
  if(options.format==='engineering'){
    const exponent=value.isZero()?0:Math.floor(value.e/3)*3+(options.engineeringOffset??0)
    const mantissa=math.divide(value,math.pow(math.bignumber(10),exponent)) as BigNumber
    return `${decimalWithNotation(mantissa,options)}×10^${exponent}`
  }
  if(options.format==='dms'){
    const degrees=(options.angle==='RAD'?math.multiply(value,math.divide(math.bignumber(180),math.bignumber(math.pi))):options.angle==='GRA'?math.multiply(value,math.bignumber('0.9')):value) as BigNumber
    const seconds=math.round(math.multiply(math.abs(degrees),math.bignumber(3600)) as BigNumber,8) as BigNumber
    const d=math.floor(math.divide(seconds,math.bignumber(3600)) as BigNumber) as BigNumber
    const m=math.floor(math.divide(math.mod(seconds,math.bignumber(3600)),math.bignumber(60)) as BigNumber) as BigNumber
    const s=math.mod(seconds,60) as BigNumber
    return `${value.isNegative()?'-':''}${d}°${m}′${decimal(s)}″`
  }
  return decimalWithNotation(value,options)
}
