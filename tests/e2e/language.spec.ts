import {test,expect} from './fixtures'
import type {MathfieldElement} from 'mathlive'
test.use({languageOnboarding:true,viewport:{width:390,height:844},hasTouch:true})
async function formula(page:import('@playwright/test').Page,value:string){await page.locator('math-field').evaluate((el,value)=>{const field=el as MathfieldElement;field.value=value;field.dispatchEvent(new InputEvent('input',{bubbles:true}))},value)}
async function noArabic(page:import('@playwright/test').Page){
 const text=await page.locator('body').innerText();expect(text).not.toMatch(/[\u0600-\u06ff]/)
 const labels=await page.locator('[aria-label]').evaluateAll(els=>els.map(el=>el.getAttribute('aria-label')).join(' '));expect(labels).not.toMatch(/[\u0600-\u06ff]/)
}
test('language chooser appears once; English selection persists through offline restart',async({page,context})=>{
 await page.goto('/')
 await expect(page.getByRole('dialog',{name:/Choose your language/})).toBeVisible()
 await expect(page.getByRole('heading',{name:'Choose your language',exact:true})).toHaveCount(1)
 await expect(page.getByText('اختر لغة التطبيق',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'العربية',exact:true})).toBeVisible()
 await expect(page.getByRole('button',{name:'Arabic',exact:true})).toHaveCount(0)
 await page.getByRole('button',{name:'English',exact:true}).tap()
 await expect(page.locator('math-field')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('lang','en')
 await expect(page.locator('main.app-shell')).toHaveCSS('direction','ltr')
 await expect(page.getByRole('button',{name:'Workspace',exact:true})).toBeVisible()
 await formula(page,'\\frac{1}{2}+\\sqrt{9}');await page.locator('[data-key="equals"]').tap()
 await expect(page.getByLabel('Result',{exact:true})).toHaveText('3.5')
 await noArabic(page)
 const keys=await page.locator('.calculator-keypad button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {bottom:r.bottom,height:r.height}}))
 expect(keys).toHaveLength(50)
 expect(Math.min(...keys.map(key=>key.height))).toBeGreaterThanOrEqual(44)
 expect(Math.max(...keys.map(key=>key.bottom))).toBeGreaterThan(824)
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}))})
 await context.setOffline(true)
 try{await page.reload();await expect(page.locator('math-field')).toBeVisible();await expect(page.getByRole('dialog',{name:/Choose your language/})).not.toBeVisible();await expect(page.getByRole('button',{name:'Workspace',exact:true})).toBeVisible()}finally{await context.setOffline(false)}
})
test('Arabic is retained on next launch and no page scrolling is needed',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'العربية',exact:true}).tap()
 await expect(page.locator('math-field[aria-label="محرر المعادلة"]')).toBeVisible();await expect(page.locator('html')).toHaveAttribute('dir','rtl')
 await page.reload();await expect(page.locator('math-field[aria-label="محرر المعادلة"]')).toBeVisible();await expect(page.getByRole('button',{name:'العربية',exact:true})).not.toBeVisible()
 for(const [width,height] of [[320,568],[844,390]]){
  await page.setViewportSize({width:width!,height:height!})
  expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true)
 }
})
test('English covers all mode panels, worker results, history, setup, and errors',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'English',exact:true}).tap()
 for(const mode of ['COMP','CMPLX','STAT','MATRIX','EQUATION','BASE-N']){
  await page.locator('[data-key="mode"]').tap();await noArabic(page)
  await page.getByRole('dialog',{name:'MODE · Select mode'}).getByRole('button',{name:new RegExp(mode)}).tap()
  if(mode==='COMP')await page.getByRole('button',{name:'Workspace',exact:true}).tap()
  await noArabic(page)
  if(mode==='MATRIX'){
   await page.getByRole('button',{name:'Calculate',exact:true}).tap()
   await expect(page.getByLabel('Advanced calculation result')).toContainText('Determinant of matrix A');await noArabic(page)
  }
 }
 await page.locator('[data-key="mode"]').tap();await page.getByRole('dialog').getByRole('button',{name:/COMP/}).tap()
 await formula(page,'1/0');await page.locator('[data-key="equals"]').tap();await noArabic(page)
 await page.getByRole('button',{name:/History \(/}).tap();await noArabic(page)
 await page.getByRole('dialog',{name:'Calculation history'}).getByRole('button',{name:'Close',exact:true}).tap()
 await page.locator('[data-key="shift"]').tap();await page.locator('[data-key="mode"]').tap();await expect(page.getByRole('dialog')).toContainText('SETUP · Angle unit');await noArabic(page)
})
test('English native privacy and rate reminder retain contact details and correct store URL',async({page})=>{
 await page.addInitScript(()=>Object.defineProperty(window,'androidBridge',{value:{},configurable:true}))
 await page.goto('/');await page.getByRole('button',{name:'English',exact:true}).tap()
 await page.getByRole('button',{name:'Privacy and ads'}).tap()
 const modal=page.getByRole('dialog',{name:'About and privacy 🛡️'})
 await expect(modal).toContainText('Maaoun Studio');await expect(modal).toContainText('jy906675@gmail.com');await noArabic(page)
 await modal.getByRole('button',{name:'Close',exact:true}).tap()
 await page.evaluate(()=>{localStorage.removeItem('rate_done');localStorage.setItem('calc_count','5');window.dispatchEvent(new Event('calces:calculation'))})
 const prompt=page.getByRole('dialog',{name:'Your feedback makes a difference! ⭐️'});await expect(prompt).toBeVisible();await noArabic(page)
 await prompt.getByRole('button',{name:'Remind me later ⏰'}).tap()
 expect(await page.evaluate(()=>Number(localStorage.getItem('rate_remind_at'))>Date.now())).toBe(true)
})
