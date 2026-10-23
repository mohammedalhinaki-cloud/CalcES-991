import { useSyncExternalStore } from 'react'
import { AppConfiguration, isAndroidApp } from './platform'
import type { AdMobPlugin } from '@capacitor-community/admob'
import type { AndroidConfiguration } from './platform'
import { openBannerSession } from './bannerSession'
import type { BannerSession } from './bannerSession'
interface NativeState {configuration:AndroidConfiguration|null;privacyRequired:boolean;message:string}
let state:NativeState={configuration:null,privacyRequired:false,message:''}
const listeners=new Set<()=>void>()
const subscribe=(listener:()=>void)=>{listeners.add(listener);return ()=>listeners.delete(listener)}
const update=(values:Partial<NativeState>)=>{state={...state,...values};listeners.forEach(listener=>listener())}
export const useNativeAdsState=()=>useSyncExternalStore(subscribe,()=>state,()=>state)
let session:BannerSession|null=null
let sdk:AdMobPlugin|null=null
const updateOcclusion=()=>void session?.setObscured(Boolean(document.querySelector('dialog[open]'))).catch(()=>{})
let starting:Promise<void>|undefined
export function reserveNativeBanner(height:number){
 // The plugin reports logical dp. Keep 6dp separation above/below; zero events mean hidden, not a layout resize.
 if(Number.isFinite(height)&&height>0&&height<=120)document.documentElement.style.setProperty('--native-banner-slot',`${Math.ceil(height)+12}px`)
}
export function startAndroidAds():Promise<void>{
 if(!isAndroidApp())return Promise.resolve()
 return starting??=(async()=>{
  document.documentElement.classList.add('native-android')
  const configuration=await AppConfiguration.getConfiguration()
  update({configuration})
  reserveNativeBanner(configuration.bannerHeight)
  if(!configuration.adsEnabled)return
  const {AdMob,BannerAdPluginEvents}=await import('@capacitor-community/admob')
  sdk=AdMob
  const size=await AdMob.addListener(BannerAdPluginEvents.SizeChanged,info=>reserveNativeBanner(info.height))
  const failed=await AdMob.addListener(BannerAdPluginEvents.FailedToLoad,()=>update({message:'الإعلان غير متاح حاليًا؛ الحاسبة تعمل كالمعتاد.'}))
  try{
   session=await openBannerSession(configuration,AdMob,{reserve:reserveNativeBanner,privacy:privacyRequired=>update({privacyRequired})})
   const observer=new MutationObserver(updateOcclusion)
   observer.observe(document.body,{attributes:true,attributeFilter:['open'],subtree:true});updateOcclusion()
   screen.orientation?.addEventListener('change',()=>{
    void AppConfiguration.getConfiguration().then(config=>session?.resize(config.bannerHeight)).catch(()=>update({message:'تعذر تغيير مقاس الإعلان؛ أعد فتح التطبيق عند الحاجة.'}))
   })
  }catch(error){await size.remove();await failed.remove();throw error}
 })().catch(()=>{update({message:'تعذر تجهيز الإعلان أو الموافقة عليه. يمكنك استخدام الحاسبة دون إعلان.'})})
}
export async function showAdPrivacyOptions(){
 try{
  if(session)await session.privacyOptions()
  else if(sdk&&state.configuration){
   await sdk.showPrivacyOptionsForm()
   session=await openBannerSession(state.configuration,sdk,{reserve:reserveNativeBanner,privacy:privacyRequired=>update({privacyRequired})})
   updateOcclusion()
  }
 }catch{update({message:'تعذر تحديث خيارات الإعلانات؛ لن يُعرض إعلان جديد في هذه الجلسة.'})}
}
