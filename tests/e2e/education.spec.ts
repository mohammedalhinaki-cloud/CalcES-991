import {test,expect} from './fixtures'
import type {Page} from '@playwright/test'
async function openTool(page:Page,name:string){
 if(await page.locator('.education-page').isVisible())await page.getByRole('button',{name:/^(الحاسبة|Calculator)$/,exact:true}).click()
 const workspace=page.getByRole('button',{name:/^(مساحة العمل|Workspace)$/,exact:true})
 if(await workspace.getAttribute('aria-expanded')!=='true')await workspace.click()
 if(name==='الحاسبة'){await workspace.click();return}
 await page.getByRole('button',{name,exact:true}).click()
}


test('quadratic steps, complex roots and linear systems work in English',async({page})=>{
 await page.goto('/');await page.evaluate(()=>localStorage.setItem('calces_language','en'));await page.reload()
 await openTool(page,'Equations')
 await expect(page.getByText('Step-by-step solution',{exact:true})).toBeVisible()
 await expect(page.locator('.education-solution')).toContainText('x₁ = 2')
 await page.getByLabel('b',{exact:true}).fill('0');await page.getByLabel('c',{exact:true}).fill('1')
 await expect(page.locator('.education-solution')).toContainText('0 + 1i')
 await page.getByLabel('a',{exact:true}).fill('0')
 await expect(page.getByText('Enter valid coefficients. The coefficient a must not be zero.')).toBeVisible()
 await page.getByLabel('Equation type').selectOption('linear')
 await expect(page.locator('.education-solution')).toContainText('x = 2')
 await expect(page.locator('.education-solution')).toContainText('y = 1')
})

test('converter instantly changes category, units and direction',async({page})=>{
 await page.goto('/');await openTool(page,'المحول')
 await page.getByLabel('الفئة',{exact:true}).selectOption('temperature')
 await page.getByLabel('القيمة',{exact:true}).fill('273.15')
 await expect(page.getByLabel('نتيجة التحويل',{exact:true})).toHaveText('0 C')
 await page.getByLabel('من',{exact:true}).selectOption('C');await page.getByLabel('إلى',{exact:true}).selectOption('F')
 await page.getByLabel('القيمة',{exact:true}).fill('100')
 await expect(page.getByLabel('نتيجة التحويل',{exact:true})).toHaveText('212 F')
 await page.getByRole('button',{name:'عكس الوحدات ⇄'}).click()
 await page.getByLabel('القيمة',{exact:true}).fill('212')
 await expect(page.getByLabel('نتيجة التحويل',{exact:true})).toHaveText('100 C')
})

test('constant insertion preserves scientific notation and calculator state across tabs',async({page})=>{
 await page.goto('/');await openTool(page,'الثوابت')
 await page.getByLabel('البحث في الثوابت').fill('بلانك')
 await page.evaluate(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async(text:string)=>{(window as any).__copiedConstant=text}}}))
 await page.getByRole('button',{name:'نسخ القيمة',exact:true}).click()
 await expect(page.getByText('تم نسخ القيمة.',{exact:true})).toBeVisible()
 expect(await page.evaluate(()=>(window as any).__copiedConstant)).toBe('6.62607015e-34')
 await page.getByRole('button',{name:'استخدم في الحاسبة',exact:true}).click()
 await expect(page.locator('math-field')).toBeVisible()
 await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toContainText('6.62607015')
 const before=await page.locator('math-field').evaluate((el:any)=>el.value)
 await openTool(page,'المعادلات')
 await openTool(page,'الحاسبة')
 expect(await page.locator('math-field').evaluate((el:any)=>el.value)).toBe(before)
})

test('all educational tools remain usable after an offline reload',async({page,context},testInfo)=>{
 test.skip(!testInfo.config.metadata.production,'Production cache only')
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}))})
 await context.setOffline(true)
 try{
  await page.reload();await openTool(page,'المعادلات')
  await expect(page.locator('.education-solution')).toContainText('x₁ = 2')
  await openTool(page,'المحول')
  await expect(page.getByLabel('نتيجة التحويل',{exact:true})).toHaveText('0.001 km')
  await openTool(page,'الثوابت')
  await expect(page.getByText('سرعة الضوء في الفراغ',{exact:true})).toBeVisible()
 }finally{await context.setOffline(false)}
})

for(const viewport of [{width:320,height:640},{width:768,height:1024}])test(`tools fit viewport ${viewport.width}`,async({page},testInfo)=>{
 await page.setViewportSize(viewport);await page.goto('/')
 for(const name of ['الحاسبة','المعادلات','المحول','الثوابت']){
  await openTool(page,name)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight)).toBe(true)
  if(name==='المعادلات'||name==='الثوابت')await page.screenshot({path:testInfo.outputPath(name==='المعادلات'?'equations.png':'constants.png')})
 }
})


test('native banner space keeps navigation and scrolled reference content clear',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/')
 await page.evaluate(()=>{document.documentElement.classList.add('native-android');document.documentElement.style.setProperty('--native-banner-slot','102px')})
 await openTool(page,'الثوابت')
 const layout=await page.evaluate(()=>{const panel=document.querySelector('.education-page')!.getBoundingClientRect();return {top:panel.top,bottom:panel.bottom,height:innerHeight}})
 expect(layout.top).toBeGreaterThanOrEqual(102)
 expect(layout.bottom).toBeLessThanOrEqual(layout.height)
 await page.locator('.education-page').evaluate(el=>el.scrollTop=600)
 expect(await page.locator('.education-page').evaluate(el=>el.getBoundingClientRect().top)).toBe(layout.top)
})


test('educational buttons are only available inside the existing Tools panel',async({page})=>{
 await page.goto('/')
 await expect(page.locator('.education-nav')).toBeHidden()
 await page.getByRole('button',{name:'مساحة العمل',exact:true}).click()
 await expect(page.locator('#workspace .education-nav')).toBeVisible()
 for(const name of ['المعادلات','المحول','الثوابت'])await expect(page.getByRole('button',{name,exact:true})).toBeVisible()
 await page.getByRole('button',{name:'إغلاق مساحة العمل',exact:true}).click()
 await expect(page.locator('.education-nav')).toBeHidden()
})
