import {test,expect} from './fixtures'
import type {MathfieldElement} from 'mathlive'
for(const layer of ['NORMAL','SHIFT','ALPHA'] as const){
 test(`all 50 keys respond without crashing on a complex expression in ${layer}`,async({page})=>{
  await page.goto('/');const field=page.locator('math-field');await expect(field).toBeVisible()
  await field.evaluate(el=>el.setAttribute('data-instance','stable'))
  const ids=await page.locator('.calculator-keypad [data-key]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('data-key')!))
  expect(ids).toHaveLength(46)
  for(const id of ids){
   await page.locator('[data-key="on"]').click();await page.locator('[data-key="clear"]').click()
   await field.evaluate(el=>{const f=el as MathfieldElement;f.value='(\\frac{3}{2}+2)^3';f.position=-1;f.dispatchEvent(new InputEvent('input',{bubbles:true}))})
   if(layer!=='NORMAL')await page.locator(`[data-key="${layer==='SHIFT'?'shift':'alpha'}"]`).click()
   await page.locator(`[data-key="${id}"]`).click()
   if(id==='equals')await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('42.875')
   if(await page.locator('dialog[open]').count())await page.keyboard.press('Escape')
   await expect(field).toHaveAttribute('data-instance','stable')
  }
  await page.locator('[data-key="on"]').click()
  for(const arrow of ['◀','▶','▲','▼']){
   if(layer!=='NORMAL')await page.locator(`[data-key="${layer==='SHIFT'?'shift':'alpha'}"]`).click()
   await page.getByRole('button',{name:`المؤشر ${arrow}`,exact:true}).click()
  }
  await expect(page.locator('.calculator-keypad button')).toHaveCount(50)
 })
}
