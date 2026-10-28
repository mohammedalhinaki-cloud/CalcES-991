import {readFileSync} from 'node:fs'
import {describe,expect,it} from 'vitest'
const html=readFileSync('index.html','utf8')
describe('crawlable calculator entry page',()=>{
 it('keeps Android visitors and smartphone crawlers on the website',()=>{
  const page=new DOMParser().parseFromString(html,'text/html')
  expect(page.querySelector('script#android-store-redirect')).toBeNull()
  expect([...page.querySelectorAll('script:not([type="application/ld+json"])')].every(script=>script.hasAttribute('src'))).toBe(true)
  expect(page.querySelector('meta[http-equiv="refresh"]')).toBeNull()
 })
 it('declares the canonical page and factual structured application data',()=>{
  const page=new DOMParser().parseFromString(html,'text/html')
  expect(page.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://study-tools-calculator.pages.dev/')
  const schema=JSON.parse(page.querySelector('script[type="application/ld+json"]')!.textContent!)
  expect(schema['@graph'].find((node:{'@type':string})=>node['@type']==='WebApplication')).toMatchObject({name:'CalcES 991',isAccessibleForFree:true})
 })
})
