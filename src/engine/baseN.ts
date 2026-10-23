import type { AdvancedResult } from './advancedTypes'
import { math } from './mathInstance'
const WIDTH=4294967296n,HALF=2147483648n
function signed(value:bigint):bigint {const u=math.mod(value,WIDTH);return u>=HALF?math.subtract(u,WIDTH):u}
export function parseBase(value:string,base:2|8|10|16):bigint {
 let text=value.trim().toUpperCase()
 if(text.length>40||!text)throw new Error('أدخل عددًا صحيحًا صالحًا')
 const negative=text.startsWith('-');if(negative||text.startsWith('+'))text=text.slice(1)
 const prefixes={2:'0B',8:'0O',10:'',16:'0X'}
 if(prefixes[base]&&text.startsWith(prefixes[base]))text=text.slice(2)
 const pattern=base===2?/^[01]+$/:base===8?/^[0-7]+$/:base===10?/^\d+$/:/^[0-9A-F]+$/
 if(!pattern.test(text))throw new Error('رقم غير صالح للأساس المختار')
 const magnitude=math.bigint(prefixes[base].toLowerCase()+text)
 if(magnitude>(negative?HALF:base===10?HALF-1n:WIDTH-1n))throw new Error('العدد خارج مجال 32 بت')
 return signed(negative?math.unaryMinus(magnitude):magnitude)
}
export function baseOperation(operation:'convert'|'AND'|'OR'|'XOR'|'NOT',left:string,right:string,base:2|8|10|16):AdvancedResult {
 const a=parseBase(left,base)
 const b=operation==='convert'||operation==='NOT'?0n:parseBase(right,base)
 const result=signed(operation==='AND'?math.bitAnd(a,b):operation==='OR'?math.bitOr(a,b):operation==='XOR'?math.bitXor(a,b):operation==='NOT'?math.bitNot(a):a)
 const unsigned=result<0n?math.add(result,WIDTH):result
 return {title:'BASE-N · signed 32-bit',lines:[{label:'DEC',value:result.toString()},{label:'BIN',value:unsigned.toString(2)},{label:'OCT',value:unsigned.toString(8)},{label:'HEX',value:unsigned.toString(16).toUpperCase()}],note:'السالب في BIN/OCT/HEX معروض بالمتمم الثنائي ذي 32 بت. DEC ضمن −2147483648 إلى 2147483647.'}
}
