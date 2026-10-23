import { useEffect, useState } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import MatrixGrid from './MatrixGrid'
import { Choices, ComputeButton, useWorkspaceSubmit } from './shared'
export default function MatrixWorkspace(){
 const {recalled,state,tool,setTool,runAdvanced,advanced}=useCalculator()
 const [a,setA]=useState([['1','2'],['3','4']]),[b,setB]=useState([['1','0'],['0','1']])
 useEffect(()=>{const r=recalled?.request;if(!r)return;if(r.kind==='matrix'){setA(r.a);setB(r.b)}},[recalled])
 const operation=tool==='inverse'?'inverse':tool==='multiply'?'multiply':'det'
 const active=state.mode==='MATRIX'
 const submit=()=>runAdvanced({kind:'matrix',operation,a,b})
 useWorkspaceSubmit(active,submit)
 if(!active)return null
 const resize=(size:number)=>{advanced.cancel();setA(Array.from({length:size},(_,i)=>Array.from({length:size},(_,j)=>a[i]?.[j]??(i===j?'1':'0'))));setB(Array.from({length:size},(_,i)=>Array.from({length:size},(_,j)=>b[i]?.[j]??(i===j?'1':'0'))))}
 return <section className="mt-3" aria-label="مساحة المصفوفات"><Choices value={operation} choices={[["det","محدد A"],["inverse","معكوس A"],["multiply","A × B"]]} onChange={value=>{advanced.cancel();setTool(value)}}/><Choices value={String(a.length)} choices={[["2","2 × 2"],["3","3 × 3"]]} onChange={value=>resize(Number(value))}/><MatrixGrid label="A" values={a} onChange={setA}/>{operation==='multiply'&&<MatrixGrid label="B" values={b} onChange={setB}/>}<ComputeButton onClick={submit}/></section>
}
