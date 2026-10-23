import type { AdMobPlugin, BannerAdSize, BannerAdPosition, AdmobConsentInfo, MaxAdContentRating } from '@capacitor-community/admob'
import type { AndroidConfiguration } from './platform'
export const GOOGLE_TEST_BANNER='ca-app-pub-3940256099942544/9214589741'
export type BannerSdk=Pick<AdMobPlugin,'requestConsentInfo'|'showConsentForm'|'showPrivacyOptionsForm'|'initialize'|'showBanner'|'hideBanner'|'resumeBanner'|'removeBanner'|'setApplicationMuted'>
interface Events { reserve:(height:number)=>void; privacy:(required:boolean)=>void }
export function liveAdsConfigured(config:AndroidConfiguration):boolean {
 return config.adsEnabled&&['general','children'].includes(config.audience)&&/^ca-app-pub-\d{16}\/\d{10}$/.test(config.bannerId)&&!config.bannerId.includes('3940256099942544')
}
// Banner-only boundary. No interstitial/reward/app-open methods are exposed to this controller.
export async function openBannerSession(config:AndroidConfiguration,sdk:BannerSdk,events:Events){
 if(!config.adsEnabled||!config.debug&&!liveAdsConfigured(config))return null
 const children=config.audience==='children'
 const consentOptions={tagForUnderAgeOfConsent:children}
 let info=await sdk.requestConsentInfo(consentOptions)
 if(info.status==='REQUIRED'&&info.isConsentFormAvailable)info=await sdk.showConsentForm()
 events.privacy(info.privacyOptionsRequirementStatus==='REQUIRED')
 if(!info.canRequestAds)return null
 // Reserve the SDK's measured adaptive height before it can show native pixels.
 events.reserve(config.bannerHeight)
 await sdk.initialize({initializeForTesting:config.debug,tagForChildDirectedTreatment:children,tagForUnderAgeOfConsent:children,maxAdContentRating:'General' as MaxAdContentRating})
 await sdk.setApplicationMuted({muted:true})
 const options={adId:config.debug?GOOGLE_TEST_BANNER:config.bannerId,adSize:'ADAPTIVE_BANNER' as BannerAdSize,position:'TOP_CENTER' as BannerAdPosition,margin:6,isTesting:config.debug,npa:children}
 await sdk.showBanner(options)
 let disposed=false,shown=true,obscured=false,privacyBusy=false,allowed=true
 let queue=Promise.resolve()
 const serial=(task:()=>Promise<void>)=>{queue=queue.catch(()=>{}).then(task);return queue}
 const visibility=async()=>{
  if(disposed||!shown)return
  if(obscured||privacyBusy||!allowed)await sdk.hideBanner()
  else await sdk.resumeBanner()
 }
 return {
  setObscured:(value:boolean)=>serial(async()=>{obscured=value;await visibility()}),
  privacyOptions:()=>serial(async()=>{
   if(disposed)return
   privacyBusy=true;await visibility()
   try{
    await sdk.showPrivacyOptionsForm()
    const updated:AdmobConsentInfo=await sdk.requestConsentInfo(consentOptions)
    events.privacy(updated.privacyOptionsRequirementStatus==='REQUIRED')
    allowed=updated.canRequestAds
    if(!allowed){await sdk.removeBanner();shown=false}
    else if(!shown){await sdk.showBanner(options);shown=true}
   }catch(error){allowed=false;await sdk.removeBanner();shown=false;throw error}
   finally{privacyBusy=false;await visibility()}
  }),
  resize:(height:number)=>serial(async()=>{
   if(disposed||!allowed)return
   await sdk.removeBanner();shown=false
   events.reserve(height)
   await sdk.showBanner(options);shown=true;await visibility()
  }),
  dispose:()=>serial(async()=>{disposed=true;if(shown){await sdk.removeBanner();shown=false}}),
 }
}
export type BannerSession=NonNullable<Awaited<ReturnType<typeof openBannerSession>>>
