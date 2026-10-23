import { describe, expect, it, vi } from 'vitest'
import { GOOGLE_TEST_BANNER, openBannerSession } from '../../native/bannerSession'
import type { BannerSdk } from '../../native/bannerSession'
import type { AndroidConfiguration } from '../../native/platform'
const config:AndroidConfiguration={debug:false,adsEnabled:true,bannerId:'ca-app-pub-1234567890123456/1234567890',audience:'general',bannerHeight:50,privacyPolicyUrl:'https://example.com/privacy',supportEmail:'support@example.com',versionName:'1.0.0'}
function mocks(){
 const info={status:'NOT_REQUIRED',canRequestAds:true,privacyOptionsRequirementStatus:'NOT_REQUIRED'}
 const sdk={requestConsentInfo:vi.fn().mockResolvedValue(info),showConsentForm:vi.fn(),showPrivacyOptionsForm:vi.fn().mockResolvedValue(undefined),initialize:vi.fn().mockResolvedValue(undefined),showBanner:vi.fn().mockResolvedValue(undefined),hideBanner:vi.fn().mockResolvedValue(undefined),resumeBanner:vi.fn().mockResolvedValue(undefined),removeBanner:vi.fn().mockResolvedValue(undefined),setApplicationMuted:vi.fn().mockResolvedValue(undefined)}
 const events={reserve:vi.fn(),privacy:vi.fn()}
 return {sdk,events,bridge:sdk as unknown as BannerSdk}
}
describe('non-intrusive Android banners',()=>{
 it('does not initialize or request ads while disabled or live configuration is incomplete',async()=>{
  for(const input of [{...config,adsEnabled:false},{...config,audience:'unconfigured' as const},{...config,bannerId:GOOGLE_TEST_BANNER}]){
   const {sdk,bridge,events}=mocks();expect(await openBannerSession(input,bridge,events)).toBeNull();expect(sdk.requestConsentInfo).not.toHaveBeenCalled();expect(sdk.initialize).not.toHaveBeenCalled();expect(sdk.showBanner).not.toHaveBeenCalled()
  }
 })
 it('requires consent permission before SDK initialization or an ad request',async()=>{
  const {sdk,bridge,events}=mocks();sdk.requestConsentInfo.mockResolvedValue({status:'REQUIRED',isConsentFormAvailable:true,canRequestAds:false,privacyOptionsRequirementStatus:'REQUIRED'});sdk.showConsentForm.mockResolvedValue({canRequestAds:false,privacyOptionsRequirementStatus:'REQUIRED'})
  expect(await openBannerSession(config,bridge,events)).toBeNull();expect(sdk.showConsentForm).toHaveBeenCalledOnce();expect(events.privacy).toHaveBeenCalledWith(true);expect(sdk.initialize).not.toHaveBeenCalled();expect(sdk.showBanner).not.toHaveBeenCalled()
 })
 it('does not make an ad request when consent info cannot be updated',async()=>{
  const {sdk,bridge,events}=mocks();sdk.requestConsentInfo.mockRejectedValue(new Error('offline'))
  await expect(openBannerSession(config,bridge,events)).rejects.toThrow('offline');expect(sdk.showBanner).not.toHaveBeenCalled()
 })
 it('reserves the measured space before a muted, top adaptive banner is shown',async()=>{
  const {sdk,bridge,events}=mocks();await openBannerSession(config,bridge,events)
  expect(events.reserve).toHaveBeenCalledWith(50)
  expect(events.reserve.mock.invocationCallOrder[0]).toBeLessThan(sdk.showBanner.mock.invocationCallOrder[0]!)
  expect(sdk.setApplicationMuted).toHaveBeenCalledWith({muted:true})
  expect(sdk.showBanner).toHaveBeenCalledWith(expect.objectContaining({adSize:'ADAPTIVE_BANNER',position:'TOP_CENTER',margin:6,isTesting:false,adId:config.bannerId}))
 })
 it('always substitutes official Google test units in debug builds',async()=>{
  const {sdk,bridge,events}=mocks();await openBannerSession({...config,debug:true},bridge,events)
  expect(sdk.showBanner).toHaveBeenCalledWith(expect.objectContaining({isTesting:true,adId:GOOGLE_TEST_BANNER}))
 })
 it('tags child-directed requests and restricts content rating',async()=>{
  const {sdk,bridge,events}=mocks();await openBannerSession({...config,audience:'children'},bridge,events)
  expect(sdk.requestConsentInfo).toHaveBeenCalledWith({tagForUnderAgeOfConsent:true})
  expect(sdk.initialize).toHaveBeenCalledWith(expect.objectContaining({tagForChildDirectedTreatment:true,tagForUnderAgeOfConsent:true,maxAdContentRating:'General'}))
  expect(sdk.showBanner).toHaveBeenCalledWith(expect.objectContaining({npa:true}))
 })
 it('hides behind dialogs and removes the banner after privacy no longer permits requests',async()=>{
  const {sdk,bridge,events}=mocks();const session=(await openBannerSession(config,bridge,events))!
  await session.setObscured(true);expect(sdk.hideBanner).toHaveBeenCalledOnce()
  await session.setObscured(false);expect(sdk.resumeBanner).toHaveBeenCalledOnce()
  sdk.requestConsentInfo.mockResolvedValue({status:'REQUIRED',canRequestAds:false,privacyOptionsRequirementStatus:'REQUIRED'})
  await session.privacyOptions();expect(sdk.showPrivacyOptionsForm).toHaveBeenCalledOnce();expect(sdk.removeBanner).toHaveBeenCalledOnce()
  const calls=sdk.resumeBanner.mock.calls.length;await session.setObscured(false);expect(sdk.resumeBanner).toHaveBeenCalledTimes(calls)
 })
 it('serializes changes and prevents new banners after disposal',async()=>{
  const {sdk,bridge,events}=mocks();const session=(await openBannerSession(config,bridge,events))!
  await session.resize(90);expect(events.reserve).toHaveBeenLastCalledWith(90)
  await session.dispose();const count=sdk.showBanner.mock.calls.length
  await session.resize(50);expect(sdk.showBanner).toHaveBeenCalledTimes(count)
 })
})
