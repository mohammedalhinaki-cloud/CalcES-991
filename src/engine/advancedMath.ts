import type { BigNumber, MathNode } from 'mathjs'
import { math } from './mathInstance'
import { latexToExpression } from '../editor/latexToExpression'
import type { AngleUnit } from '../state/types'
export const bn=(value:string|number)=>math.bignumber(value)
export function decimal(value:string):BigNumber {
 if(value.length>120||!/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(value.trim()))throw new Error('أدخل عددًا عشريًا صالحًا')
 const result=bn(value.trim())
 if(!result.isFinite()||result.abs().gt('1e1000'))throw new Error('العدد خارج المجال المسموح')
 return result
}
export function real(value:unknown):BigNumber {
 if(!math.isBigNumber(value)||!value.isFinite()||value.abs().gt('1e10000'))throw new Error('الدالة ليست حقيقية ومنتهية في مجال الحساب')
 return value
}
export const show=(value:BigNumber)=>math.format(value,{precision:14,lowerExp:-9,upperExp:12})
const functions=new Set(['sin','cos','tan','asin','acos','atan','sinh','cosh','tanh','asinh','acosh','atanh','sqrt','nthRoot','abs','log','log10','exp'])
export function validateArithmetic(node:MathNode,symbols:string[]=[],extras:string[]=[]):void {
 node.traverse(child=>{
  if(!['OperatorNode','ConstantNode','ParenthesisNode','SymbolNode','FunctionNode'].includes(child.type))throw new Error('تعبير غير مسموح')
  if(math.isFunctionNode(child)&&!functions.has(child.fn.name)&&!extras.includes(child.fn.name))throw new Error('هذه الدالة غير مدعومة في العملية المختارة')
  if(math.isSymbolNode(child)&&!functions.has(child.name)&&!extras.includes(child.name)&&!['pi','e',...symbols].includes(child.name))throw new Error('استخدم x فقط كمتغير للدالة')
 })
}
// Convert degree/gradian trig to ordinary radian functions BEFORE symbolic differentiation.
export function functionNode(latex:string,angle:AngleUnit):MathNode {
 const node=math.parse(latexToExpression(latex,{symbols:['x']})).transform(child=>math.isSymbolNode(child)&&child.name==='X'?new math.SymbolNode('x'):child)
 validateArithmetic(node,['x'])
 if(angle==='RAD')return node
 const scale=bn(math.pi.toString()).div(angle==='DEG'?180:200).toString()
 function transform(current:MathNode):MathNode {
  const mapped=current.map(child=>transform(child))
  if(math.isFunctionNode(mapped)){
   const name=mapped.fn.name,arg=mapped.args[0]?.toString()
   if(['sin','cos','tan'].includes(name))return math.parse(`${name}((${arg})*(${scale}))`)
   if(['asin','acos','atan'].includes(name))return math.parse(`(${name}(${arg}))/(${scale})`)
  }
  return mapped
 }
 return transform(node)
}
export function realFunction(latex:string,angle:AngleUnit){
 const compiled=functionNode(latex,angle).compile()
 return (x:BigNumber)=>real(compiled.evaluate({x}))
}
export function matrixInput(values:string[][]):BigNumber[][] {
 if(values.length<1||values.length>3||!values[0]?.length||values[0].length>3||values.some(row=>row.length!==values[0]!.length))throw new Error('حجم المصفوفة يجب أن يكون بين 1 و3 وصفوفها متساوية')
 return values.map(row=>row.map(decimal))
}
