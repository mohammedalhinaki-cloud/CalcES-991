import { LatexConversionError } from './latexToExpression'
import { containsInlineCalculus } from '../engine/inlineCalculus'
import { evaluateScientific } from '../engine/evaluate'
import type { EvaluationOptions } from '../engine/evaluate'
import { formatScientific } from '../engine/formatResult'
import type { FormatOptions } from '../engine/formatResult'
export interface CalculationPreview { status:'empty'|'success'|'incomplete'|'error'; text:string }
export type PreviewOptions=EvaluationOptions&FormatOptions
export function previewCalculation(latex:string,options:PreviewOptions={}):CalculationPreview {
  if(!latex.trim())return {status:'empty',text:'—'}
  // Adaptive integration, symbolic differentiation, and bounded sums run only
  // when the controller submits a scientific worker job on '='.
  if(containsInlineCalculus(latex))return {status:'incomplete',text:'—'}
  try{return {status:'success',text:formatScientific(evaluateScientific(latex,options),options)}}
  catch(error){return {status:error instanceof LatexConversionError?'incomplete':'error',text:error instanceof Error?error.message:'خطأ رياضي'}}
}
