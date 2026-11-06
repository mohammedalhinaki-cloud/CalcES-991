import {test,expect} from './fixtures'
import type {MathfieldElement} from 'mathlive'
test('cursor movement reuses integral offsets and edits invalidate that cache',async({page})=>{
 await page.goto('/');const field=page.locator('math-field');await expect(field).toBeVisible()
 await field.evaluate(el=>{
  const f=el as MathfieldElement
  f.value='\\int(\\cos(X)^2+\\sin(X)^2,0,1)+\\int(X^2+X^3,0,2)'
  f.dispatchEvent(new InputEvent('input',{bubbles:true}));f.position=0
  f.dataset.calls='0'
  const original=f.getElementInfo.bind(f)
  f.getElementInfo=offset=>{f.dataset.calls=String(Number(f.dataset.calls)+1);return original(offset)}
 })
 for(let i=0;i<20;i++)await page.getByRole('button',{name:'المؤشر ▶',exact:true}).click()
 const work=await field.evaluate(el=>({calls:Number(el.dataset.calls),offsets:(el as MathfieldElement).lastOffset}))
 expect(work.calls).toBeLessThan(work.offsets*2)
 await field.evaluate(el=>{const f=el as MathfieldElement;f.value='\\int(X,0,2)+\\int(X,0,3)';f.dispatchEvent(new InputEvent('input',{bubbles:true}));f.position=0})
 await page.locator('[data-key="equals"]').click()
 await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('6.5')
 await field.evaluate(el=>{const f=el as MathfieldElement;f.position=0;f.dataset.calls='0'})
 for(let i=0;i<8;i++)await page.getByRole('button',{name:'المؤشر ▶',exact:true}).click()
 expect(await field.evaluate(el=>Number(el.dataset.calls))).toBeLessThan(50)
})
