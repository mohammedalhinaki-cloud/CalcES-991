export type LinearCalculusKind='integrate'|'derivative'|'root'
export class LinearSyntaxError extends Error {
 constructor(){super('Syntax ERROR');this.name='LinearSyntaxError'}
}
// These checks do not evaluate expressions. MathLive still owns the cursor and
// selection; commas only delimit arguments at the outermost call level.
export function normalizeLinearCalculus(latex:string):string {
 return latex.trim().replace(/\\(?:left|right)\s*/g,'')
  .replace(/\\[,!; ]/g,' ')
  .replace(/^\\(?:d?frac)\s*\{d\}\s*\{d\s*[xX]\}/,'d/dx')
  .replace(/^\\operatorname\{(d\/dx|diff|SOLVE|solve)\}/,'$1')
  .replace(/^\\int\b/,'∫')
}
export function isLinearCalculus(latex:string):boolean {
 return /^(?:∫|d\/dx|diff\b|SOLVE\b)/i.test(normalizeLinearCalculus(latex))
}
export function parseLinearCalculus(latex:string):{kind:LinearCalculusKind;func:string;args:string[]} {
 if(latex.length>1500)throw new LinearSyntaxError()
 const source=normalizeLinearCalculus(latex)
 const match=/^(∫|d\/dx|diff|SOLVE)\s*\(/i.exec(source)
 if(!match)throw new LinearSyntaxError()
 const kind=match[1]==='∫'?'integrate':/^(d\/dx|diff)$/i.test(match[1]!)?'derivative':'root'
 const args:string[]=[],stack=[')'];let start=match[0].length,closed=false
 for(let i=start;i<source.length;i++){
  const ch=source[i]!
  if('({['.includes(ch))stack.push(ch==='('?')':ch==='{'?'}':']')
  else if(')}]'.includes(ch)){
   if(stack.pop()!==ch)throw new LinearSyntaxError()
   if(!stack.length){args.push(source.slice(start,i).trim());if(source.slice(i+1).trim())throw new LinearSyntaxError();closed=true;break}
  }else if(ch===','&&stack.length===1){args.push(source.slice(start,i).trim());start=i+1}
 }
 if(!closed||args.some(arg=>!arg||/\\placeholder\b|#\?/.test(arg))||
  (kind==='derivative'?![1,2].includes(args.length):args.length!==3))throw new LinearSyntaxError()
 return {kind,func:args[0]!,args:args.slice(1)}
}
// Also accept the documented plain-text spelling cos(X), not only MathLive's
// canonical \\cos(X). Existing commands and operator names are left intact.
export function normalizeLinearFunction(latex:string):string {
 return latex.replace(/(?<![\\A-Za-z])(sin|cos|tan|asin|acos|atan|sinh|cosh|tanh|ln|log|sqrt|abs|exp)\s*(?=\()/g,
  name=>({asin:'\\arcsin',acos:'\\arccos',atan:'\\arctan'}[name.trim()]??`\\${name.trim()}`))
}
