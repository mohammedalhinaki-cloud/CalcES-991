import { act, renderHook } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useAdvancedCalculation } from '../../hooks/useAdvancedCalculation'
class FakeWorker {
 static instances:FakeWorker[]=[]
 onmessage:((event:{data:unknown})=>void)|null=null
 onerror:(()=>void)|null=null
 message:{id:number}|undefined
 terminated=false
 constructor(){FakeWorker.instances.push(this)}
 postMessage(message:{id:number}){this.message=message}
 terminate(){this.terminated=true}
}
const request={kind:'base' as const,operation:'NOT' as const,a:'0',b:'',base:10 as const}
afterEach(()=>{vi.unstubAllGlobals();vi.useRealTimers();FakeWorker.instances=[]})
it('ignores stale responses after cancellation and accepts only the current job',()=>{
 vi.stubGlobal('Worker',FakeWorker)
 const {result}=renderHook(useAdvancedCalculation)
 act(()=>result.current.run(request))
 const first=FakeWorker.instances[0]!,id=first.message!.id
 act(()=>result.current.cancel())
 expect(first.terminated).toBe(true)
 act(()=>first.onmessage?.({data:{id,ok:true,result:{title:'old',lines:[]}}}))
 expect(result.current.state.status).toBe('idle')
 act(()=>result.current.run(request))
 const next=FakeWorker.instances[1]!
 act(()=>next.onmessage?.({data:{id:next.message!.id,ok:true,result:{title:'new',lines:[]}}}))
 expect(result.current.state).toMatchObject({status:'success',result:{title:'new'}})
})
it('terminates a timed-out worker and cleans up on unmount',()=>{
 vi.useFakeTimers();vi.stubGlobal('Worker',FakeWorker)
 const {result,unmount}=renderHook(useAdvancedCalculation)
 act(()=>result.current.run(request))
 act(()=>vi.advanceTimersByTime(10000))
 expect(result.current.state.status).toBe('error')
 expect(FakeWorker.instances[0]!.terminated).toBe(true)
 act(()=>result.current.run(request));unmount()
 expect(FakeWorker.instances[1]!.terminated).toBe(true)
})
it('restoring history stops an outstanding job and ignores its late result',()=>{
 vi.stubGlobal('Worker',FakeWorker)
 const {result}=renderHook(useAdvancedCalculation)
 act(()=>result.current.run(request))
 const worker=FakeWorker.instances[0]!,id=worker.message!.id
 act(()=>result.current.restore({title:'saved',lines:[{label:'x',value:'2'}],scalar:'2'}))
 expect(worker.terminated).toBe(true)
 act(()=>worker.onmessage?.({data:{id,ok:true,result:{title:'stale',lines:[],scalar:'99'}}}))
 expect(result.current.state).toMatchObject({status:'success',recalled:true,result:{title:'saved',scalar:'2'}})
})
it('recovers after a worker error by creating a fresh worker',()=>{
 vi.stubGlobal('Worker',FakeWorker)
 const {result}=renderHook(useAdvancedCalculation)
 act(()=>result.current.run(request))
 const failed=FakeWorker.instances[0]!
 act(()=>failed.onerror?.())
 expect(result.current.state.status).toBe('error');expect(failed.terminated).toBe(true)
 act(()=>result.current.run(request))
 const current=FakeWorker.instances[1]!
 act(()=>current.onmessage?.({data:{id:current.message!.id,ok:true,result:{title:'recovered',lines:[]}}}))
 expect(result.current.state).toMatchObject({status:'success',result:{title:'recovered'}})
})
