import {beforeEach,afterEach,it,expect,vi} from 'vitest'
const mocks=vi.hoisted(()=>({getConfiguration:vi.fn(),isAndroid:vi.fn(),addListener:vi.fn(),open:vi.fn()}))
vi.mock('../../native/platform',()=>({AppConfiguration:{getConfiguration:mocks.getConfiguration},isAndroidApp:mocks.isAndroid}))
vi.mock('@capacitor-community/admob',()=>({AdMob:{addListener:mocks.addListener},BannerAdPluginEvents:{SizeChanged:'size',FailedToLoad:'failed'}}))
vi.mock('../../native/bannerSession',()=>({openBannerSession:mocks.open}))
let first:{remove:ReturnType<typeof vi.fn>},second:{remove:ReturnType<typeof vi.fn>}
beforeEach(()=>{
 vi.resetModules();vi.resetAllMocks()
 mocks.isAndroid.mockReturnValue(true)
 mocks.getConfiguration.mockResolvedValue({adsEnabled:true,debug:true,bannerHeight:50})
 first={remove:vi.fn().mockResolvedValue(undefined)};second={remove:vi.fn().mockResolvedValue(undefined)}
 mocks.addListener.mockResolvedValueOnce(first).mockResolvedValueOnce(second)
 mocks.open.mockRejectedValue(new Error('init failed'))
})
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals()})
it('does not allocate SDK listeners or observers in an ad-disabled release',async()=>{
 mocks.getConfiguration.mockResolvedValue({adsEnabled:false,bannerHeight:50})
 const observe=vi.spyOn(MutationObserver.prototype,'observe')
 const {startAndroidAds}=await import('../../native/androidAds');await startAndroidAds()
 expect(mocks.addListener).not.toHaveBeenCalled();expect(observe).not.toHaveBeenCalled()
})
it('removes an already allocated listener when the next registration fails',async()=>{
 mocks.addListener.mockReset().mockResolvedValueOnce(first).mockRejectedValueOnce(new Error('second registration failed'))
 const {startAndroidAds}=await import('../../native/androidAds');await startAndroidAds()
 expect(first.remove).toHaveBeenCalledOnce();expect(mocks.open).not.toHaveBeenCalled()
})
it('releases both native listeners after banner-session initialization fails',async()=>{
 const {startAndroidAds}=await import('../../native/androidAds');await startAndroidAds()
 expect(first.remove).toHaveBeenCalledOnce();expect(second.remove).toHaveBeenCalledOnce()
})
it('disposes the session and other listeners even if one cleanup rejects',async()=>{
 first.remove.mockRejectedValue(new Error('native cleanup failed'))
 const session={dispose:vi.fn().mockResolvedValue(undefined),setObscured:vi.fn().mockResolvedValue(undefined)}
 mocks.open.mockResolvedValue(session)
 vi.spyOn(MutationObserver.prototype,'observe').mockImplementationOnce(()=>{throw new Error('observer setup failed')})
 const disconnect=vi.spyOn(MutationObserver.prototype,'disconnect')
 const {startAndroidAds}=await import('../../native/androidAds');await startAndroidAds()
 expect(disconnect).toHaveBeenCalledOnce();expect(session.dispose).toHaveBeenCalledOnce()
 expect(first.remove).toHaveBeenCalledOnce();expect(second.remove).toHaveBeenCalledOnce()
})
it('disconnects the observer when orientation listener setup fails',async()=>{
 const session={dispose:vi.fn().mockResolvedValue(undefined),setObscured:vi.fn().mockResolvedValue(undefined)}
 mocks.open.mockResolvedValue(session)
 const handler={addEventListener:vi.fn(()=>{throw new Error('orientation setup failed')}),removeEventListener:vi.fn()}
 vi.stubGlobal('screen',{orientation:handler})
 const disconnect=vi.spyOn(MutationObserver.prototype,'disconnect')
 const {startAndroidAds}=await import('../../native/androidAds');await startAndroidAds()
 expect(disconnect).toHaveBeenCalledOnce();expect(handler.removeEventListener).toHaveBeenCalledWith('change',expect.any(Function))
 expect(session.dispose).toHaveBeenCalledOnce()
 expect(first.remove).toHaveBeenCalledOnce();expect(second.remove).toHaveBeenCalledOnce()
})
