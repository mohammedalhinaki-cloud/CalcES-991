import { test as base, expect } from '@playwright/test'

// Every default page is checked, including errors emitted before the first click.
export const test=base.extend<{runtimeChecks:void;languageOnboarding:boolean;calculatorInterface:'device'|'workspace'}>({
 languageOnboarding:[false,{option:true}],
 calculatorInterface:['device',{option:true}],
 runtimeChecks:[async({page,languageOnboarding,calculatorInterface},use,testInfo)=>{
  // Keep unrelated calculator acceptance flows independent of the engagement prompt.
  await page.addInitScript(({onboarding,variant})=>{localStorage.setItem('calces_interface',variant);localStorage.setItem('rate_done','1');if(!onboarding){Object.defineProperty(navigator,'languages',{configurable:true,value:['ar-SA']});if(!localStorage.getItem('calces_language'))localStorage.setItem('calces_language','ar')}},{onboarding:languageOnboarding,variant:calculatorInterface})
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
