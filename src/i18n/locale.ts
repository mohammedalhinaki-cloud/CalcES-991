import english from './en.json'
export type Language='ar'|'en'
export const LANGUAGE_KEY='calces_language'
export function readStoredLanguage():Language|null {
 try{const value=window.localStorage.getItem(LANGUAGE_KEY);return value==='ar'||value==='en'?value:null}catch{return null}
}
let language:Language=readStoredLanguage()??'ar'
export const getLanguage=()=>language
export const getDirection=()=>language==='ar'?'rtl':'ltr'
export function selectLanguage(value:Language){
 language=value
 document.documentElement.lang=value
 document.documentElement.dir=getDirection()
 document.title=value==='en'?'CalcES 991 - Scientific Calculator':'CalcES 991 - حاسبة علمية'
 try{window.localStorage.setItem(LANGUAGE_KEY,value)}catch{/* Continue in the chosen language for this session. */}
}
const messages:Record<string,string>=english
// Longer messages win so dynamic labels such as "History (3)" remain translatable.
const pattern=new RegExp(Object.keys(messages).sort((a,b)=>b.length-a.length).map(key=>key.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|'),'g')
export function translate(value:string):string {
 if(language!=='en')return value
 const normalized=value.trim().replace(/\s+/g,' ')
 const exact=messages[normalized]
 if(exact)return (value.match(/^\s*/)?.[0]??'')+exact+(value.match(/\s*$/)?.[0]??'')
 return value.replace(pattern,key=>messages[key]!)
}
// Translate presentation strings only; numbers, elements, callbacks and math data pass through unchanged.
export function localize<T>(value:T):T{return (typeof value==='string'?translate(value):value) as T}
