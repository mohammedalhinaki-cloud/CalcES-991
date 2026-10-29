import { expect, test } from './fixtures'
import type { Locator } from '@playwright/test'
import type { MathfieldElement } from 'mathlive'

// MathLive may replace glyph nodes while its local fonts finish loading.
// Resolve the hit coordinates atomically rather than retaining a stale element handle.
async function hitPoint(target: Locator) {
  let point: { x: number; y: number } | null = null
  await expect.poll(async () => {
    point = await target.evaluate(el => {
      const r=el.getBoundingClientRect()
      return r.width > 0 && r.height > 0 ? { x:r.x+r.width/2, y:r.y+r.height/2 } : null
    }).catch(() => null)
    return point !== null
  }).toBe(true)
  return point!
}

test('typing in the middle retains cursor and selection across result renders', async ({ page }) => {
  const diagnostics: string[] = []
  page.on('pageerror', error => diagnostics.push(error.message))
  page.on('console', message => { if (['error','warning'].includes(message.type())) diagnostics.push(message.text()) })
  await page.goto('/')
  const field = page.locator('math-field')
  await expect(field).toBeVisible()
  await field.click()
  await expect(field.locator('[part="keyboard-sink"]')).toBeFocused()
  await page.keyboard.type('1234')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.press('ArrowLeft')
  await page.keyboard.type('9')
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('12934')
  const before = await field.evaluate(el => (el as MathfieldElement).position)
  await page.keyboard.type('8')
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('129834')
  expect(await field.evaluate(el => (el as MathfieldElement).position)).toBe(before+1)
  await page.keyboard.press('Shift+ArrowLeft')
  expect(await field.evaluate(el => (el as MathfieldElement).selectionIsCollapsed)).toBe(false)
  await page.context().grantPermissions(['clipboard-read','clipboard-write'])
  const selection=await field.evaluate(el => (el as MathfieldElement).selection)
  await page.keyboard.press('Control+c')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('8')
  expect(await field.evaluate(el => (el as MathfieldElement).selection)).toEqual(selection)
  await page.keyboard.press('Backspace')
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('12934')
  await page.waitForLoadState('networkidle')
  expect(diagnostics).toEqual([])
})

test('mouse hits denominator and radical; drag selects content', async ({ page }) => {
  await page.goto('/')
  const field=page.locator('math-field')
  await expect(field).toBeVisible()
  await field.evaluate(el => { const f=el as MathfieldElement; f.value='\\frac{12}{34}+\\sqrt{56}'; f.focus() })
  // MathLive's rendered atoms expose the actual hit targets in its open shadow DOM.
  const denominator=field.locator('.ML__mfrac .ML__cmr').first()
  await expect(denominator).toBeVisible()
  const denPoint=await hitPoint(denominator)
  await page.mouse.click(denPoint.x,denPoint.y)
  await expect(field.locator('[part="keyboard-sink"]')).toBeFocused()
  const denominatorPosition=await field.evaluate(el => (el as MathfieldElement).position)
  await page.keyboard.type('9')
  expect(await field.evaluate(el => (el as MathfieldElement).getValue())).toMatch(/\\frac\{12\}\{[349]+\}/)
  expect(denominatorPosition).toBeGreaterThan(0)
  const radical=field.locator('.ML__sqrt-sign').locator('..').locator('.ML__cmr').first()
  await expect(radical).toBeVisible()
  const rootPoint=await hitPoint(radical)
  await page.mouse.click(rootPoint.x,rootPoint.y)
  await page.keyboard.type('7')
  expect(await field.evaluate(el => (el as MathfieldElement).getValue())).toMatch(/\\sqrt\{[567]+\}/)
  const bounds=await field.boundingBox()
  if(!bounds) throw new Error('Missing editor bounds')
  await page.mouse.move(bounds.x+8,bounds.y+bounds.height/2)
  await page.mouse.down()
  await page.mouse.move(bounds.x+bounds.width-40,bounds.y+bounds.height/2,{steps:20})
  await page.mouse.up()
  expect(await field.evaluate(el => (el as MathfieldElement).selectionIsCollapsed)).toBe(false)
})

