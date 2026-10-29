import {test,expect} from './fixtures'
import type {Page} from '@playwright/test'
import type {MathfieldElement} from 'mathlive'
import {DEVICE_CALCULUS_TEMPLATES} from '../../src/engine/inlineCalculus'

test.use({calculatorInterface:'device',viewport:{width:390,height:844},hasTouch:true})
const mainField=(page:Page)=>page.locator('.device-main-editor math-field')
const answer=(page:Page)=>page.getByLabel('النتيجة',{exact:true})
async function press(page:Page,...keys:string[]) {for(const key of keys)await page.locator(`[data-key="${key}"]`).tap()}
async function formula(page:Page,latex:string) {
 await press(page,'clear')
 await mainField(page).evaluate((el,value)=>{const f=el as MathfieldElement;f.value=value;f.dispatchEvent(new InputEvent('input',{bubbles:true}))},latex)
}
function filled(template:string,values:string[]) {return values.reduce((s,v)=>s.replace('#?',v),template)}
async function value(page:Page) {const raw=(await answer(page).getAttribute('data-value'))??'';const parts=raw.split('/');return parts.length===2?Number(parts[0])/Number(parts[1]):Number(raw)}

test('new visitors enter the black device; switching keeps the formula, result, memory and history',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await expect(page.locator('[data-calculator-interface]')).toHaveAttribute('data-calculator-interface','device')
 await expect(page.locator('#workspace')).toHaveCount(0)
 await expect(page.locator('.app-toolbar')).toHaveCount(0)
 await expect(page.locator('.calculator-keypad button')).toHaveCount(50)
 await formula(page,'0.1+0.2');await expect(answer(page)).toBeEmpty();await press(page,'equals')
 await expect(answer(page)).toHaveAttribute('data-value','3/10')
 await press(page,'memory')
 const latex=await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())
 await page.getByTestId('calculator-switch').tap()
 await expect(page.locator('[data-calculator-interface]')).toHaveAttribute('data-calculator-interface','workspace')
 await expect(page.locator('.calculator-body math-field')).toBeVisible()
 expect(await page.locator('.calculator-body math-field').evaluate(el=>(el as MathfieldElement).getValue())).toBe(latex)
 await expect(page.locator('.calculator-indicators span').filter({hasText:/^M$/})).toHaveClass('indicator-on')
 await page.getByTestId('calculator-switch').tap();await expect(mainField(page)).toBeVisible()
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toBe(latex)
 await press(page,'+','1','equals');expect(await value(page)).toBeCloseTo(1.3,12)
 await page.locator('.replay-up').tap();expect(await value(page)).toBeCloseTo(0.3,12)
})

test('integral is an editable LCD expression, not a workspace or settings panel',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await press(page,'integral')
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toContain('\\int')
 await expect(page.locator('#workspace,dialog[open]')).toHaveCount(0)
 await expect(page.getByText('لغة التطبيق',{exact:true})).toHaveCount(0)
 await expect(page.getByRole('button',{name:'احسب',exact:true})).toHaveCount(0)
 await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.integrate,['0','1','x^2']))
 const realLatex=await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())
 expect(realLatex).toContain('\\int')
 await press(page,'equals');await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(1/3,12)
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toBe(realLatex)
})

test('derivative and Sigma templates execute directly from the original SHIFT keys',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await press(page,'shift','integral')
 await expect(page.locator('#workspace,dialog[open]')).toHaveCount(0)
 await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.derivative,['x^3','2']))
 await press(page,'equals');await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(12,12)
 await press(page,'clear','shift','logbase')
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toContain('\\sum')
 await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.sum,['1','3','x^2']))
 await press(page,'equals');await expect.poll(()=>value(page),{timeout:20000}).toBe(14)
})

test('MODE and SETUP use the LCD and numbered calculator keys',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await press(page,'mode');await expect(page.locator('.device-lcd-screen')).toContainText('COMP')
 await expect(page.locator('dialog[open]')).toHaveCount(0)
 await press(page,'1');await expect(mainField(page)).toBeVisible()
 await press(page,'shift','mode');await expect(page.locator('.device-lcd-screen')).toContainText(/rad/i)
 await press(page,'4');await expect(page.getByLabel('مؤشرات الحاسبة')).toContainText('RAD')
 await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.integrate,['0','\\pi/2','\\cos(x)']))
 await press(page,'equals');await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(1,11)
})

test('CALC prompts stay in the LCD and accept values using the device keypad',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await formula(page,'2X+1');await press(page,'calc')
 await expect(page.locator('.device-lcd-screen')).toContainText('X')
 await expect(page.locator('dialog[open],#workspace')).toHaveCount(0)
 await press(page,'5','equals')
 await expect.poll(()=>value(page)).toBe(11)
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toBe('2X+1')
})

test('device keeps its physical layout and every original key inside small and large viewports',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 for(const [width,height] of [[280,653],[320,568],[390,844],[1280,900],[844,390]]) {
  await page.setViewportSize({width:width!,height:height!})
  const geometry=await page.evaluate(()=>({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight,keys:[...document.querySelectorAll('.device-shell .calculator-keypad button')].map(el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}})}))
  expect(geometry.sw,`${width}x${height} horizontal`).toBeLessThanOrEqual(width!)
  expect(geometry.sh,`${width}x${height} vertical`).toBeLessThanOrEqual(height!+1)
  expect(geometry.keys).toHaveLength(50)
  for(const key of geometry.keys){expect(key.left).toBeGreaterThanOrEqual(0);expect(key.right).toBeLessThanOrEqual(width!+1);expect(key.top).toBeGreaterThanOrEqual(0);expect(key.bottom).toBeLessThanOrEqual(height!+1);expect(key.height).toBeGreaterThan(8)}
 }
})

