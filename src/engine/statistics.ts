import type { BigNumber } from 'mathjs'
import type { AdvancedResult } from './advancedTypes'
import { math } from './mathInstance'
import { bn, decimal, real, show } from './advancedMath'
export function statistics(operation:'summary'|'regression',data:string):AdvancedResult {
 if(data.length>30000)throw new Error('البيانات أطول من الحد المسموح')
 if(operation==='summary'){
  const xs=data.trim().split(/[\s,;]+/).filter(Boolean).map(decimal)
  if(!xs.length||xs.length>1000)throw new Error('أدخل بين 1 و1000 قيمة')
  const mean=real(math.mean(xs)),population=real(math.std(xs,'uncorrected'))
  return {title:'إحصاء متغير واحد',lines:[{label:'n',value:String(xs.length)},{label:'المتوسط',value:show(mean)},{label:'الانحراف السكاني σ',value:show(population)},{label:'الانحراف العيني s',value:xs.length>1?show(real(math.std(xs,'unbiased'))):'غير معرّف لعينة واحدة'}]}
 }
 const rows=data.trim().split(/\n+/).map(line=>line.trim().split(/[\s,;]+/).filter(Boolean))
 if(rows.length<2||rows.length>1000||rows.some(row=>row.length!==2))throw new Error('أدخل من 2 إلى 1000 صف؛ كل صف يحتوي x وy')
 const xs=rows.map(row=>decimal(row[0]!)),ys=rows.map(row=>decimal(row[1]!))
 const mx=real(math.mean(xs)),my=real(math.mean(ys))
 let sxx=bn(0),syy=bn(0),sxy=bn(0)
 xs.forEach((x,i)=>{const dx=x.minus(mx),dy=ys[i]!.minus(my);sxx=sxx.plus(dx.times(dx));syy=syy.plus(dy.times(dy));sxy=sxy.plus(dx.times(dy))})
 if(sxx.isZero())throw new Error('الانحدار غير معرّف عندما تكون جميع قيم x متساوية')
 const slope=sxy.div(sxx),intercept=my.minus(slope.times(mx))
 const r=syy.isZero()?null:sxy.div(real(math.sqrt(sxx.times(syy))))
 return {title:'انحدار خطي y = a + bx',lines:[{label:'n',value:String(xs.length)},{label:'a (الثابت)',value:show(intercept)},{label:'b (الميل)',value:show(slope)},{label:'r',value:r?show(r):'غير معرّف'},{label:'R²',value:r?show(r.times(r)):'غير معرّف'}]}
}
