import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {describe,expect,it,vi} from 'vitest'
const html=readFileSync('index.html','utf8')
const script=/<script id="android-store-redirect">([\s\S]*?)<\/script>/.exec(html)![1]!
function boot(userAgent:string,options:{hostname?:string;bridge?:boolean;capacitor?:boolean;protocol?:string}={}){
 const replace=vi.fn()
 runInNewContext(script,{navigator:{userAgent},window:{androidBridge:options.bridge?{}:undefined,Capacitor:options.capacitor?{isNativePlatform:()=>true}:undefined,location:{replace,hostname:options.hostname??'study-tools-calculator.pages.dev',protocol:options.protocol??'https:'}}})
 return replace
}
describe('early HTML platform redirect',()=>{
 it('runs before app modules and immediately redirects Android web visitors',()=>{
  expect(html.indexOf('id="android-store-redirect"')).toBeLessThan(html.indexOf('<meta'))
  expect(boot('Mozilla/5.0 (Linux; Android 14)')).toHaveBeenCalledWith('https://play.google.com/store/apps/details?id=calces991.calculator')
 })
 it.each(['Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)','Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)','Mozilla/5.0 (Windows NT 10.0; Win64; x64)','Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)'])('keeps iOS and desktop on the calculator: %s',ua=>expect(boot(ua)).not.toHaveBeenCalled())
 it.each([{bridge:true},{capacitor:true},{hostname:'localhost'},{protocol:'capacitor:'},{protocol:'file:'}])('never redirects the packaged app: %j',options=>expect(boot('Android',options)).not.toHaveBeenCalled())
})
