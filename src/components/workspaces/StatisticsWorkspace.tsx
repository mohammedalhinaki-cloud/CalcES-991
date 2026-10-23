import { useEffect, useState } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import DataEntry from './DataEntry'
import { Choices, ComputeButton, useWorkspaceSubmit } from './shared'
export default function StatisticsWorkspace(){
 const {recalled,state,tool,setTool,runAdvanced,advanced}=useCalculator()
 const [summary,setSummary]=useState('1 2 3 4 5'),[pairs,setPairs]=useState('1,3\n2,5\n3,7')
 useEffect(()=>{const r=recalled?.request;if(!r)return;if(r.kind==='statistics'){if(r.operation==='summary')setSummary(r.data);else setPairs(r.data)}},[recalled])
 const operation=tool==='regression'?'regression':'summary',active=state.mode==='STAT'
 const submit=()=>runAdvanced({kind:'statistics',operation,data:operation==='summary'?summary:pairs})
 useWorkspaceSubmit(active,submit)
 if(!active)return null
 return <section className="mt-3" aria-label="مساحة الإحصاء"><Choices value={operation} choices={[["summary","متغير واحد"],["regression","انحدار خطي"]]} onChange={value=>{advanced.cancel();setTool(value)}}/><p className="mb-2 text-xs leading-6">{operation==='summary'?'افصل القيم بمسافة أو سطر أو فاصلة.':'كل سطر زوج x,y. حد أقصى 1000 صف.'}</p><DataEntry label="بيانات الإحصاء" multiline value={operation==='summary'?summary:pairs} onChange={operation==='summary'?setSummary:setPairs}/><ComputeButton onClick={submit}/></section>
}
