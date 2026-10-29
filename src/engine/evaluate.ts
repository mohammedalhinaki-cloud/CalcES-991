import type { BigNumber } from 'mathjs'
import type { AngleUnit } from '../state/types'
import { LatexConversionError, latexToExpression } from '../editor/latexToExpression'
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

export function evaluateScientific(latex:string,options:EvaluationOptions={}):BigNumber {
  try{
    const temporaryVariables=options.temporaryVariables??{}
    const node=math.parse(latexToExpression(latex,{symbols:Object.keys(temporaryVariables)}))
    node.traverse(child=>{
      if(!['OperatorNode','ConstantNode','ParenthesisNode','SymbolNode','FunctionNode'].includes(child.type))throw new CalculationError('تعبير غير مسموح')
      if(math.isOperatorNode(child)&&!OPERATORS.has(child.op))throw new CalculationError('عامل غير مسموح')
      if(math.isFunctionNode(child)&&!FUNCTIONS.has(child.fn.name))throw new CalculationError('دالة غير مسموحة')
      if(math.isSymbolNode(child)&&!FUNCTIONS.has(child.name)&&!['pi','e','Ans',...Object.keys(emptyVariables),...Object.keys(temporaryVariables)].includes(child.name))throw new CalculationError('متغير غير معرّف')
    })
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
    const result=node.evaluate(scope)
    if(!math.isBigNumber(result)||!result.isFinite()||result.abs().gt('1e10000'))throw new CalculationError('خطأ رياضي: النتيجة خارج المجال الحقيقي أو المسموح')
    return result
  }catch(error){
    if(error instanceof CalculationError||error instanceof LatexConversionError)throw error
    throw new CalculationError('خطأ رياضي: تحقق من مجال الدالة وبنية التعبير')
  }
}
