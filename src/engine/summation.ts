import type { BigNumber } from 'mathjs'
import type { AngleUnit } from '../state/types'
import type { AdvancedResult } from './advancedTypes'
import { decimal, show } from './advancedMath'
import { emptyVariables, evaluateScientific } from './evaluate'
import type { Variables } from './evaluate'

const MAX_TERMS = 10000

/** Evaluate Σ f(x) over an inclusive, finite integer interval using BigNumber64 arithmetic. */
export function finiteSum(
  latex:string,
  lower:string,
  upper:string,
  angle:AngleUnit='RAD',
  variables:Variables=emptyVariables,
  answer:string|null=null,
):AdvancedResult {
  const first=decimal(lower),last=decimal(upper)
  if(!first.isInteger()||!last.isInteger())throw new Error('حدود المجموع يجب أن تكون أعدادًا صحيحة')
  if(first.gt(last))throw new Error('حدود المجموع معكوسة؛ يجب أن يكون الحد الأدنى أقل من أو يساوي الحد الأعلى')
  const count=last.minus(first).plus(1)
  if(count.gt(MAX_TERMS))throw new Error('المجموع محدود بـ 10000 حد')

  let total=first.minus(first) as BigNumber
  const iterations=count.toNumber()
  for(let offset=0;offset<iterations;offset++){
    const index=first.plus(offset).toString()
    const value=evaluateScientific(latex,{
      angle,
      variables,
      answer,
      // Lowercase x is accepted for f(x), while calculator-style uppercase X
      // remains the same bound index rather than a saved calculator variable.
      temporaryVariables:{x:index,X:index},
    })
    total=total.plus(value)
    if(!total.isFinite()||total.abs().gt('1e10000'))throw new Error('خطأ رياضي: النتيجة خارج المجال الحقيقي أو المسموح')
  }

  return {
    title:'المجموع المحدود',
    lines:[
      {label:'القيمة',value:show(total)},
      {label:'عدد الحدود',value:count.toString()},
    ],
    scalar:total.toString(),
    note:'حدود صحيحة شاملة؛ الحساب محدود بـ 10000 حد.',
  }
}
