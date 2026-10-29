import {test,expect} from './fixtures'
import type {MathfieldElement} from 'mathlive'
async function formula(page:import('@playwright/test').Page,value:string){await page.locator('math-field').evaluate((el,value)=>{const field=el as MathfieldElement;field.value=value;field.dispatchEvent(new InputEvent('input',{bubbles:true}))},value)}
async function lcdOnly(page:import('@playwright/test').Page){
 await expect(page.locator('#workspace')).toBeHidden()
 await expect(page.locator('dialog[open]')).toHaveCount(0)
 await expect(page.getByRole('textbox',{name:'الحد الأدنى',exact:true})).toHaveCount(0)
 await expect(page.getByRole('textbox',{name:'نقطة الاشتقاق (اختيارية)',exact:true})).toHaveCount(0)
}
test('integral key inserts into the same LCD and arrows navigate the argument list',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.locator('math-field').evaluate(el=>el.setAttribute('data-instance','original'))
 await page.locator('[data-key="integral"]').click();await lcdOnly(page)
 expect(await page.locator('math-field').evaluate(el=>(el as MathfieldElement).value)).toContain('\\int')
 await page.locator('[data-key="alpha"]').click();await page.locator('[data-key="close"]').click()
 await page.getByRole('button',{name:'المؤشر ▶',exact:true}).click();await page.locator('[data-key="0"]').click()
 await page.getByRole('button',{name:'المؤشر ▶',exact:true}).click();await page.locator('[data-key="1"]').click()
 expect(await page.locator('math-field').evaluate(el=>(el as MathfieldElement).value)).not.toContain('placeholder')
 await page.locator('math-field').evaluate(el=>{(el as MathfieldElement).position=0})
 const positions:number[]=[]
 for(let i=0;i<6;i++){
  await page.getByRole('button',{name:'المؤشر ▶',exact:true}).click()
  positions.push(await page.locator('math-field').evaluate(el=>(el as MathfieldElement).position))
 }
 expect(new Set(positions).size).toBe(6)
 await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('0.5')
 await expect(page.locator('math-field')).toHaveAttribute('data-instance','original')
 await lcdOnly(page)
})
test('SHIFT derivative and SOLVE never open data forms and evaluate inline arguments',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.locator('[data-key="shift"]').click();await page.locator('[data-key="integral"]').click();await lcdOnly(page)
 await formula(page,'\\operatorname{d/dx}(X^3,2)');await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('12')
 await page.locator('[data-key="shift"]').click();await page.locator('[data-key="calc"]').click();await lcdOnly(page)
 await formula(page,'\\operatorname{SOLVE}(X^2-2,0,2)');await page.locator('[data-key="equals"]').click()
 await expect.poll(async()=>Number(await page.getByLabel('النتيجة',{exact:true}).textContent())).toBeCloseTo(Math.SQRT2,10)
 await lcdOnly(page)
})
test('syntax errors are confined to the LCD and recover after editing',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 const dialogs:string[]=[];page.on('dialog',dialog=>{dialogs.push(dialog.type());void dialog.dismiss()})
 for(const latex of ['\\int(X,0)','\\int(X,0,\\placeholder{})','\\int(X,X,1)']){
  await formula(page,latex)
  await expect(page.getByLabel('النتيجة',{exact:true})).toBeEmpty()
  await page.locator('[data-key="equals"]').click()
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('Syntax ERROR')
  await lcdOnly(page)
 }
 await formula(page,'\\int(X^2,0,1)');await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('0.33333333333333')
 expect(dialogs).toEqual([])
})
