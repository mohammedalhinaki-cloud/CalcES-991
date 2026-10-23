import test from 'node:test'
import assert from 'node:assert/strict'
import katex from 'katex'
import { toNaturalLatex } from '../src/naturalDisplay.js'

test('fractions, powers and radicals produce valid natural mathematical markup', () => {
  for (const [expression, fragment] of [['1/2','\\frac'],['2^3','^'],['sqrt(9)','\\sqrt'],['(1/2)^2','\\frac'],['Ans+π','\\mathrm{Ans}']]) {
    const latex=toNaturalLatex(expression)
    assert.ok(latex.includes(fragment),`${expression}: ${latex}`)
    const html=katex.renderToString(latex,{throwOnError:true})
    assert.ok(html.includes('katex-mathml'))
    if(expression==='1/2') assert.ok(html.includes('mfrac'))
    if(expression==='2^3') assert.ok(html.includes('msupsub'))
  }
})
test('incomplete inputs preview placeholders without changing their source', () => {
  for (const expression of ['1/','sqrt(','2^','sin(30','(1+2','2+']) {
    const latex=toNaturalLatex(expression,{preview:true})
    assert.ok(latex,expression)
    assert.doesNotThrow(()=>katex.renderToString(latex,{throwOnError:true}))
  }
  assert.ok(toNaturalLatex('1/',{preview:true}).includes('\\square'))
  assert.equal(toNaturalLatex('1/'),null)
})
test('malformed and empty input fall back, DMS results retain units', () => {
  for(const input of ['',')','1//','x'.repeat(501)]) assert.equal(toNaturalLatex(input),null)
  const latex=toNaturalLatex('12°30′0″')
  assert.ok(latex.includes('\\circ'))
  assert.doesNotThrow(()=>katex.renderToString(latex,{throwOnError:true}))
})
