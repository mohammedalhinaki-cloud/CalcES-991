import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {describe,expect,it,vi} from 'vitest'
const html=readFileSync('index.html','utf8')
const script=/<script id="android-store-redirect">([\s\S]*?)<\/script>/.exec(html)![1]!
function boot(userAgent:string,options:{hostname?:string;bridge?:boolean;capacitor?:boolean;protocol?:string}={}){
 const replace=vi.fn(),dataset:Record<string,string>={}
 runInNewContext(script,{document:{documentElement:{dataset}},navigator:{userAgent},window:{androidBridge:options.bridge?{}:undefined,Capacitor:options.capacitor?{isNativePlatform:()=>true}:undefined,location:{replace,hostname:options.hostname??'study-tools-calculator.pages.dev',protocol:options.protocol??'https:'}}})
 return {replace,dataset}
}
describe('early smart-link redirect',()=>{
 it('redirects Android before metadata and suppresses calculator loading',()=>{
  expect(html.indexOf('id="android-store-redirect"')).toBeLessThan(html.indexOf('<meta'))
  const {replace,dataset}=boot('Mozilla/5.0 (Linux; Android 14)')
  expect(replace).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=calces991.calculator&pcampaignid=web_share')
  expect(dataset.storeRedirect).toBe('true')
 })
 it.each(['iPhone','iPad','Windows NT','Macintosh'])('leaves %s on the website',ua=>{const result=boot(ua);expect(result.replace).not.toHaveBeenCalled();expect(result.dataset.storeRedirect).toBeUndefined()})
 it.each([{bridge:true},{capacitor:true},{hostname:'localhost'},{protocol:'capacitor:'},{protocol:'file:'}])('does not redirect the packaged Android app: %j',options=>expect(boot('Android',options).replace).not.toHaveBeenCalled())
})
