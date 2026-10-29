import { expect, test } from './fixtures'
test('native adaptive banner reservation fits portrait and landscape without overlapping any key',async({page})=>{
 await page.goto('/');await expect(page.locator('math-field')).toBeVisible()
 // Exercise native layout without loading an advertising SDK or making real ad requests.
 await page.evaluate(()=>document.documentElement.classList.add('native-android'))
 for(const [width,height] of [[320,568],[390,844],[844,390]]){
  await page.setViewportSize({width:width!,height:height!})
  for(const banner of [50,90]){
   await page.evaluate(value=>document.documentElement.style.setProperty('--native-banner-slot',`${value+12}px`),banner)
   const layout=await page.evaluate(()=>{
    const ad=document.querySelector('.ad-reservation')!.getBoundingClientRect()
    return {ad:{top:ad.top,bottom:ad.bottom,height:ad.height},keys:[...document.querySelectorAll('[aria-label="لوحة مفاتيح الحاسبة"] button')].map(el=>{const r=el.getBoundingClientRect();return {top:r.top,bottom:r.bottom,left:r.left,right:r.right}}),scrollHeight:document.documentElement.scrollHeight}
   })
   expect(layout.ad.height).toBeGreaterThanOrEqual(banner+12)
   expect(layout.scrollHeight).toBeLessThanOrEqual(height!+1)
   expect(layout.keys).toHaveLength(50)
   for(const key of layout.keys){expect(key.top).toBeGreaterThanOrEqual(layout.ad.bottom);expect(key.bottom).toBeLessThanOrEqual(height!);expect(key.left).toBeGreaterThanOrEqual(0);expect(key.right).toBeLessThanOrEqual(width!)}
  }
 }
})
