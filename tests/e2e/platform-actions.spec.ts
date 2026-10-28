import {test,expect} from './fixtures'
const store='https://play.google.com/store/apps/details?id=calces991.calculator'
const website='https://study-tools-calculator.pages.dev/'
for(const userAgent of ['Mozilla/5.0 (Linux; Android 14)','Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)']){
 test(`Android website remains accessible without forced redirects: ${userAgent.includes('Googlebot')?'crawler':'visitor'}`,async({page})=>{
  await page.addInitScript(userAgent=>Object.defineProperty(navigator,'userAgent',{configurable:true,value:userAgent}),userAgent)
  await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
  await expect(page).toHaveURL('http://127.0.0.1:5174/')
 })
}
test('Android install button navigates directly to Google Play',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 // The website stays open until the visitor explicitly chooses the install button.
 await page.evaluate(()=>Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (Linux; Android 14)'}))
 await page.route('https://play.google.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Google Play destination</h1>'}))
 await page.getByRole('button',{name:'تثبيت التطبيق'}).click()
 await expect(page).toHaveURL(store)
})
test('Android share and clipboard use the official Play URL',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Android'})
  Object.defineProperty(navigator,'share',{configurable:true,value:async(data:ShareData)=>{document.body.dataset.shared=data.url}})
 })
 await page.getByRole('button',{name:'مشاركة الحاسبة'}).click();await expect(page.locator('body')).toHaveAttribute('data-shared',store)
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'share',{configurable:true,value:undefined})
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{document.body.dataset.copied=text}}})
 })
 await page.getByRole('button',{name:'مشاركة الحاسبة'}).click();await expect(page.locator('body')).toHaveAttribute('data-copied',store)
})
test('iPhone keeps website sharing and its available PWA installation flow',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.evaluate(()=>{
  Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'})
  Object.defineProperty(navigator,'share',{configurable:true,value:async(data:ShareData)=>{document.body.dataset.shared=data.url}})
  const event=new Event('beforeinstallprompt',{cancelable:true})
  Object.assign(event,{prompt:async()=>{document.body.dataset.prompted='yes'},userChoice:Promise.resolve({outcome:'accepted'})});window.dispatchEvent(event)
 })
 await page.getByRole('button',{name:'مشاركة الحاسبة'}).click();await expect(page.locator('body')).toHaveAttribute('data-shared',website)
 await page.getByRole('button',{name:'تثبيت التطبيق'}).click();await expect(page.locator('body')).toHaveAttribute('data-prompted','yes')
})
