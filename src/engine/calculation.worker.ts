import { calculateAdvanced } from './advancedDispatcher'
import type { AdvancedRequest, WorkerReply } from './advancedTypes'
// Only plain strings/arrays cross the worker boundary, never BigNumber prototypes.
self.onmessage=(event:MessageEvent<{id:number;request:AdvancedRequest}>)=>{
 const {id,request}=event.data
 let reply:WorkerReply
 try{reply={id,ok:true,result:calculateAdvanced(request)}}
 catch(error){reply={id,ok:false,error:error instanceof Error?error.message:'تعذر إكمال الحساب'}}
 self.postMessage(reply)
}
