import { all, create } from 'mathjs'
import type { Complex } from 'mathjs'
import type { AngleUnit } from '../state/types'
import type { AdvancedResult } from './advancedTypes'
import { latexToExpression } from '../editor/latexToExpression'
import { validateArithmetic, decimal } from './advancedMath'
// math.js Complex uses IEEE-754 components; never silently coerce BigNumber + Complex.
const cm=create(all,{number:'number'})
function scale(angle:AngleUnit){return angle==='RAD'?1:cm.divide(cm.pi,angle==='GRA'?200:180)}
function output(value:unknown,angle:AngleUnit):AdvancedResult {
 const z=typeof value==='number'?cm.complex(value):value
 if(!cm.isComplex(z)||!Number.isFinite(z.re)||!Number.isFinite(z.im))throw new Error('نتيجة مركبة غير منتهية أو خارج المجال')
 const radius=cm.abs(z),theta=cm.divide(cm.arg(z),scale(angle))
 return {title:'الأعداد المركبة',...(z.im===0?{scalar:String(z.re)}:{}),lines:[{label:'a + bi',value:cm.format(z,{precision:14})},{label:'r',value:cm.format(radius,{precision:14})},{label:`θ (${angle})`,value:radius===0?'غير معرّف':cm.format(theta,{precision:14})}],note:'المركبات ديكارتية وقطبية بدقة الآلة؛ الزاوية الرئيسية ضمن (−π، π] بالراديان وما يكافئها.'}
}
export function evaluateComplex(latex:string,angle:AngleUnit):AdvancedResult {
 const node=cm.parse(latexToExpression(latex,{symbols:['i'],polar:true}))
 validateArithmetic(node,['i'],['arg','polar','factorial'])
 const factor=scale(angle)
 const scope:Record<string,unknown>={}
 for(const name of ['sin','cos','tan'] as const)scope[name]=(x:number|Complex)=>cm[name](cm.multiply(x,factor) as Complex)
 for(const name of ['asin','acos','atan'] as const)scope[name]=(x:Complex)=>cm.divide((name==='asin'?cm.asin(x):name==='acos'?cm.acos(x):cm.atan(x)),factor)
 scope.arg=(x:Complex)=>cm.divide(cm.arg(x),factor)
 scope.polar=(r:number,theta:number)=>{if(typeof r!=='number'||typeof theta!=='number'||r<0)throw new Error('أدخل نصف قطر غير سالب وزاوية حقيقية');return cm.complex({r,phi:cm.multiply(theta,factor)})}
 scope.factorial=(x:number)=>{if(!Number.isInteger(x)||x<0||x>170)throw new Error('مضروب الوضع المركب من 0 إلى 170');return cm.factorial(x)}
 return output(node.evaluate(scope),angle)
}
export function fromPolar(radius:string,theta:string,angle:AngleUnit):AdvancedResult {
 const r=Number(decimal(radius).toString()),t=Number(decimal(theta).toString())
 if(r<0||!Number.isFinite(r)||!Number.isFinite(t))throw new Error('نصف القطر يجب أن يكون غير سالب والقيم منتهية')
 return output(cm.complex({r,phi:cm.multiply(t,scale(angle))}),angle)
}
