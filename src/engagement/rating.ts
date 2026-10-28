// Store engagement preferences only. Never persist expressions or results here.
export const RATING_EVENT='calces:calculation'
export const THREE_DAYS=3*24*60*60*1000
// Official Google Play listing shared by both rating actions.
export const STORE_URL='https://play.google.com/store/apps/details?id=calces991.calculator'
export interface Preferences {count:number;done:boolean;remindAt:number}
export function readPreferences(storage:Storage):Preferences {
 try {
  const count=Number(storage.getItem('calc_count')??0)
  const remindAt=Number(storage.getItem('rate_remind_at')??0)
  return {count:Number.isSafeInteger(count)&&count>0?count:0,done:storage.getItem('rate_done')==='1',remindAt:Number.isFinite(remindAt)&&remindAt>0?remindAt:0}
 }catch{return {count:0,done:false,remindAt:0}}
}
export const shouldPrompt=(prefs:Preferences,now=Date.now())=>prefs.count>=5&&!prefs.done&&now>=prefs.remindAt
export function incrementCount(storage:Storage){
 const prefs=readPreferences(storage)
 try{storage.setItem('calc_count',String(Math.min(prefs.count+1,Number.MAX_SAFE_INTEGER)))}catch{/* Private/blocked storage must never interrupt calculations. */}
}
export function saveChoice(storage:Storage,choice:'rate'|'later',now=Date.now()){
 try{storage.setItem(choice==='later'?'rate_remind_at':'rate_done',choice==='later'?String(now+THREE_DAYS):'1')}catch{/* Session state still closes the dialog if persistence is unavailable. */}
}
export function recordSuccessfulCalculation(){
 try{incrementCount(window.localStorage)}catch{/* Access to localStorage itself can throw. */}
 window.dispatchEvent(new Event(RATING_EVENT))
}
