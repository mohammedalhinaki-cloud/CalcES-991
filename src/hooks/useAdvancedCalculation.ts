import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdvancedRequest, AdvancedResult, WorkerReply } from '../engine/advancedTypes'
export type AdvancedState={status:'idle'}|{status:'running'}|{status:'success';result:AdvancedResult;recalled?:boolean}|{status:'error';error:string}
export function useAdvancedCalculation(){
 const [state,setState]=useState<AdvancedState>({status:'idle'})
 const worker=useRef<Worker|null>(null),generation=useRef(0),running=useRef(false),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined)
 const stop=useCallback(()=>{generation.current++;clearTimeout(timer.current);if(running.current){worker.current?.terminate();worker.current=null}running.current=false},[])
 const cancel=useCallback(()=>{stop();setState(previous=>previous.status==='idle'?previous:{status:'idle'})},[stop])
 const run=useCallback((request:AdvancedRequest)=>{
  stop();const id=generation.current
  setState({status:'running'});running.current=true
  try{
   worker.current??=new Worker(new URL('../engine/calculation.worker.ts',import.meta.url),{type:'module'})
   worker.current.onmessage=(event:MessageEvent<WorkerReply>)=>{
    if(event.data.id!==generation.current)return
    clearTimeout(timer.current);running.current=false
    setState(event.data.ok?{status:'success',result:event.data.result}:{status:'error',error:event.data.error})
   }
   worker.current.onerror=()=>{if(id!==generation.current)return;stop();setState({status:'error',error:'تعذر تشغيل محرك الحساب'})}
   worker.current.postMessage({id,request})
   timer.current=setTimeout(()=>{if(id!==generation.current)return;stop();setState({status:'error',error:'انتهت مهلة الحساب (10 ثوانٍ). بسّط المسألة أو عدّل المجال.'})},10000)
  }catch{stop();setState({status:'error',error:'المتصفح لا يدعم تشغيل محرك الحساب'})}
 },[stop])
 useEffect(()=>()=>{clearTimeout(timer.current);worker.current?.terminate();generation.current++},[])
 const restore=useCallback((result:AdvancedResult)=>{stop();setState({status:'success',result,recalled:true})},[stop])
 return {state,run,cancel,restore}
}
