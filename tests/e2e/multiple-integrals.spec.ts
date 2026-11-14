import { test, expect, openAppMenu } from './fixtures'
import type {MathfieldElement} from 'mathlive'
import type {Page} from '@playwright/test'
test.use({hasTouch:true,viewport:{width:390,height:844}})
const output=(page:Page)=>page.getByLabel('النتيجة',{exact:true})
async function key(page:Page,...ids:string[]){for(const id of ids)await page.locator(`[data-key="${id}"]`).click()}
async function right(page:Page){await page.getByRole('button',{name:'المؤشر ▶',exact:true}).click()}
async function integral(page:Page,upper:string){
 await key(page,'integral','alpha','close');await right(page);await key(page,'0');await right(page);await key(page,upper)
}
async function formula(page:Page,value:string){await page.locator('math-field').evaluate((el,value)=>{const f=el as MathfieldElement;f.value=value;f.dispatchEvent(new InputEvent('input',{bubbles:true}))},value)}
async function ids(page:Page){return page.locator('math-field').evaluate(el=>{const f=el as MathfieldElement;return [...new Set(Array.from({length:f.lastOffset+1},(_,i)=>f.getElementInfo(i)?.data?.['calces-integral']).filter(Boolean))]})}
test('two keypad integrals can be added without losing the first one',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await integral(page,'1');await right(page);await key(page,'+');await integral(page,'2')
 expect(await ids(page)).toHaveLength(2)
 await key(page,'equals');await expect(output(page)).toHaveText('2.5')
 await expect(page.locator('#workspace')).toBeHidden()
 await expect(page.locator('dialog[open]')).toHaveCount(0)
})
test('consecutive integral presses insert a separate adjacent operand',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await integral(page,'1');await integral(page,'1')
 expect(await ids(page)).toHaveLength(2)
 await key(page,'equals');await expect(output(page)).toHaveText('0.25')
})
test('second-integral navigation and editing stay inside its own bounds',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await integral(page,'1');await right(page);await key(page,'+');await integral(page,'2')
 const groups=await ids(page),second=groups[1]!
 await page.getByRole('button',{name:'المؤشر ▼',exact:true}).click()
 expect(await page.locator('math-field').evaluate(el=>(el as MathfieldElement).getElementInfo((el as MathfieldElement).position)?.data?.['calces-integral'])).toBe(second)
 await key(page,'equals');await expect(output(page)).toHaveText('2.5')
 await page.locator('math-field').evaluate((el,id)=>{const f=el as MathfieldElement;for(let i=0;i<=f.lastOffset;i++){const info=f.getElementInfo(i);if(info?.data?.['calces-integral']===id&&info.data['calces-slot']==='upper'&&info.latex==='2'){f.selection={ranges:[[i-1,i]]};f.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));break}}},second)
 await key(page,'3','equals');await expect(output(page)).toHaveText('5')
 expect(await ids(page)).toHaveLength(2)
})
test('complex combinations preserve precedence and recover from an incomplete second operand',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 for(const [source,result] of [['2+3*\\int(X,0,2)^2-\\int(1,0,1)','13'],['\\frac{\\int(X,0,2)}{\\int(X^2,0,1)}','6'],['\\int(1,0,5)!+\\int(X,0,2)','122'],['\\sin(\\int(1,0,90))+\\int(1,0,1)','2']] as const){
  await formula(page,source);expect(await ids(page)).toHaveLength(2)
  await key(page,'equals');await expect(output(page)).toHaveText(result)
 }
 await formula(page,'\\int(X,0,1)+\\int(X,0,\\placeholder{})');await key(page,'equals')
 await expect(output(page)).toHaveText('Syntax ERROR')
 await formula(page,'\\int(X,0,1)+\\int(X,0,1)');await key(page,'equals');await expect(output(page)).toHaveText('1')
})
test('recall restores both MathIO operands and repeats the exact result',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 await formula(page,'\\int(X^2,0,2)+\\int(X^3,0,2)');await key(page,'equals')
 await expect(output(page)).toHaveText('6.6666666666667')
 await key(page,'clear');await (await openAppMenu(page)).getByRole('button',{name:'السجل (1)',exact:true}).click()
 await page.getByRole('dialog').getByRole('button',{name:/استدعاء/}).click()
 expect(await ids(page)).toHaveLength(2)
 await key(page,'calc');await expect(output(page)).toHaveText('6.6666666666667')
})
