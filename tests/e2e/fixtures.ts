import { test as base, expect } from '@playwright/test'

// Every default page is checked, including errors emitted before the first click.
export const test=base.extend<{runtimeChecks:void;languageOnboarding:boolean}>({
 languageOnboarding:[false,{option:true}],
 runtimeChecks:[async({page,languageOnboarding},use,testInfo)=>{
  // Keep unrelated calculator acceptance flows independent of the engagement prompt.
  await page.addInitScript(onboarding=>{localStorage.setItem('rate_done','1');if(!onboarding){Object.defineProperty(navigator,'languages',{configurable:true,value:['ar-SA']});if(!localStorage.getItem('calces_language'))localStorage.setItem('calces_language','ar')}},languageOnboarding)
  const failures:string[]=[]
  const pageError=(error:Error)=>failures.push(`Runtime: ${error.message}`)
  const consoleMessage=(message:import('@playwright/test').ConsoleMessage)=>{
   if(message.type()==='error'||message.type()==='warning')failures.push(`Console: ${message.text()}`)
  }
  const response=(result:import('@playwright/test').Response)=>{if(result.status()>=400)failures.push(`HTTP ${result.status()}: ${result.url()}`)}
  const requestFailed=(request:import('@playwright/test').Request)=>{
   const reason=request.failure()?.errorText??''
   if(!reason.includes('ERR_ABORTED'))failures.push(`Resource: ${request.url()} ${reason}`)
  }
  page.on('pageerror',pageError);page.on('console',consoleMessage);page.on('response',response);page.on('requestfailed',requestFailed)
  if(testInfo.config.metadata.production){
   await page.route('**/*',route=>{
    const url=new URL(route.request().url())
    if(['http:','https:'].includes(url.protocol)&&url.origin!=='http://127.0.0.1:5174'){
     failures.push(`External dependency: ${url.origin}`);return route.abort()
    }
    return route.continue()
   })
  }
  await use()
  page.off('pageerror',pageError);page.off('console',consoleMessage);page.off('response',response);page.off('requestfailed',requestFailed)
  expect(failures,'No runtime warnings, failed resources, or external production dependencies').toEqual([])
 },{auto:true}],
})
export { expect }

type Page=import('@playwright/test').Page
/** App settings (history, constants, language, share, install, about) live in the header corner menu. */
export async function openAppMenu(page:Page){
 const menu=page.locator('#app-menu')
 if(!await menu.evaluate(el=>(el as HTMLDialogElement).open).catch(()=>false))await page.locator('.app-menu-button').click()
 await expect(menu).toBeVisible()
 return menu
}
/** The history count is exposed on the menu row's accessible name even while the menu is closed. */
export async function expectHistory(page:Page,count:number,label='السجل'){
 await expect(page.locator(`#app-menu button[aria-label^="${label} ("]`)).toHaveAttribute('aria-label',`${label} (${count})`)
}