test('touch can focus and edit fraction branches without warnings', async ({ browser }) => {
  const context=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}})
  await context.addInitScript(()=>{localStorage.setItem('calces_language','ar');localStorage.setItem('calces_interface','workspace')})
 const page=await context.newPage()
  const diagnostics:string[]=[]
  page.on('pageerror', error=>diagnostics.push(error.message))
  page.on('console', message=>{if(['warning','error'].includes(message.type())) diagnostics.push(message.text())})
  await page.goto('http://127.0.0.1:5174/')
  const field=page.locator('math-field')
  await expect(field).toBeVisible()
  await field.evaluate(el=>{(el as MathfieldElement).value='\\frac{12}{34}'})
  const digit=field.locator('.ML__mfrac .ML__cmr').first()
  await expect(digit).toBeVisible()
  const point=await hitPoint(digit)
  await page.touchscreen.tap(point.x,point.y)
  await expect(field.locator('[part="keyboard-sink"]')).toBeFocused()
  await page.locator('[data-key="9"]').tap()
  expect(await field.evaluate(el=>(el as MathfieldElement).getValue())).toMatch(/\\frac\{12\}\{[349]+\}/)
  await page.waitForLoadState('networkidle')
  expect(diagnostics).toEqual([])
  await context.close()
})


test('keypad fraction template keeps touch editing available and fits mobile widths', async ({ page }) => {
  await page.goto('/')
  const field=page.locator('math-field')
  await expect(field).toBeVisible()
  await page.locator('[data-key="fraction"]').click()
  await page.locator('[data-key="1"]').click()
  await page.locator('[aria-label="المؤشر ▼"]').click()
  await page.locator('[data-key="2"]').click()
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('0.5')
  expect(await field.evaluate(el=>(el as MathfieldElement).getValue())).toContain('\\frac')
  for(const width of [280,390,1280]) {
    await page.setViewportSize({width,height:900})
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
  }
})

for(const language of ['ar','en'] as const){
 test(`unfinished expressions stay quiet until equals in ${language}`,async({page})=>{
  await page.addInitScript(language=>localStorage.setItem('calces_language',language),language)
  await page.goto('/')
  const field=page.locator('math-field')
  await expect(field).toBeVisible()
  const message=language==='ar'?'أكمل التعبير الرياضي':'Complete the mathematical expression'
  const output=page.getByLabel(language==='ar'?'النتيجة':'Result',{exact:true})
  const formula=async(value:string)=>field.evaluate((el,value)=>{const f=el as MathfieldElement;f.value=value;f.dispatchEvent(new InputEvent('input',{bubbles:true}))},value)
  for(const incomplete of ['2+','\\frac{1}{}','\\sqrt{}']){
   await formula(incomplete)
   await expect(output).toHaveAttribute('data-status','incomplete')
   await expect(output).toBeEmpty()
   await expect(page.getByText(message,{exact:true})).toHaveCount(0)
   await page.locator('[data-key="equals"]').click()
   const notice=page.locator('.calculator-display > [role="status"]')
   await expect(notice).not.toBeEmpty()
   if(incomplete==='2+')await expect(notice).toHaveText(message)
   expect(await page.evaluate(()=>localStorage.getItem('calc_count'))).toBeNull()
   await formula('2+3')
   await expect(output).toHaveText('5')
   await expect(page.getByText(message,{exact:true})).toHaveCount(0)
  }
  await page.locator('[data-key="equals"]').click()
  await expect(output).toHaveText('5')
  expect(await page.evaluate(()=>localStorage.getItem('calc_count'))).toBe('1')
  // Keep genuine mathematical errors visible: only the unfinished-input hint is suppressed.
  await formula('1/0')
  await expect(output).toHaveAttribute('data-status','error')
  await expect(output).not.toBeEmpty()
  await page.locator('[data-key="clear"]').click()
  await expect(output).toHaveText('—')
  await expect(page.getByText(message,{exact:true})).toHaveCount(0)
 })
}
