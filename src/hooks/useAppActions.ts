import {translate} from '../i18n/locale'
import { useEffect, useRef, useState } from 'react'
import { isAndroidApp, PUBLIC_APP_URL } from '../native/platform'
interface InstallPrompt extends Event {
 prompt:()=>Promise<void>
 userChoice:Promise<{outcome:'accepted'|'dismissed'}>
}
export function useAppActions(){
 const prompt=useRef<InstallPrompt|null>(null)
 const [installed,setInstalled]=useState(false)
 const [notice,setNotice]=useState('')
 const [help,setHelp]=useState<'install'|'share'|null>(null)
 const url=isAndroidApp()?PUBLIC_APP_URL:new URL(import.meta.env.BASE_URL,window.location.origin).href
 useEffect(()=>{
  const media=window.matchMedia('(display-mode: standalone)')
  const update=()=>setInstalled(isAndroidApp()||media.matches||Boolean((navigator as Navigator&{standalone?:boolean}).standalone))
  const beforeInstall=(event:Event)=>{event.preventDefault();prompt.current=event as InstallPrompt}
  const afterInstall=()=>{prompt.current=null;setInstalled(true);setNotice('تم تثبيت الحاسبة')}
  update();media.addEventListener('change',update)
  window.addEventListener('beforeinstallprompt',beforeInstall);window.addEventListener('appinstalled',afterInstall)
  // Register only in production; no automatic reload interrupts an equation in progress.
  if(import.meta.env.PROD&&!isAndroidApp()&&'serviceWorker' in navigator)void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{/* Manual browser installation remains available. */})
  return ()=>{media.removeEventListener('change',update);window.removeEventListener('beforeinstallprompt',beforeInstall);window.removeEventListener('appinstalled',afterInstall)}
 },[])
 async function share(){
  setNotice('')
  if(isAndroidApp()){
   try{const {Share}=await import('@capacitor/share');await Share.share({title:translate('CalcES 991 - حاسبة علمية'),text:translate('حاسبة علمية تفاعلية'),url});return}catch(error){if(error instanceof Error&&/cancel/i.test(error.message))return}
  }
  if(navigator.share){
   try{await navigator.share({title:translate('CalcES 991 - حاسبة علمية'),text:translate('حاسبة علمية تفاعلية'),url});return}
   catch(error){if(error instanceof DOMException&&error.name==='AbortError')return}
  }
  try{await navigator.clipboard.writeText(url);setNotice('تم نسخ رابط الحاسبة للمشاركة')}
  catch{setHelp('share')}
 }
 async function install(){
  setNotice('')
  if(installed){setNotice('الحاسبة مثبتة بالفعل');return}
  const deferred=prompt.current
  if(deferred){
   prompt.current=null
   try{await deferred.prompt();const choice=await deferred.userChoice;if(choice.outcome==='accepted')setNotice('تابع إتمام التثبيت من المتصفح');return}catch{/* Explain browser installation below. */}
  }
  setHelp('install')
 }
 return {share,install,installed,notice,help,setHelp,url}
}
