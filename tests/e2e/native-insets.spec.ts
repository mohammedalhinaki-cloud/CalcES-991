import {test,expect} from './fixtures'
import type {MathfieldElement} from 'mathlive'

// Browser geometry checks for the two existing Capacitor inset strategies.
// These are not Android emulator/device tests of the Activity or Window APIs.
const cases=[
 {name:'CSS gesture navigation',width:390,height:844,top:24,bottom:24,left:0,right:0},
 {name:'CSS three-button navigation',width:390,height:844,top:24,bottom:48,left:0,right:0},
 {name:'CSS landscape cutout',width:844,height:390,top:0,bottom:24,left:48,right:0},
 {name:'CSS resized IME viewport',width:390,height:560,top:24,bottom:0,left:0,right:0},
 // Old WebViews receive a native-padded, reduced viewport and zero CSS insets.
 {name:'native fallback portrait',width:390,height:772,top:0,bottom:0,left:0,right:0},
 {name:'native fallback landscape',width:796,height:366,top:0,bottom:0,left:0,right:0},
]
for(const scenario of cases){
 test(`Capacitor safe areas: ${scenario.name}`,async({page},testInfo)=>{
  await page.setViewportSize({width:scenario.width,height:scenario.height})
  await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
  await page.evaluate(s=>{
   const root=document.documentElement
   root.classList.add('native-android')
   for(const side of ['top','bottom','left','right'] as const)root.style.setProperty(`--safe-area-inset-${side}`,`${s[side]}px`)
  },scenario)
  await page.locator('math-field').evaluate(el=>{const f=el as MathfieldElement;f.value='\\int(X,0,1)+\\int(X,0,2)';f.dispatchEvent(new InputEvent('input',{bubbles:true}))})
  await page.locator('[data-key="equals"]').click()
  await expect(page.getByLabel('النتيجة',{exact:true})).toHaveText('2.5')
  const geometry=await page.evaluate(()=>{
   const style=getComputedStyle(document.querySelector('.app-shell')!)
   return {top:parseFloat(style.paddingTop),bottom:parseFloat(style.paddingBottom),left:parseFloat(style.paddingLeft),right:parseFloat(style.paddingRight),
    height:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,
    keys:[...document.querySelectorAll('.calculator-keypad button')].map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}})}
  })
  for(const side of ['top','bottom','left','right'] as const)expect(geometry[side]).toBe(Math.max(6,scenario[side]))
  expect(geometry.height).toBeLessThanOrEqual(scenario.height+1)
  expect(geometry.width).toBeLessThanOrEqual(scenario.width)
  expect(geometry.keys).toHaveLength(50)
  for(const rect of geometry.keys){
   expect(rect.top).toBeGreaterThanOrEqual(scenario.top)
   expect(rect.bottom).toBeLessThanOrEqual(scenario.height-scenario.bottom+1)
   expect(rect.left).toBeGreaterThanOrEqual(scenario.left)
   expect(rect.right).toBeLessThanOrEqual(scenario.width-scenario.right+1)
  }
  await page.screenshot({path:testInfo.outputPath('safe-area.png')})
 })
}
