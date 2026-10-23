import type { BigNumber, Complex } from 'mathjs'
import type { AngleUnit } from '../state/types'
import type { AdvancedResult } from './advancedTypes'
import { math } from './mathInstance'
import { bn, decimal, matrixInput, real, realFunction, show } from './advancedMath'
export function solveRoot(latex:string,lower:string,upper:string,angle:AngleUnit='RAD'):AdvancedResult {
 const sides=latex.split('=')
 if(sides.length>2||sides.some(part=>!part.trim()))throw new Error('أدخل تعبيرًا أو معادلة بطرفين')
 const expression=sides.length===2?`\\left(${sides[0]}\\right)-\\left(${sides[1]}\\right)`:latex
 const f=realFunction(expression,angle)
 let a=decimal(lower),b=decimal(upper)
 if(!a.lt(b))throw new Error('يجب أن يكون الحد الأدنى أصغر من الأعلى')
 let fa=f(a),fb=f(b),root=a,residual=fa,iterations=0
 const fScale=fa.abs().gt(fb.abs())?fa.abs():fb.abs()
 if(fa.isZero()){root=a;residual=fa}
 else if(fb.isZero()){root=b;residual=fb}
 else{
  const midpoint=a.plus(b).div(2),fm=f(midpoint)
  if(fm.isZero()){root=midpoint;residual=fm}
  else{
   if(fa.isNegative()===fb.isNegative())throw new Error('اختر مجالًا تتغير فيه إشارة الدالة؛ الجذر الزوجي قد لا يُحصر بهذه الطريقة')
   for(iterations=1;iterations<=220;iterations++){
    root=a.plus(b).div(2);residual=f(root)
    const narrow=b.minus(a).abs().lte(root.abs().plus(1).times('1e-12'))
    if(residual.isZero()||narrow&&residual.abs().lte(fScale.times('1e-12')))break
    if(residual.isNegative()===fa.isNegative()){a=root;fa=residual}else{b=root;fb=residual}
   }
   if(iterations>220)throw new Error('لم يتقارب جذر ذو باقٍ مقبول؛ قد توجد نقطة انقطاع')
  }
 }
 return {title:'حل f(x) = 0',lines:[{label:'x',value:show(root)},{label:'الباقي f(x)',value:show(residual)},{label:'التكرارات',value:String(iterations)}],scalar:root.toString(),note:'حل عددي لجذر واحد داخل مجال. يشترط الاستمرارية وتغيّر الإشارة، ولا يحصر جميع الجذور.'}
}
export function solveLinear(first:string[][],right:string[]):AdvancedResult {
 const a=matrixInput(first),b=right.map(decimal)
 if(a.length!==a[0]!.length||a.length!==b.length||a.length<2)throw new Error('أدخل نظامًا مربعًا من معادلتين أو ثلاث')
 if(real(math.det(a)).isZero())throw new Error('لا يوجد حل وحيد لهذا النظام')
 const values=math.lusolve(a,b) as BigNumber[][]
 a.forEach((row,i)=>{const check=row.reduce((sum,c,j)=>sum.plus(c.times(real(values[j]![0]))),bn(0));if(check.minus(b[i]!).abs().gt(b[i]!.abs().plus(1).times('1e-25')))throw new Error('النظام سيئ التكييف؛ تعذر التحقق من الحل')})
 return {title:'حل النظام الخطي',lines:values.map((row,i)=>({label:`x${i+1}`,value:show(real(row[0]))}))}
}
export function solvePolynomial(input:string[]):AdvancedResult {
 if(input.length<3||input.length>4)throw new Error('المعاملات لكثير حدود من الدرجة الثانية أو الثالثة')
 const coefficients=input.map(decimal)
 while(coefficients.length>1&&coefficients[0]!.isZero())coefficients.shift()
 if(coefficients.length<2)throw new Error(coefficients[0]!.isZero()?'عدد لا نهائي من الحلول':'لا توجد جذور')
 const scale=coefficients.reduce((v,c)=>v.gt(c.abs())?v:c.abs(),bn(0))
 const normalized=coefficients.map(c=>math.number(c.div(scale)))
 if(normalized.some((v,i)=>v===0&&!coefficients[i]!.isZero()))throw new Error('تفاوت المعاملات يتجاوز دقة محلل كثيرات الحدود')
 const ascending=[...normalized].reverse()
 const roots=ascending.length===4?math.polynomialRoot(ascending[0]!,ascending[1]!,ascending[2]!,ascending[3]!):ascending.length===3?math.polynomialRoot(ascending[0]!,ascending[1]!,ascending[2]!):math.polynomialRoot(ascending[0]!,ascending[1]!)
 if(!roots.length)throw new Error('لم يُعثر على جذور')
 for(const root of roots){
  let value:number|Complex=normalized[0]!,bound=math.abs(normalized[0]!)
  for(const coefficient of normalized.slice(1)){value=math.add(math.multiply(value,root),coefficient) as number|Complex;bound=math.add(math.multiply(bound,math.abs(root)),math.abs(coefficient)) as number}
  if(!Number.isFinite(Number(math.abs(value)))||Number(math.abs(value))>1e-8*Math.max(1,Number(bound)))throw new Error('تعذر التحقق من الجذور بدقة كافية؛ المعاملات سيئة التكييف')
 }
 return {title:'جذور كثير الحدود',lines:roots.map((root,i)=>({label:`x${i+1}`,value:math.format(root,{precision:14})})),note:'محلل polynomialRoot في math.js بدقة الآلة (تقريبًا 15 رقمًا)؛ قد تدمج المكتبة الجذور المكررة.'}
}