test('the default device and its integrated calculus work after an offline production restart',async({page,context},testInfo)=>{
 test.skip(!testInfo.config.metadata.production,'Production service worker is generated during build')
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await page.evaluate(async()=>{await navigator.serviceWorker.ready;if(!navigator.serviceWorker.controller)await new Promise<void>(resolve=>navigator.serviceWorker.addEventListener('controllerchange',()=>resolve(),{once:true}))})
 await context.setOffline(true)
 try {
  await page.reload();await expect(mainField(page)).toBeVisible()
  await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.integrate,['0','1','x^2']))
  await press(page,'equals');await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(1/3,12)
 } finally {await context.setOffline(false)}
})

async function step(page:Page,...keys:string[]) {
 await expect(page.locator('.device-lcd-screen math-field')).toBeVisible()
 await press(page,...keys,'equals')
}
async function mode(page:Page,key:string) {await press(page,'mode',key)}

test('AC clears an integral result in one press and leaves memory intact',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.integrate,['0','1','x^2']))
 await press(page,'equals');await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(1/3,12)
 await press(page,'clear');await expect(answer(page)).toHaveAttribute('data-value','0')
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toBe('')
 await expect(page.locator('.device-lcd-screen')).toHaveCount(0)
})

test('STAT accepts mathematical expressions and cycles statistical results in the LCD',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await mode(page,'3');await expect(page.locator('.device-lcd-screen')).toContainText('1-VAR')
 await press(page,'1');await step(page,'3')
 await step(page,'1');await step(page,'sqrt','4');await step(page,'3')
 await expect(page.locator('.device-results output')).toHaveText('n: 3',{timeout:15000})
 await page.locator('.replay-down').tap();await expect(page.locator('.device-results output')).toContainText('2')
 await expect(page.locator('#workspace,dialog[open],.app-toolbar')).toHaveCount(0)
})

test('MATRIX determinant and polynomial EQN use sequential on-screen inputs',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await mode(page,'6');await press(page,'1');await step(page,'2')
 await step(page,'4');await step(page,'1');await step(page,'2');await step(page,'3')
 await expect.poll(()=>value(page),{timeout:15000}).toBe(10)
 await mode(page,'5');await press(page,'1');await step(page,'2')
 await step(page,'1');await step(page,'negative','3');await step(page,'2')
 await expect(page.locator('.device-results output')).toContainText('1',{timeout:15000})
 await page.locator('.replay-down').tap();await expect(page.locator('.device-results output')).toContainText('2')
 await expect(page.locator('#workspace,dialog[open]')).toHaveCount(0)
})

test('BASE-N hexadecimal letters are available from ALPHA and bitwise keys stay in the LCD',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await mode(page,'4');await press(page,'clear','inverse')
 await press(page,'equals','1')
 await expect(page.locator('.device-lcd-screen math-field')).toBeVisible()
 await press(page,'alpha','tan','equals')
 await expect(page.locator('.device-results output')).toHaveText('DEC: 15',{timeout:15000})
 await press(page,'clear','hyp');await step(page,'0')
 await expect(page.locator('.device-results output')).toHaveText('DEC: -1',{timeout:15000})
 await expect(page.locator('#workspace,dialog[open]')).toHaveCount(0)
})

test('SOLVE and CMPLX work without tool panels, including the silver alternative',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await formula(page,'x^2-2');await press(page,'shift','calc')
 await step(page,'0');await step(page,'2')
 await expect.poll(()=>value(page),{timeout:15000}).toBeCloseTo(Math.SQRT2,10)
 await page.getByTestId('calculator-switch').tap()
 await mode(page,'2');await formula(page,'\\left(1+2i\\right)\\left(3-4i\\right)')
 await press(page,'equals');await expect(page.locator('.device-results output')).toContainText('11',{timeout:15000})
 await expect(page.locator('#workspace,dialog[open],.app-toolbar')).toHaveCount(0)
})

test('CALC delegates inline calculus and variable substitutions to the worker without losing variables',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await formula(page,filled(DEVICE_CALCULUS_TEMPLATES.integrate,['0','1','x^2']))
 await press(page,'calc');await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(1/3,12)
 await formula(page,'A'+filled(DEVICE_CALCULUS_TEMPLATES.integrate,['0','1','x^2']))
 await press(page,'calc');await step(page,'3')
 await expect.poll(()=>value(page),{timeout:20000}).toBeCloseTo(1,12)
 await formula(page,'A');await press(page,'equals');await expect.poll(()=>value(page)).toBe(3)
})

test('physical keyboard cannot alter the hidden editor and expressions remain usable in CALC prompts',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await formula(page,'123');await press(page,'mode')
 await page.keyboard.type('x+()');expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toBe('123')
 await press(page,'1');await formula(page,'2X+1');await press(page,'calc')
 await expect(page.locator('.device-lcd-screen math-field')).toBeVisible()
 await page.keyboard.type('2+3');await page.keyboard.press('Enter')
 await expect.poll(()=>value(page)).toBe(11)
 expect(await mainField(page).evaluate(el=>(el as MathfieldElement).getValue())).toBe('2X+1')
})

test('correcting invalid STAT input removes the notice before showing the recovered result',async({page})=>{
 await page.goto('/');await expect(mainField(page)).toBeVisible()
 await mode(page,'3');await press(page,'1');await step(page,'0')
 await expect(page.locator('.device-notice')).toBeVisible()
 await expect(page.locator('.device-lcd-screen math-field')).toBeVisible()
 await press(page,'delete','3','equals')
 await step(page,'1');await step(page,'2');await step(page,'3')
 await expect(page.locator('.device-results output')).toHaveText('n: 3',{timeout:15000})
 await expect(page.locator('.device-notice')).toHaveCount(0)
})
