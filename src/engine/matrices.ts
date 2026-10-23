import type { BigNumber } from 'mathjs'
import type { AdvancedResult } from './advancedTypes'
import { math } from './mathInstance'
import { bn, matrixInput, real, show } from './advancedMath'
export function matrixOperation(operation:'det'|'inverse'|'multiply',first:string[][],second:string[][]):AdvancedResult {
 const a=matrixInput(first)
 if(operation!=='multiply'&&a.length!==a[0]!.length)throw new Error('المحدد والمعكوس يتطلبان مصفوفة مربعة')
 if(operation==='det'){
  const value=real(math.det(a))
  return {title:'محدد المصفوفة A',lines:[{label:'det(A)',value:show(value)}],scalar:value.toString()}
 }
 let result:BigNumber[][]
 if(operation==='inverse'){
  if(real(math.det(a)).isZero())throw new Error('المصفوفة منفردة؛ لا يوجد معكوس')
  result=math.inv(a) as BigNumber[][]
  const product=math.multiply(a,result) as BigNumber[][]
  product.forEach((row,i)=>row.forEach((value,j)=>{if(real(value).minus(bn(i===j?1:0)).abs().gt('1e-25'))throw new Error('المصفوفة سيئة التكييف؛ تعذر التحقق من المعكوس')}))
 }else{
  const b=matrixInput(second)
  if(a[0]!.length!==b.length)throw new Error('عدد أعمدة A يجب أن يساوي عدد صفوف B')
  result=math.multiply(a,b) as BigNumber[][]
 }
 const values=result.map(row=>row.map(value=>show(real(value))))
 return {title:operation==='inverse'?'معكوس A':'حاصل A × B',lines:[{label:'الحجم',value:`${values.length} × ${values[0]!.length}`}],matrix:values}
}
