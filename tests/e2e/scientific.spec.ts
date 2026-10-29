import { expect, test } from './fixtures'
import type { MathfieldElement } from 'mathlive'

test('on-screen trig, inverse trig, angles, roots and factorial evaluate through MathLive',async({page})=>{
  const errors:string[]=[]
  page.on('pageerror',e=>errors.push(e.message))
  page.on('console',m=>{if(['error','warning'].includes(m.type()))errors.push(m.text())})
  await page.goto('/')
  await expect(page.locator('math-field')).toBeVisible()
  const press=async(...ids:string[])=>{for(const id of ids)await page.locator(`[data-key="${id}"]`).click()}
  const output=page.getByLabel('النتيجة',{exact:true})
  await press('sin','3','0','equals')
  await expect(output).toHaveText('0.5')
  await press('shift','sin','0','.','5','equals')
  await expect(output).toHaveText('30')
  await press('clear','shift','mode')
  await page.getByRole('button',{name:'RAD',exact:true}).click()
  await press('sin','shift','exponent','÷','2','equals')
  await expect(output).toHaveText('1')
  await press('clear','5','shift','inverse','equals')
  await expect(output).toHaveText('120')
  await press('clear','shift','sqrt','negative','8','equals')
  await expect(output).toHaveText('-2')
  await press('clear','shift','hyp','negative','3','equals')
  await expect(output).toHaveText('3')
  await press('clear','hyp','cos','0','equals')
  await expect(output).toHaveText('1')
  await page.waitForLoadState('networkidle')
  expect(errors).toEqual([])
})

test('STO/RCL, variable evaluation, memory and Ans use computed values',async({page})=>{
  await page.goto('/')
  await expect(page.locator('math-field')).toBeVisible()
  const press=async(...ids:string[])=>{for(const id of ids)await page.locator(`[data-key="${id}"]`).click()}
  const output=page.getByLabel('النتيجة',{exact:true})
  await press('2','+','3','equals','shift','recall','negative')
  await press('clear','alpha','negative','×','2','equals')
  await expect(output).toHaveText('10')
  await press('memory','clear','2','equals','shift','memory')
  await press('clear','recall','memory')
  await expect(output).toHaveText('8')
  await press('clear','recall','negative')
  await expect(output).toHaveText('5')
  await press('clear','1','+','1','equals','+','1','equals')
  await expect(output).toHaveText('3')
  // Editing Ans changes neither the committed result nor the stored answer until =.
  await press('clear','answer')
  await expect(output).toHaveText('3')
})

test('fraction and engineering formatting do not rewrite the editor',async({page})=>{
  await page.goto('/')
  const field=page.locator('math-field')
  await expect(field).toBeVisible()
  const press=async(...ids:string[])=>{for(const id of ids)await page.locator(`[data-key="${id}"]`).click()}
  const output=page.getByLabel('النتيجة',{exact:true})
  await press('1','÷','3','equals')
  const latex=await field.evaluate(el=>(el as MathfieldElement).getValue())
  await press('decimal')
  await expect(output).toHaveAttribute('data-value','1/3')
  await expect(output).toHaveAttribute('data-natural','true')
  await expect(output.locator('.katex')).toBeVisible()
  expect(await field.evaluate(el=>(el as MathfieldElement).getValue())).toBe(latex)
  await press('decimal')
  await expect(output).toHaveText('0.33333333333333')
  await press('clear','1','2','3','4','5','6','equals','eng')
  await expect(output).toHaveText('123.456×10^3')
  await press('eng')
  await expect(output).toHaveText('123456×10^0')
})

test('domain errors recover and angle changes leave committed Ans frozen',async({page})=>{
  await page.goto('/')
  await expect(page.locator('math-field')).toBeVisible()
  const press=async(...ids:string[])=>{for(const id of ids)await page.locator(`[data-key="${id}"]`).click()}
  const output=page.getByLabel('النتيجة',{exact:true})
  await press('tan','9','0','equals')
  await expect(output).toHaveAttribute('data-status','error')
  await press('clear','sin','3','0','equals','shift','mode')
  await page.getByRole('button',{name:'RAD',exact:true}).click()
  await expect(output).toHaveText('0.5')
  await press('clear','answer')
  await expect(output).toHaveText('0.5')
  await press('clear','1','2','.','5','equals','shift','dms')
  // Value is radians in RAD mode; DMS output converts it to degrees.
  await expect(output).toContainText('°')
})

test('touching a committed expression allows selection replacement instead of clearing it',async({page})=>{
  await page.goto('/')
  const field=page.locator('math-field')
  await expect(field).toBeVisible()
  for(const id of ['1','2','3','equals'])await page.locator(`[data-key="${id}"]`).click()
  await field.click()
  await field.evaluate(el=>{(el as MathfieldElement).selection={ranges:[[1,2]]}})
  await page.locator('[data-key="9"]').click()
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('193')
})
