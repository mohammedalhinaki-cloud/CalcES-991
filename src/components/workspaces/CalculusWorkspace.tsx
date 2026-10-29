import { localize } from '../../i18n/locale'
import { useEffect, useState } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import DataEntry from './DataEntry'
import { Choices, ComputeButton, useWorkspaceSubmit } from './shared'
export default function CalculusWorkspace(){
 const {recalled,state,tool,setTool,runAdvanced,advanced}=useCalculator()
 const [lower,setLower]=useState('0'),[upper,setUpper]=useState('1'),[point,setPoint]=useState('0')
 useEffect(()=>{const r=recalled?.request;if(!r)return;if(r.kind==='integrate'||r.kind==='root'){setLower(r.lower);setUpper(r.upper)}else if(r.kind==='derivative')setPoint(r.point)},[recalled])
 const operation=tool==='derivative'?'derivative':'integrate'
 const active=state.mode==='COMP'&&(tool==='integrate'||tool==='derivative'||tool==='root')
 const submit=()=>runAdvanced(tool==='root'?{kind:'root',latex:state.latex,lower,upper,angle:state.angle}:operation==='integrate'?{kind:'integrate',latex:state.latex,lower,upper,angle:state.angle}:{kind:'derivative',latex:state.latex,point,angle:state.angle})
 useWorkspaceSubmit(active,submit)
 if(state.mode!=='COMP')return null
 return <section className="mt-3" aria-label={localize("التفاضل والتكامل")}><Choices value={tool??''} choices={[["integrate","تكامل محدد"],["derivative","اشتقاق رمزي"],["root","SOLVE"]]} onChange={value=>{advanced.cancel();setTool(tool===value?null:value)}}/>{localize(active&&<div><p className="mb-3 text-xs leading-6">{localize("اكتب f(x) في المحرر الرئيسي. تستخدم الدوال المثلثية وحدة ")}{localize(state.angle)}.</p>{localize(tool==='derivative'?<DataEntry label={localize("نقطة الاشتقاق (اختيارية)")} value={point} onChange={setPoint}/>:<div className="grid grid-cols-2 gap-2"><DataEntry label={localize("الحد الأدنى")} value={lower} onChange={setLower}/><DataEntry label={localize("الحد الأعلى")} value={upper} onChange={setUpper}/></div>)}<ComputeButton onClick={submit}/></div>)}</section>
}
