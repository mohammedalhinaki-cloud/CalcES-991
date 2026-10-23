import { localize } from '../../i18n/locale'
import { useEffect, useState } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import DataEntry from './DataEntry'
import { Choices, ComputeButton, useWorkspaceSubmit } from './shared'
export default function ComplexWorkspace(){
 const {recalled,state,tool,setTool,runAdvanced,advanced}=useCalculator()
 const [radius,setRadius]=useState('2'),[theta,setTheta]=useState('90')
 useEffect(()=>{const r=recalled?.request;if(!r)return;if(r.kind==='polar'){setRadius(r.radius);setTheta(r.theta)}},[recalled])
 const operation=tool==='polar'?'polar':'complex',active=state.mode==='CMPLX'
 const submit=()=>runAdvanced(operation==='complex'?{kind:'complex',latex:state.latex,angle:state.angle}:{kind:'polar',radius,theta,angle:state.angle})
 useWorkspaceSubmit(active,submit)
 if(!active)return null
 return <section className="mt-3" aria-label={localize("مساحة الأعداد المركبة")}><Choices value={operation} choices={[["complex","تعبير ديكارتي"],["polar","إدخال قطبي"]]} onChange={value=>{advanced.cancel();setTool(value)}}/>{localize(operation==='complex'?<p className="text-xs leading-6">{localize("اكتب تعبيرًا مثل (1+i)² في المحرر الرئيسي. استخدم زر i أو لوحة جهازك. يمكن أيضًا إدخال r∠θ.")}</p>:<div className="grid grid-cols-2 gap-2"><DataEntry label={localize("نصف القطر r")} value={radius} onChange={setRadius}/><DataEntry label={localize(`الزاوية θ (${state.angle})`)} value={theta} onChange={setTheta}/></div>)}<ComputeButton onClick={submit}/></section>
}
