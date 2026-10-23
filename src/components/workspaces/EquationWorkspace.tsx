import { useEffect, useState } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import MatrixGrid from './MatrixGrid'
import DataEntry from './DataEntry'
import { Choices, ComputeButton, useWorkspaceSubmit } from './shared'
export default function EquationWorkspace(){
 const {recalled,state,tool,setTool,runAdvanced,advanced}=useCalculator()
 const [lower,setLower]=useState('0'),[upper,setUpper]=useState('2')
 const [coefficients,setCoefficients]=useState(['1','-3','2'])
 const [a,setA]=useState([['1','1'],['1','-1']]),[b,setB]=useState(['3','1'])
 useEffect(()=>{const r=recalled?.request;if(!r)return;if(r.kind==='root'){setLower(r.lower);setUpper(r.upper)}else if(r.kind==='polynomial')setCoefficients(r.coefficients);else if(r.kind==='linear'){setA(r.a);setB(r.b)}},[recalled])
 const operation=tool==='polynomial'?'polynomial':tool==='linear'?'linear':'root',active=state.mode==='EQUATION'
 const submit=()=>runAdvanced(operation==='root'?{kind:'root',latex:state.latex,lower,upper,angle:state.angle}:operation==='polynomial'?{kind:'polynomial',coefficients}:{kind:'linear',a,b})
 useWorkspaceSubmit(active,submit)
 if(!active)return null
 return <section className="mt-3" aria-label="مساحة المعادلات"><Choices value={operation} choices={[["root","جذر عددي"],["polynomial","كثير حدود"],["linear","نظام خطي"]]} onChange={value=>{advanced.cancel();setTool(value)}}/>{operation==='root'?<><p className="mb-2 text-xs">اكتب f(x) في المحرر؛ نحل f(x)=0 داخل المجال.</p><div className="grid grid-cols-2 gap-2"><DataEntry label="بداية مجال الجذر" value={lower} onChange={setLower}/><DataEntry label="نهاية مجال الجذر" value={upper} onChange={setUpper}/></div></>:operation==='polynomial'?<><Choices value={String(coefficients.length-1)} choices={[["2","درجة ثانية"],["3","درجة ثالثة"]]} onChange={value=>{advanced.cancel();setCoefficients(value==='2'?['1','-3','2']:['1','-6','11','-6'])}}/><p className="mb-2 text-xs">المعاملات من أعلى قوة إلى الحد الثابت.</p><div className="grid grid-cols-2 gap-2">{coefficients.map((value,i)=><DataEntry key={i} label={`معامل x^${coefficients.length-i-1}`} value={value} onChange={next=>setCoefficients(coefficients.map((c,j)=>i===j?next:c))}/>)}</div></>:<><Choices value={String(a.length)} choices={[["2","مجهولان"],["3","ثلاثة مجاهيل"]]} onChange={value=>{advanced.cancel();const n=Number(value);setA(Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?'1':'0')));setB(Array.from({length:n},(_,i)=>String(i+1)))}}/><MatrixGrid label="المعاملات" values={a} onChange={setA}/><div className="grid grid-cols-3 gap-2">{b.map((value,i)=><DataEntry key={i} label={`b${i+1}`} value={value} onChange={next=>setB(b.map((v,j)=>i===j?next:v))}/>)}</div></>}<ComputeButton onClick={submit}/></section>
}
