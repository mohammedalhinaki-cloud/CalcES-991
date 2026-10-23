import { localize } from '../../i18n/locale'
import { useEffect, useState } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import DataEntry from './DataEntry'
import { Choices, ComputeButton, useWorkspaceSubmit } from './shared'
import type { AdvancedRequest } from '../../engine/advancedTypes'
export default function BaseNWorkspace(){
 const {recalled,state,tool,setTool,runAdvanced,advanced,dispatch}=useCalculator()
 const [a,setA]=useState('10'),[b,setB]=useState('3')
 useEffect(()=>{const r=recalled?.request;if(!r)return;if(r.kind==='base'){setA(r.a);setB(r.b)}},[recalled])
 const operation=(['AND','OR','XOR','NOT'].includes(tool??'')?tool:'convert') as Extract<AdvancedRequest,{kind:'base'}>['operation'],active=state.mode==='BASE-N'
 const submit=()=>runAdvanced({kind:'base',operation,a,b,base:state.base})
 useWorkspaceSubmit(active,submit)
 if(!active)return null
 return <section className="mt-3" aria-label={localize("مساحة الأنظمة العددية")}><Choices value={String(state.base)} choices={[["2","BIN"],["8","OCT"],["10","DEC"],["16","HEX"]]} onChange={value=>{advanced.cancel();dispatch({type:'SET_BASE',base:Number(value) as 2|8|10|16})}}/><Choices value={operation} choices={[["convert","تحويل"],["AND","AND"],["OR","OR"],["XOR","XOR"],["NOT","NOT"]]} onChange={value=>{advanced.cancel();setTool(value)}}/><p className="mb-2 text-xs leading-6">{localize("أعداد موقعة 32 بت. تغيير الأساس يعيد تفسير المدخلات الحالية؛ التحويل يعرض الأسس الأربعة معًا.")}</p><DataEntry textKeyboard label={localize("العدد الأول")} value={a} onChange={setA}/>{localize(operation!=='convert'&&operation!=='NOT'&&<DataEntry textKeyboard label={localize("العدد الثاني")} value={b} onChange={setB}/>)}<ComputeButton onClick={submit}/></section>
}
