import {test,expect} from './fixtures'
const origin='https://study-tools-calculator.pages.dev'
test('verification, robots and sitemap are publicly accessible static resources',async({request})=>{
 const verification=await request.get('/googlee4b4a8558ff35d51.html')
 expect(verification.status()).toBe(200)
 expect(await verification.text()).toBe('google-site-verification: googlee4b4a8558ff35d51.html')
 const robots=await request.get('/robots.txt')
 expect(await robots.text()).toContain(`Sitemap: ${origin}/sitemap.xml`)
 const sitemap=await request.get('/sitemap.xml')
 const xml=await sitemap.text()
 for(const route of ['/','/ar/','/en/','/privacy'])expect(xml).toContain(`<loc>${origin}${route}</loc>`)
})
for(const language of ['ar','en'] as const){
 test(`static ${language} guide is readable without JavaScript and links back to the calculator`,async({browser})=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:640}})
  const page=await context.newPage()
  try{
   await page.goto(`http://127.0.0.1:5174/${language}/`)
   await expect(page.locator('html')).toHaveAttribute('lang',language)
   await expect(page.getByRole('heading',{level:1})).toContainText('CalcES 991')
   await expect(page.locator('section')).toHaveCount(8)
   await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href',`${origin}/${language}/`)
   for(const locale of ['ar','en'])await expect(page.locator(`link[hreflang="${locale}"]`)).toHaveAttribute('href',`${origin}/${locale}/`)
   await expect(page.locator('main a.primary')).toHaveAttribute('href','/')
   expect(await page.locator('body').innerText()).not.toContain('undefined')
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
   await page.locator('main a.primary').click()
   await expect(page.locator('noscript h1')).toContainText('CalcES 991')
  }finally{await context.close()}
 })
}
test('first-launch guides are discoverable without adding calculator toolbar buttons',async({page})=>{
 await page.addInitScript(()=>localStorage.removeItem('calces_language'))
 await page.goto('/')
 await expect(page.getByRole('link',{name:'دليل الاستخدام',exact:true})).toHaveAttribute('href','/ar/')
 await expect(page.getByRole('link',{name:'User guide',exact:true})).toHaveAttribute('href','/en/')
 await page.getByRole('button',{name:'العربية',exact:true}).click()
 await expect(page.locator('math-field')).toBeVisible()
 await expect(page.locator('.app-toolbar > button')).toHaveCount(5)
})
test('cached guide navigation preserves its language when offline',async({page,context},testInfo)=>{
 test.skip(!testInfo.config.metadata.production,'Production service worker only')
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}))})
 await context.setOffline(true)
 try{
  await page.goto('/en/')
  await expect(page.getByRole('heading',{level:1})).toHaveText('CalcES 991 scientific calculator guide')
 }finally{await context.setOffline(false)}
})
