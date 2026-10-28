import { localize } from '../i18n/locale'
import {useEffect,useState,useCallback,useRef} from 'react'
import EngagementDialog from './EngagementDialog'
import {readPreferences,shouldPrompt,saveChoice,RATING_EVENT,THREE_DAYS} from '../engagement/rating'
import {openStore} from '../engagement/openStore'
export default function RatingPrompt(){
 const [open,setOpen]=useState(false)
 const closedUntil=useRef(0)
 useEffect(()=>{
  let timer:ReturnType<typeof setTimeout>|undefined
  const check=()=>{
   clearTimeout(timer)
   if(closedUntil.current===Infinity||document.visibilityState==='hidden')return
   if(closedUntil.current>Date.now()){timer=setTimeout(check,Math.min(closedUntil.current-Date.now(),2147483647));return}
   try{
    const prefs=readPreferences(window.localStorage)
    if(shouldPrompt(prefs)&&!document.querySelector('dialog[open]'))setOpen(true)
    else if(prefs.count>=5&&!prefs.done&&prefs.remindAt>Date.now())timer=setTimeout(check,Math.min(prefs.remindAt-Date.now(),2147483647))
   }catch{/* No prompt if browser denies persistent storage. */}
  }
  const observer=new MutationObserver(check)
  observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']})
  window.addEventListener(RATING_EVENT,check);window.addEventListener('storage',check);document.addEventListener('visibilitychange',check)
  check()
  return ()=>{clearTimeout(timer);observer.disconnect();window.removeEventListener(RATING_EVENT,check);window.removeEventListener('storage',check);document.removeEventListener('visibilitychange',check)}
 },[])
 const choose=useCallback((choice:'rate'|'later')=>{
  closedUntil.current=choice==='later'?Date.now()+THREE_DAYS:Infinity
  try{saveChoice(window.localStorage,choice)}catch{/* Keep the close action functional. */}
  setOpen(false)
  window.dispatchEvent(new Event(RATING_EVENT))
  if(choice==='rate')void openStore()
 },[])
 return <EngagementDialog open={open} onClose={()=>choose('later')} titleId="rating-title">
  <h2 id="rating-title">{localize("رأيك يصنع الفارق! ⭐️")}</h2>
  <p>{localize("أهلاً بك! 👋 نحن فريق عمل صغير (Maaoun Studio) نسعى لتقديم أدوات تعليمية مجانية عالية الجودة. إذا كان التطبيق يعجبك ويساعدك، فإن تقييمك بـ 5 نجوم على متجر قوقل بلاي يدعمنا كثيراً ويصنع فارقاً حقيقياً في استمرارنا وتحديث الأداة باستمرار. شكرًا لدعمك وثقتك!")}</p>
  <div className="engagement-actions"><button type="button" className="utility-button rating-primary" onClick={()=>choose('rate')}>{localize("تقييم التطبيق الآن ⭐️")}</button><button type="button" className="utility-button" onClick={()=>choose('later')}>{localize("ذكرني لاحقاً ⏰")}</button></div>
 </EngagementDialog>
}
