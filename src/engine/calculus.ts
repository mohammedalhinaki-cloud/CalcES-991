import type { BigNumber } from 'mathjs'
import type { AngleUnit } from '../state/types'
import type { AdvancedResult } from './advancedTypes'
import { math } from './mathInstance'
import { bn, decimal, functionNode, real, realFunction, show } from './advancedMath'
export function integrate(latex:string,lower:string,upper:string,angle:AngleUnit='RAD'):AdvancedResult {
 let a=decimal(lower),b=decimal(upper),sign=bn(1)
 const f=realFunction(latex,angle)
 if(a.gt(b)){[a,b]=[b,a];sign=bn(-1)}
 if(a.eq(b))return {title:'التكامل المحدد',lines:[{label:'القيمة',value:'0'}],scalar:'0'}
 let evaluations=0,errorTotal=bn(0)
 const sample=(x:BigNumber)=>{if(++evaluations>20000)throw new Error('لم يتقارب التكامل ضمن حد التقييمات');return f(x)}
 const simpson=(l:BigNumber,r:BigNumber,fl:BigNumber,fm:BigNumber,fr:BigNumber)=>r.minus(l).times(fl.plus(fm.times(4)).plus(fr)).div(6)
 function adapt(l:BigNumber,r:BigNumber,fl:BigNumber,fm:BigNumber,fr:BigNumber,whole:BigNumber,tolerance:BigNumber,depth:number):BigNumber {
  const mid=l.plus(r).div(2),f1=sample(l.plus(mid).div(2)),f2=sample(mid.plus(r).div(2))
  const left=simpson(l,mid,fl,f1,fm),right=simpson(mid,r,fm,f2,fr),difference=left.plus(right).minus(whole)
  if(difference.abs().lte(tolerance.times(15))){errorTotal=errorTotal.plus(difference.abs().div(15));return left.plus(right).plus(difference.div(15))}
  if(depth===0)throw new Error('لم يتقارب التكامل؛ تحقق من الاستمرارية وحدود التكامل')
  return adapt(l,mid,fl,f1,fm,left,tolerance.div(2),depth-1).plus(adapt(mid,r,fm,f2,fr,right,tolerance.div(2),depth-1))
 }
 let value=bn(0)
 for(let i=0;i<16;i++){
  const l=a.plus(b.minus(a).times(i).div(16)),r=a.plus(b.minus(a).times(i+1).div(16)),mid=l.plus(r).div(2)
  const fl=sample(l),fm=sample(mid),fr=sample(r),whole=simpson(l,r,fl,fm,fr)
  value=value.plus(adapt(l,r,fl,fm,fr,whole,bn('1e-10').div(16).plus(whole.abs().times('1e-10')),32))
 }
 value=real(value.times(sign))
 if(errorTotal.gt(bn('1e-10').plus(value.abs().times('1e-10'))))throw new Error('الإلغاء العددي يمنع تحقيق الدقة المطلوبة؛ عدّل مجال التكامل')
 return {title:'التكامل المحدد',lines:[{label:'القيمة',value:show(value)},{label:'تقدير الخطأ',value:show(errorTotal)},{label:'تقييمات الدالة',value:String(evaluations)}],scalar:value.toString(),note:'Simpson تكيفي؛ تقدير الخطأ ليس برهانًا. مطلوب مجال منتهٍ ودالة مستمرة دون أقطاب.'}
}
export function derivative(latex:string,point:string,angle:AngleUnit='RAD'):AdvancedResult {
 const node=math.derivative(functionNode(latex,angle),'x')
 const lines=[{label:'المشتقة',value:node.toString()}]
 let scalar:string|undefined
 if(point.trim()){
  const value=real(node.evaluate({x:decimal(point)}))
  scalar=value.toString();lines.push({label:'القيمة عند النقطة',value:show(value)})
 }
 return {title:'الاشتقاق الرمزي',lines,scalar,note:`وحدة الزوايا: ${angle}. تحويلات الزوايا داخلة في المشتقة.`}
}
