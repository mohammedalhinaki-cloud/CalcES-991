export class LatexConversionError extends Error {
  constructor(message = 'أكمل التعبير الرياضي') { super(message); this.name = 'LatexConversionError' }
}
const FUNCTIONS: Record<string,string> = {
  sin:'sin',cos:'cos',tan:'tan',arcsin:'asin',arccos:'acos',arctan:'atan',
  sinh:'sinh',cosh:'cosh',tanh:'tanh',arsinh:'asinh',arcosh:'acosh',artanh:'atanh',
  asinh:'asinh',acosh:'acosh',atanh:'atanh',ln:'log',log:'log10',abs:'abs',exp:'exp',arg:'arg',
}
// Recursive arithmetic grammar, never a general LaTeX-to-JavaScript substitution.
export function latexToExpression(latex: string, options: {symbols?:readonly string[];polar?:boolean} = {}): string {
  if (latex.length > 500) throw new LatexConversionError('التعبير أطول من الحد المسموح')
  const tokens: string[] = []
  let offset = 0
  while (offset < latex.length) {
    const match = /^(\s+|\\[a-zA-Z]+|\\[,!; %|]|\d+(?:\.\d*)?|\.\d+|[A-Za-z+\-*/^_(){}\[\]!,|'%∠=.%])/u.exec(latex.slice(offset))
    if (!match) throw new LatexConversionError('صيغة غير مدعومة')
    offset += match[0].length
    if (/^\s+$/u.test(match[0]) || ['\\left','\\right','\\,','\\!','\\;','\\ '].includes(match[0])) continue
    tokens.push(match[0])
  }
  let cursor=0, depth=0, boundVariableDepth=0
  const closing:string[]=[]
  const peek=()=>tokens[cursor]
  const take=()=>tokens[cursor++]
  const stop=()=>peek()===closing.at(-1) && closing.length>0
  const expect=(token:string)=>{if(take()!==token)throw new LatexConversionError()}
  function group():string {
    const open=take(), close=open==='{'?'}':open==='('?')':open==='['?']':null
    if(!close)throw new LatexConversionError()
    if(++depth>40)throw new LatexConversionError('التعبير متداخل أكثر من المسموح')
    closing.push(close)
    const result=expression()
    if(take()!==close)throw new LatexConversionError()
    closing.pop();depth--
    return result
  }
  function argument():string {
    if(peek()==='{')return group()
    const token=peek()
    if(token&&/^\d/u.test(token)){
      const digit=token[0]!
      if(token.length>1)tokens[cursor]=token.slice(1);else take()
      return digit
    }
    return atom()
  }
  function name():string {
    if(take()!=='{')throw new LatexConversionError()
    let value=''
    while(peek()&&peek()!=='}'){
      if(peek()==='\\mathrm'){take();value+=name();continue}
      if(!/^[A-Za-z]$/u.test(peek()!))throw new LatexConversionError()
      value+=take()
    }
    if(take()!=='}')throw new LatexConversionError()
    return value
  }
  function call(functionName:string):string {
    let exponent:string|undefined, base:string|undefined
    if(peek()==='_'){take();base=argument()}
    if(peek()==='^'){take();exponent=argument()}
    const inverse=exponent?.replace(/[()]/gu,'')==='-1'
    const fn=inverse?({sin:'asin',cos:'acos',tan:'atan',sinh:'asinh',cosh:'acosh',tanh:'atanh'}[functionName]):FUNCTIONS[functionName]
    if(!fn||base&&functionName!=='log')throw new LatexConversionError('دالة غير مدعومة')
    const value=peek()==='('||peek()==='{'?group():power()
    const result=base?`log(${value},${base})`:`${fn}(${value})`
    return exponent&&!inverse?`(${result}^(${exponent}))`:result
  }
  function withBoundVariable<T>(callback:()=>T):T {
    boundVariableDepth++
    try{return callback()}finally{boundVariableDepth--}
  }
  function differentialLetter():boolean {
    if(peek()==='\\mathrm'){
      take()
      if(peek()!=='{')return false
      take()
      const letter=take()
      if(letter!=='d'||take()!=='}')return false
      return true
    }
    if(peek()==='d'){take();return true}
    return false
  }
  function calculusBody():string {
    if(!['{','(','['].includes(peek()??''))throw new LatexConversionError('أكمل الدالة داخل العملية')
    return withBoundVariable(group)
  }
  function inlineIntegral():string {
    expect('\\int')
    if(peek()!=='_')throw new LatexConversionError('أدخل الحد الأدنى للتكامل')
    take();const lower=argument()
    if(peek()!=='^')throw new LatexConversionError('أدخل الحد الأعلى للتكامل')
    take();const upper=argument()
    const body=calculusBody()
    if(!differentialLetter())throw new LatexConversionError('أدخل التفاضل dx')
    const variable=take()
    if(variable!=='x'&&variable!=='X')throw new LatexConversionError('التكامل يدعم المتغير x فقط')
    return `inlineIntegral((${lower}),(${upper}),(${body}))`
  }
  function inlineSum():string {
    expect('\\sum')
    if(peek()!=='_')throw new LatexConversionError('أدخل فهرس وحد التكامل')
    take();expect('{')
    const index=take()
    if(index!=='x'&&index!=='X')throw new LatexConversionError('المجموع يدعم الفهرس x فقط')
    expect('=')
    closing.push('}')
    const lower=expression()
    if(take()!==closing.pop())throw new LatexConversionError()
    if(peek()!=='^')throw new LatexConversionError('أدخل الحد الأعلى للمجموع')
    take();const upper=argument()
    const body=calculusBody()
    return `inlineSum((${lower}),(${upper}),(${body}))`
  }
  function derivativeNumerator():boolean {
    const start=cursor
    if(take()!=='{'||!differentialLetter()||take()!=='}'){cursor=start;return false}
    return true
  }
  function derivativeDenominator():boolean {
    const start=cursor
    if(take()!=='{'||!differentialLetter()){cursor=start;return false}
    const variable=take()
    if((variable!=='x'&&variable!=='X')||take()!=='}'){cursor=start;return false}
    return true
  }
  function derivativePoint():string {
    if(take()!=='|'||take()!=='_')throw new LatexConversionError('أدخل نقطة الاشتقاق')
    expect('{')
    const variable=take()
    if(variable!=='x'&&variable!=='X')throw new LatexConversionError('استخدم x لنقطة الاشتقاق')
    expect('=')
    closing.push('}')
    const point=expression()
    if(take()!==closing.pop())throw new LatexConversionError()
    return point
  }
  function derivativeAfterFraction():string {
    const body=calculusBody()
    const point=derivativePoint()
    return `inlineDerivative((${body}),(${point}))`
  }
  function derivativeOrFraction():string {
    const start=cursor
    take() // \frac
    if(derivativeNumerator()&&derivativeDenominator())return derivativeAfterFraction()
    cursor=start
    take()
    const numerator=argument(),denominator=argument()
    return `((${numerator})/(${denominator}))`
  }
  function atom():string {
    const token=peek()
    if(token==='{'||token==='(')return `(${group()})`
    if(token&&/^(?:\d|\.\d)/u.test(token))return take()!
    if(token==='\\pi'){take();return 'pi'}
    if(token==='x'&&boundVariableDepth>0){take();return 'x'}
    // X is a stored calculator variable normally, but has the same local
    // binding as x within an inline calculus body, never its stored value.
    if(token==='X'&&boundVariableDepth>0){take();return 'x'}
    if(token==='e'||token&&(/^[A-FXYM]$/u.test(token)||options.symbols?.includes(token))){take();return token}
    if(token==='\\int')return inlineIntegral()
    if(token==='\\sum')return inlineSum()
    if(token==='.'){
      take()
      if(peek()!=='\\frac'&&peek()!=='\\dfrac'&&peek()!=='\\tfrac')throw new LatexConversionError('صيغة غير مدعومة')
      return derivativeOrFraction()
    }
    if(token==='\\mathrm'||token==='\\operatorname'){
      take();const value=name()
      if(value==='Ans')return 'Ans'
      if(!FUNCTIONS[value])throw new LatexConversionError('دالة غير مدعومة')
      return call(value)
    }
    if(token==='\\frac'||token==='\\dfrac'||token==='\\tfrac')return derivativeOrFraction()
    if(token==='\\sqrt'){
      take();const index=peek()==='['?group():undefined
      const value=argument()
      return index?`nthRoot(${value},${index})`:`sqrt(${value})`
    }
    if(token==='|'||token==='\\lvert'){
      take();closing.push(token==='|'?'|':'\\rvert');const value=expression()
      if(take()!==closing.pop())throw new LatexConversionError()
      return `abs(${value})`
    }
    if(token?.startsWith('\\')&&FUNCTIONS[token.slice(1)]){take();return call(token.slice(1))}
    throw new LatexConversionError(token?'صيغة غير مدعومة':undefined)
  }
  function postfix():string {
    let value=atom()
    while(!stop()){
      if(peek()==='!'){take();value=`factorial(${value})`}
      else if(peek()==='%'||peek()==='\\%'){take();value=`(${value}/100)`}
      else if(peek()==='\\degree'||peek()==='^'&&tokens[cursor+1]==='{'&&tokens[cursor+2]==='\\circ'&&tokens[cursor+3]==='}'){
        if(peek()==='\\degree')take();else cursor+=4
        // Sexagesimal input: degrees, minutes, seconds. Unit conversion stays in math.js.
        let minutes='0',seconds='0'
        if(peek()&&/^\d/u.test(peek()!)){
          minutes=take()!
          if(take()!=="'"&&tokens[cursor-1]!=='\\prime')throw new LatexConversionError()
          if(peek()&&/^\d/u.test(peek()!)){
            seconds=take()!
            if(take()!=="'"||take()!=="'")throw new LatexConversionError()
          }
        }
        value=`degrees(${value}+(${minutes})/60+(${seconds})/3600)`
      }else break
    }
    return value
  }
  function power():string {
    const base=postfix()
    if(peek()==='^'){
      take();let value=`(${base}^(${argument()}))`
      while(peek()==='!'||peek()==='%'||peek()==='\\%'){
        value=take()==='!'?`factorial(${value})`:`(${value}/100)`
      }
      return value
    }
    return base
  }
  function unary():string {
    if(peek()==='+'||peek()==='-'){const op=take();return `(${op}${unary()})`}
    return power()
  }
  function startsAtom():boolean {
    if(stop())return false
    const t=peek()
    return Boolean(t&&(options.symbols?.includes(t)||/^(\d|\.\d|[A-FXYMe])$/u.test(t)||/^\d/u.test(t)||['{','(','\\frac','\\dfrac','\\tfrac','\\sqrt','\\pi','|','\\lvert','\\operatorname','\\mathrm','\\int','\\sum','.'].includes(t)||t.startsWith('\\')&&FUNCTIONS[t.slice(1)]))
  }
  function product():string {
    let value=unary()
    while(!stop()&&(['*','/','\\times','\\cdot','\\div'].includes(peek()??'')||startsAtom())){
      const op=startsAtom()?'*':take()
      value=`(${value}${op==='/'||op==='\\div'?'/':'*'}${unary()})`
    }
    return value
  }
  function expression():string {
    let value=product()
    while(!stop()&&(peek()==='+'||peek()==='-')){const op=take();value=`(${value}${op}${product()})`}
    if(options.polar&&(peek()==='\\angle'||peek()==='∠')){take();value=`polar(${value},${expression()})`}
    return value
  }
  const result=expression()
  if(cursor!==tokens.length)throw new LatexConversionError('تأكد من الأقواس وبنية التعبير')
  return result
}
