import { test, expect } from './fixtures'
import type { MathfieldElement } from 'mathlive'
import type { Page } from '@playwright/test'
async function formula(page:Page, value:string) {
 await page.locator('[data-key="clear"]').click()
 await page.locator('math-field').evaluate((el,latex)=>{const field=el as MathfieldElement;field.value=latex;field.dispatchEvent(new InputEvent('input',{bubbles:true}))},value)
}
async function press(page:Page,...ids:string[]) { for(const id of ids)await page.locator(`[data-key="${id}"]`).click() }

test('natural output renders source-derived radicals and fractions without changing the formula',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 const output=page.getByLabel('النتيجة',{exact:true})
 for(const expression of ['\\sqrt{8}','\\sqrt{2}+\\sqrt{2}','\\pi/3','1/3']) {
  await formula(page,expression);await press(page,'equals')
  const latex=await page.locator('math-field').evaluate(el=>(el as MathfieldElement).getValue())
  const numeric=await output.getAttribute('data-value')
  await press(page,'decimal')
  await expect(output).toHaveAttribute('data-natural','true')
  await expect(output.locator('.katex')).toBeVisible()
  expect(await page.locator('math-field').evaluate(el=>(el as MathfieldElement).getValue())).toBe(latex)
  await press(page,'decimal');await expect(output).toHaveAttribute('data-value',numeric!)
 }
})

test('CALC substitutes only used variables and REPLAY recalls computed expressions',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 const output=page.getByLabel('النتيجة',{exact:true})
 await formula(page,'2X+1');await press(page,'calc')
 const dialog=page.getByRole('dialog',{name:'CALC · تعويض القيم'})
 await expect(dialog).toBeVisible();await expect(dialog.locator('input')).toHaveCount(1)
 await dialog.getByLabel('X =',{exact:true}).fill('5')
 await dialog.getByRole('button',{name:'احسب',exact:true}).click()
 await expect(output).toHaveText('11')
 expect(await page.locator('math-field').evaluate(el=>(el as MathfieldElement).getValue())).toBe('2X+1')
 await formula(page,'3\\times3');await press(page,'equals');await expect(output).toHaveText('9')
 await page.getByRole('button',{name:'المؤشر ▲',exact:true}).click();await expect(output).toHaveText('11')
 await page.getByRole('button',{name:'المؤشر ▼',exact:true}).click();await expect(output).toHaveText('9')
})

test('FIX and SCI settings change presentation but preserve Ans and full stored precision',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 const output=page.getByLabel('النتيجة',{exact:true})
 await formula(page,'1/3');await press(page,'equals','shift','mode')
 let dialog=page.getByRole('dialog',{name:/SETUP/})
 await dialog.getByRole('button',{name:'Fix',exact:true}).click()
 await dialog.getByLabel('الأرقام',{exact:true}).selectOption('3')
 await dialog.getByRole('button',{name:'إغلاق',exact:true}).click()
 await expect(output).toHaveText('0.333')
 await press(page,'clear','answer','×','3','equals');await expect(output).toHaveText('1.000')
 await press(page,'shift','mode');dialog=page.getByRole('dialog',{name:/SETUP/})
 await dialog.getByRole('button',{name:'Sci',exact:true}).click()
 await dialog.getByLabel('الأرقام',{exact:true}).selectOption('3')
 await dialog.getByRole('button',{name:'إغلاق',exact:true}).click()
 await expect(output).toHaveText('1.00e+0')
 await press(page,'shift','mode');await page.getByRole('dialog',{name:/SETUP/}).getByRole('button',{name:'Norm',exact:true}).click()
 await page.getByRole('dialog',{name:/SETUP/}).getByRole('button',{name:'إغلاق',exact:true}).click()
 await expect(output).toHaveText('1')
})

test('offline production restart retains scientific evaluation and natural typesetting',async({page,context},testInfo)=>{
 test.skip(!testInfo.config.metadata.production,'The service worker is generated only for the production artifact')
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}))})
 await context.setOffline(true)
 try {
  await page.reload();await expect(page.locator('math-field')).toBeVisible()
  await formula(page,'0.1+0.2');await press(page,'equals')
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('0.3')
  await formula(page,'\\sqrt{8}');await press(page,'equals','decimal')
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveAttribute('data-natural','true')
  await expect(page.getByLabel('النتيجة',{exact:true}).locator('.katex')).toBeVisible()
 } finally { await context.setOffline(false) }
})
