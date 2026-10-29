import { expect, test } from './fixtures'
import type { MathfieldElement } from 'mathlive'

test('classic shell, LCD and all 50 keys fit the live viewport without page scrolling',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.locator('math-field').evaluate(el=>{const field=el as MathfieldElement;field.value='\\frac{-2}{5}';field.dispatchEvent(new InputEvent('input',{bubbles:true}))})
 await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('-0.4')
 for(const [width,height] of [[320,568],[360,640],[375,667],[390,844],[390,700],[393,852],[412,915],[280,653],[844,390],[1280,900]]){
  await page.setViewportSize({width:width!,height:height!})
  const geometry=await page.evaluate(()=>{
   const box=(el:Element)=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}
   return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,keys:[...document.querySelectorAll('[aria-label="لوحة مفاتيح الحاسبة"] button')].map(box),brand:box(document.querySelector('.calculator-brand')!),lcd:box(document.querySelector('.lcd-panel')!)}
  })
  expect(geometry.scrollHeight,`${width}×${height}: page height`).toBeLessThanOrEqual(geometry.height+1)
  expect(geometry.scrollWidth,`${width}×${height}: page width`).toBeLessThanOrEqual(geometry.width)
  expect(geometry.keys).toHaveLength(50)
  for(const key of geometry.keys){
   expect(key.top).toBeGreaterThanOrEqual(0);expect(key.left).toBeGreaterThanOrEqual(0)
   expect(key.bottom).toBeLessThanOrEqual(geometry.height);expect(key.right).toBeLessThanOrEqual(geometry.width)
   expect(key.height).toBeGreaterThan(16)
  }
  expect(geometry.brand.height).toBeGreaterThanOrEqual(30)
  expect(geometry.lcd.width).toBeGreaterThan(100)
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('-0.4')
 }
})
test('layers, notices and expanded tools keep the main page within the viewport',async({page})=>{
 await page.setViewportSize({width:360,height:640});await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await page.locator('[data-key="shift"]').click()
 await expect(page.locator('[data-key="sin"]')).toHaveAttribute('aria-label','sin⁻¹')
 await expect(page.locator('[data-key="sin"]')).toHaveText('sin')
 await page.locator('[data-key="alpha"]').click()
 await expect(page.locator('[data-key="sin"]')).toHaveAttribute('aria-label','D')
 await page.locator('[data-key="clear"]').click()
 await page.locator('math-field').evaluate(el=>{const field=el as MathfieldElement;field.value='1/0';field.dispatchEvent(new InputEvent('input',{bubbles:true}))})
 await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveAttribute('data-status','error')
 await page.getByRole('button',{name:'مساحة العمل',exact:true}).click()
 await expect(page.locator('#workspace')).toBeVisible()
 const panel=await page.locator('#workspace').boundingBox(),keypad=await page.getByLabel('لوحة مفاتيح الحاسبة',{exact:true}).boundingBox()
 expect(panel!.y+panel!.height).toBeLessThanOrEqual(keypad!.y)
 expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true)
 await page.getByRole('button',{name:'إغلاق مساحة العمل'}).click()
 await page.locator('[data-key="clear"]').click();await page.locator('[data-key="2"]').click();await page.locator('[data-key="+"]').click();await page.locator('[data-key="3"]').click();await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('5')
})
