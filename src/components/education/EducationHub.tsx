import {memo,useCallback,useState} from 'react'
import {useLanguage} from '../../i18n/LanguageGate'
import {useCalculator} from '../../state/CalculatorProvider'
import CalculatorShell from '../CalculatorShell'
import {quadratic,convert,categories,constants} from '../../education/tools'
import type {Category} from '../../education/tools'
import {solveLinear} from '../../engine/equations'

type Section='calculator'|'equations'|'converter'|'constants'
export default function EducationHub(){
 const {language}=useLanguage(),{loadEducationalValue,setWorkspaceOpen}=useCalculator()
 const [section,setSection]=useState<Section>('calculator')
 const t=useCallback((en:string,ar:string)=>language==='ar'?ar:en,[language])
 const send=(value:string)=>{
  const latex=value.replace(/e([+-]?\d+)/i,'\\times10^{$1}')
  loadEducationalValue(latex);setSection('calculator')
 }
 return <div className="education-app" dir={language==='ar'?'rtl':'ltr'}>
  <div className="calculator-page" hidden={section!=='calculator'}><CalculatorShell tools={
   <nav className="education-nav" aria-label={t('Learning tools','أدوات التعلم')}>
    {([['equations','Equations','المعادلات'],['converter','Converter','المحول'],['constants','Constants','الثوابت']] as const).map(([id,en,ar])=><button key={id} type="button" onClick={()=>{setWorkspaceOpen(false);setSection(id)}}>{t(en,ar)}</button>)}
   </nav>
  }/></div>
  <div className="education-page" hidden={section==='calculator'}>
   <button type="button" className="utility-button mb-4" onClick={()=>{setSection('calculator');setWorkspaceOpen(true)}}>{t('Calculator','الحاسبة')}</button>
   <header className="education-heading"><span>CalcES 991 · {t('Learning studio','استوديو التعلم')}</span><h1>{t(section==='equations'?'Equation solver':section==='converter'?'Unit converter':'Scientific constants',section==='equations'?'حل المعادلات':section==='converter'?'تحويل الوحدات':'الثوابت العلمية')}</h1><p>{t('Explore, understand, and calculate — entirely offline.','استكشف وافهم واحسب — بالكامل دون إنترنت.')}</p></header>
   <div hidden={section!=='equations'}><Equations t={t}/></div>
   <div hidden={section!=='converter'}><Converter t={t}/></div>
   <div hidden={section!=='constants'}><Constants t={t} send={send}/></div>
  </div>
 </div>
}
type Translate=(en:string,ar:string)=>string
function Numeric({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
 return <label className="education-field"><span>{label}</span><input type="text" inputMode="decimal" autoComplete="off" spellCheck={false} dir="ltr" value={value} onChange={e=>onChange(e.target.value)}/></label>
}
const Equations=memo(function Equations({t}:{t:Translate}){
 const [coefficients,setCoefficients]=useState(['1','-3','2']),[kind,setKind]=useState('quadratic')
 const [matrix,setMatrix]=useState(['1','1','3','1','-1','1'])
 let answer:ReturnType<typeof quadratic>|undefined,error='',linear:ReturnType<typeof solveLinear>|undefined
 try{
  if(kind==='quadratic')answer=quadratic(...coefficients as [string,string,string])
  else linear=solveLinear([[matrix[0]!,matrix[1]!],[matrix[3]!,matrix[4]!]], [matrix[2]!,matrix[5]!])
 }catch{error=kind==='quadratic'?t('Enter valid coefficients. The coefficient a must not be zero.','أدخل معاملات صحيحة. يجب ألا يساوي المعامل a صفراً.'):t('Enter valid coefficients for a system with a unique solution.','أدخل معاملات صحيحة لنظام له حل وحيد.')}
 return <section className="education-card" aria-label={t('Equation solver','حل المعادلات')}>
  <label className="education-field"><span>{t('Equation type','نوع المعادلة')}</span><select aria-label={t('Equation type','نوع المعادلة')} value={kind} onChange={e=>setKind(e.target.value)}><option value="quadratic">{t('Quadratic equation','معادلة تربيعية')}</option><option value="linear">{t('Linear system (2 × 2)','نظام خطي (2 × 2)')}</option></select></label>
  <p className="education-formula" dir="ltr">{kind==='quadratic'?'ax² + bx + c = 0':'ax + by = c; dx + ey = f'}</p>
  <div className="education-coefficients">{(kind==='quadratic'?coefficients:matrix).map((v,i)=><Numeric key={`${kind}-${i}`} label={kind==='quadratic'?['a','b','c'][i]!:['a','b','c','d','e','f'][i]!} value={v} onChange={next=>kind==='quadratic'?setCoefficients(coefficients.map((c,j)=>j===i?next:c)):setMatrix(matrix.map((c,j)=>j===i?next:c))}/>)}</div>
  {error?<p role="status" className="education-hint">{error}</p>:answer?<div className="education-solution" aria-live="polite">
   <h2>{t('Step-by-step solution','الحل خطوة بخطوة')}</h2>
   <ol>
    <li>{t('Identify the coefficients','تحديد المعاملات')}<p dir="ltr">a = {answer.a}, b = {answer.b}, c = {answer.c}</p></li>
    <li>{t('Calculate the discriminant','حساب المميز')}<p dir="ltr">Δ = b² − 4ac = ({answer.b})² − 4 × ({answer.a}) × ({answer.c}) = <strong>{answer.discriminant}</strong></p></li>
    <li>{answer.kind==='complex'?t('Δ < 0: two complex conjugate roots.','Δ < 0: جذران مركبان مترافقان.'):answer.kind==='repeated'?t('Δ = 0: one repeated real root.','Δ = 0: جذر حقيقي مكرر.'):t('Δ > 0: two distinct real roots.','Δ > 0: جذران حقيقيان مختلفان.')}</li>
    <li>{t('Apply the quadratic formula','تطبيق القانون العام')}<p dir="ltr">x = (−b ± √Δ) / (2a)</p><p dir="ltr">x = (−({answer.b}) ± √({answer.discriminant})) / (2 × ({answer.a}))</p></li>
   </ol>
   <div className="education-answer" dir="ltr"><p>x₁ = {answer.roots[0]}</p><p>x₂ = {answer.roots[1]}</p></div>
   <p className="education-hint">{t('Results are rounded to 16 significant digits.','النتائج مقربة إلى 16 رقماً معنوياً.')}</p>
  </div>:linear?<div className="education-solution" aria-live="polite"><h2>{t('Linear system solution','حل النظام الخطي')}</h2><p>{t('Solved locally with matrix factorization; both equations are checked by substitution.','حُل محلياً بتحليل المصفوفة؛ يتم التحقق من المعادلتين بالتعويض.')}</p>{linear.lines.map((line,i)=><p key={line.label} className="education-answer" dir="ltr">{i===0?'x':'y'} = {line.value}</p>)}</div>:null}
 </section>
})
const Converter=memo(function Converter({t}:{t:Translate}){
 const [category,setCategory]=useState<Category>('length'),[value,setValue]=useState('1'),[from,setFrom]=useState('m'),[to,setTo]=useState('km')
 const units=categories[category].units
 let result='',error=''
 try{result=convert(value,category,from,to)}catch{if(value.trim())error=t('Enter a valid number. Temperature cannot be below absolute zero.','أدخل رقماً صحيحاً. لا يمكن أن تقل الحرارة عن الصفر المطلق.')}
 return <section className="education-card" aria-label={t('Unit converter','تحويل الوحدات')}>
  <label className="education-field"><span>{t('Category','الفئة')}</span><select aria-label={t('Category','الفئة')} value={category} onChange={e=>{const key=e.target.value as Category;setCategory(key);setFrom(categories[key].units[0]!.id);setTo(categories[key].units[1]!.id)}}>{Object.entries(categories).map(([id,c])=><option key={id} value={id}>{t(c.en,c.ar)}</option>)}</select></label>
  <Numeric label={t('Value','القيمة')} value={value} onChange={setValue}/>
  <div className="education-conversion">{(['from','to'] as const).map(side=><label key={side} className="education-field"><span>{side==='from'?t('From','من'):t('To','إلى')}</span><select aria-label={side==='from'?t('From','من'):t('To','إلى')} value={side==='from'?from:to} onChange={e=>(side==='from'?setFrom:setTo)(e.target.value)}>{units.map(u=><option key={u.id} value={u.id}>{t(u.en,u.ar)}</option>)}</select></label>)}</div>
  <button className="utility-button" type="button" onClick={()=>{setFrom(to);setTo(from)}}>{t('Swap units ⇄','عكس الوحدات ⇄')}</button>
  <output className="education-answer" aria-label={t('Conversion result','نتيجة التحويل')} aria-live="polite" dir="ltr">{result?`${result} ${to}`:'—'}</output>
  {error&&<p role="status" className="education-hint">{error}</p>}
  <p className="education-hint">{t('Instant local conversion. Weight units here represent mass; US and Imperial gallons are distinct. Results use 16 significant digits.','تحويل محلي فوري. وحدات الوزن هنا تمثل الكتلة؛ الغالون الأمريكي يختلف عن الإمبراطوري. النتائج بدقة 16 رقماً معنوياً.')}</p>
 </section>
})
function Constants({t,send}:{t:Translate;send:(v:string)=>void}){
 const [search,setSearch]=useState(''),[notice,setNotice]=useState('')
 const filtered=constants.filter(c=>`${c.en} ${c.ar} ${c.symbol}`.toLowerCase().includes(search.toLowerCase()))
 const copy=async(value:string)=>{try{await navigator.clipboard.writeText(value);setNotice(t('Value copied.','تم نسخ القيمة.'))}catch{setNotice(t('Copy unavailable. Select the value to copy it, or send it to the calculator.','النسخ غير متاح. حدد القيمة لنسخها أو أرسلها إلى الحاسبة.'))}}
 return <section aria-label={t('Constants library','مكتبة الثوابت')}>
  <label className="education-field"><span>{t('Search constants','البحث في الثوابت')}</span><input value={search} onChange={e=>setSearch(e.target.value)}/></label>
  <p className="education-hint">{t('SI definitions and CODATA 2022 reference values. Measured values are rounded; units are shown for reference. Only the numeric value is inserted.','تعريفات النظام الدولي وقيم CODATA 2022 المرجعية. القيم المقاسة مقربة والوحدات مرجعية. تُدرج القيمة الرقمية فقط.')}</p>
  <p role="status">{notice}</p>
  <div className="education-constants">{filtered.map(c=><article className="education-card" key={c.symbol}><span className="constant-symbol" dir="ltr">{c.symbol}</span><h2>{t(c.en,c.ar)}</h2><p className="constant-value" dir="ltr">{c.value} <small>{c.unit}</small></p><p className="education-hint">{c.exact?t('Exact SI / defined value','قيمة تعريفية دقيقة'):t('Measured · rounded','مقاسة · مقربة')}</p><div className="education-actions"><button className="utility-button" type="button" onClick={()=>send(c.value)}>{t('Use in calculator','استخدم في الحاسبة')}</button><button className="utility-button" type="button" onClick={()=>void copy(c.value)}>{t('Copy value','نسخ القيمة')}</button></div></article>)}</div>
  {!filtered.length&&<p>{t('No matching constants.','لا توجد ثوابت مطابقة.')}</p>}
 </section>
}
