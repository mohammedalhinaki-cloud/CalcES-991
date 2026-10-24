import {test,expect} from './fixtures'
const store='https://play.google.com/store/apps/details?id=calces991.calculator'
const website='https://study-tools-calculator.pages.dev/'
test('Android browser redirects during the initial HTML head execution',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(navigator,'userAgent',{configurable:true,value:'Mozilla/5.0 (Linux; Android 14)'}))
 await page.route('https://play.google.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>Google Play destination</h1>'}))
 await page.goto('/');await expect(page).toHaveURL(store)
})
test('Android install button navigates directly to Google Play',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 // Change only the UA after boot so the separate install handler can be exercised.
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
