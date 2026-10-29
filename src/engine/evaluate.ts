import type { BigNumber, MathNode } from 'mathjs'
import type { AngleUnit } from '../state/types'
import { LatexConversionError, latexToExpression } from '../editor/latexToExpression'
import { INLINE_CALCULUS_ANGLE_SCOPE_KEY, InlineCalculusError, INLINE_CALCULUS_FUNCTIONS } from './inlineCalculus'
import { math } from './mathInstance'

export type VariableName='A'|'B'|'C'|'D'|'E'|'F'|'X'|'Y'|'M'
export type Variables=Record<VariableName,string>
export const emptyVariables:Variables={A:'0',B:'0',C:'0',D:'0',E:'0',F:'0',X:'0',Y:'0',M:'0'}
export interface EvaluationOptions { angle?:AngleUnit; variables?:Variables; answer?:string|null; temporaryVariables?:Record<string,string> }
export class CalculationError extends Error {}
const FUNCTIONS=new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','log','log10','exp','abs','sqrt','nthRoot','factorial','degrees'])
const OPERATORS=new Set(['+','-','*','/','^','!'])

function finiteBigNumber(value:string):BigNumber {
  const numeric=math.bignumber(value)
  if(!numeric.isFinite())throw new CalculationError('خطأ رياضي: قيمة غير صالحة')
  return numeric
}

/**
 * Enforce the calculator's expression allowlist structurally. In particular,
 * lowercase x is only legal in the AST body of a bounded inline-calculus
 * function; it can never escape into the surrounding saved-variable scope.
 */
function validateExpressionNode(node: MathNode, allowedSymbols: Set<string>, boundX=false): void {
  if(math.isFunctionNode(node)){
    const name=node.fn.name
    if(INLINE_CALCULUS_FUNCTIONS.has(name)){
      if(name==='inlineIntegral'||name==='inlineSum'){
        if(node.args.length!==3)throw new CalculationError('بنية عملية حساب التفاضل والتكامل غير صالحة')
        validateExpressionNode(node.args[0]!,allowedSymbols,false)
        validateExpressionNode(node.args[1]!,allowedSymbols,false)
        validateExpressionNode(node.args[2]!,allowedSymbols,true)
        return
      }
      if(node.args.length!==2)throw new CalculationError('بنية المشتقة غير صالحة')
      validateExpressionNode(node.args[0]!,allowedSymbols,true)
      validateExpressionNode(node.args[1]!,allowedSymbols,false)
      return
    }
    if(!FUNCTIONS.has(name))throw new CalculationError('دالة غير مسموحة')
    node.args.forEach(argument=>validateExpressionNode(argument,allowedSymbols,boundX))
    return
  }
  if(math.isOperatorNode(node)){
    if(!OPERATORS.has(node.op))throw new CalculationError('عامل غير مسموح')
    node.args.forEach(argument=>validateExpressionNode(argument,allowedSymbols,boundX))
    return
  }
  if(math.isSymbolNode(node)){
    if(node.name==='x'){
      if(boundX)return
      // Existing advanced workspaces deliberately inject x as a temporary
      // variable. It remains safe because only internal callers construct
      // temporaryVariables; ordinary LCD evaluation does not expose it.
      if(allowedSymbols.has('x'))return
      throw new CalculationError('استخدم x داخل التكامل أو المجموع أو المشتقة فقط')
    }
    if(!allowedSymbols.has(node.name))throw new CalculationError('متغير غير معرّف')
    return
  }
  if(math.isConstantNode(node))return
  if(math.isParenthesisNode(node)){
    validateExpressionNode(node.content,allowedSymbols,boundX)
    return
  }
  throw new CalculationError('تعبير غير مسموح')
}

export function evaluateScientific(latex:string,options:EvaluationOptions={}):BigNumber {
  try{
    const temporaryVariables=options.temporaryVariables??{}
    const node=math.parse(latexToExpression(latex,{symbols:Object.keys(temporaryVariables)}))
    const allowedSymbols=new Set(['pi','e','Ans',...Object.keys(emptyVariables),...Object.keys(temporaryVariables)])
    validateExpressionNode(node,allowedSymbols)
    const angle=options.angle??'DEG'
    const scale=angle==='RAD'?math.bignumber(1):math.divide(math.bignumber(math.pi),math.bignumber(angle==='GRA'?200:180)) as BigNumber
    const scope:Record<string,unknown>={Ans:finiteBigNumber(options.answer??'0')}
    for(const [name,value] of Object.entries(options.variables??emptyVariables))scope[name]=finiteBigNumber(value)
    for(const [name,value] of Object.entries(temporaryVariables))scope[name]=finiteBigNumber(value)
    for(const name of ['sin','cos','tan'] as const)scope[name]=(x:BigNumber)=>{
      if(angle!=='RAD'){
        const quarter=math.bignumber(angle==='GRA'?100:90)
        const turns=math.divide(x,quarter) as BigNumber
        if(turns.isInteger()){
          const quadrant=Number(math.mod(turns,math.bignumber(4)))
          if(name==='tan'&&quadrant%2===1)throw new CalculationError('الدالة غير معرّفة عند هذه الزاوية')
          return math.bignumber(name==='sin'?[0,1,0,-1][quadrant]!:name==='cos'?[1,0,-1,0][quadrant]!:0)
        }
      }
      const radians=math.multiply(x,scale) as BigNumber
      if(name==='tan'&&(math.abs(math.cos(radians)) as BigNumber).lt('1e-55'))throw new CalculationError('الدالة غير معرّفة عند هذه الزاوية')
      return math[name](radians)
    }
    for(const name of ['asin','acos','atan'] as const)scope[name]=(x:BigNumber)=>{
      if(name!=='atan'&&x.abs().gt(1))throw new CalculationError('خارج مجال الدالة')
      const value=name==='asin'?math.asin(x):name==='acos'?math.acos(x):math.atan(x)
      return math.divide(value,scale)
    }
    scope.factorial=(x:BigNumber)=>{
      if(!x.isInteger()||x.lt(0)||x.gt(1000))throw new CalculationError('المضروب لعدد صحيح من 0 إلى 1000')
      return math.factorial(x)
    }
    scope.degrees=(x:BigNumber)=>math.divide(math.multiply(x,math.divide(math.pi,180)),scale)
    // Instance-registered raw calculus callbacks read this non-user-visible
    // marker from MathJS's scoped map to apply symbolic angle chain rules.
    scope[INLINE_CALCULUS_ANGLE_SCOPE_KEY]=angle
    const result=node.evaluate(scope)
    if(!math.isBigNumber(result)||!result.isFinite()||result.abs().gt('1e10000'))throw new CalculationError('خطأ رياضي: النتيجة خارج المجال الحقيقي أو المسموح')
    return result
  }catch(error){
    if(error instanceof CalculationError||error instanceof LatexConversionError)throw error
    if(error instanceof InlineCalculusError)throw new CalculationError(error.message)
    throw new CalculationError('خطأ رياضي: تحقق من مجال الدالة وبنية التعبير')
  }
}
