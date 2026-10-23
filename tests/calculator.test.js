import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateExpression, formatResult } from '../src/calculatorEngine.js'
import { calculatorReducer as reduce, initialState, resultText } from '../src/calculatorState.js'
const press = (keys, state = initialState) => keys.reduce((s, key) => reduce(s, { type: 'KEY', key }), state)

test('decimal precision, precedence, powers, roots, logarithms, factorial', () => {
  for (const [expression, expected] of [['0.1+0.2','0.3'],['2+3×4','14'],['2^3','8'],['sqrt(9)','3'],['cbrt(27)','3'],['log10(100)','2'],['log(e)','1'],['5!','120']]) {
    assert.equal(formatResult(evaluateExpression(expression)), expected, expression)
  }
})
test('angles and inverse functions use selected units', () => {
  assert.equal(formatResult(evaluateExpression('sin(30)')), '0.5')
  assert.equal(formatResult(evaluateExpression('asin(0.5)')), '30')
  assert.equal(formatResult(evaluateExpression('sin(pi/2)', {angle:'RAD'})), '1')
  assert.equal(formatResult(evaluateExpression('sin(100)', {angle:'GRA'})), '1')
})
test('errors reject non-finite results, invalid domains and nonarithmetic nodes', () => {
  for (const expression of ['1/0','sqrt(-1)','asin(2)','tan(90)','a=2','[1,2]','import(1)','sin(','2^10001']) assert.throws(() => evaluateExpression(expression), undefined, expression)
})
test('key sequence calculates and continues with previous answer', () => {
  let s = press(['2','+','3','×','4','='])
  assert.equal(resultText(s),'14')
  s=press(['+','1','='],s)
  assert.equal(resultText(s),'15')
  assert.equal(resultText(press(['7','='],s)),'7')
})
test('SHIFT inverse trig is one-shot and ALPHA reads stored variables', () => {
  let s=press(['SHIFT','sin','0','.','5',')','='])
  assert.equal(resultText(s),'30'); assert.equal(s.shift,false)
  s=press(['SHIFT','RCL','(−)'],s)
  assert.equal(formatResult(s.variables.A),'30')
  s=press(['AC','ALPHA','(−)','+','2','='],s)
  assert.equal(resultText(s),'32'); assert.equal(s.alpha,false)
})
test('cursor insertion and deletion edit the intended position', () => {
  let s=press(['1','3','◀','2'])
  assert.equal(s.expression,'123');assert.equal(s.cursor,2)
  s=press(['DEL','='],s);assert.equal(resultText(s),'13')
})
test('memory add/subtract and recall survive AC', () => {
  let s=press(['8','=','M+','AC','3','=','SHIFT','M+','AC','RCL','M+','='])
  assert.equal(resultText(s),'5')
})
test('fraction toggle, sexagesimal input/output, engineering format', () => {
  let s=press(['1','÷','2','=','S⇔D'])
  assert.equal(resultText(s),'1/2');assert.equal(resultText(press(['S⇔D'],s)),'0.5')
  s=press(['1','2','°′″','3','0','°′″','='])
  assert.equal(resultText(s),'12.5');assert.equal(resultText(press(['°′″'],s)),'12°30′0″')
  assert.ok(resultText(press(['ENG'],s)).includes('×10^'))
})
test('menu changes angles and power off/on preserves memory', () => {
  let s=press(['MODE','2']);assert.equal(s.angle,'RAD')
  s=press(['SHIFT','AC'],s);assert.equal(s.off,true)
  assert.equal(press(['1'],s).expression,'')
  assert.equal(press(['AC'],s).off,false)
})
test('invalid expressions surface errors and AC recovers', () => {
  let s=press(['1','÷','0','=']);assert.equal(s.error,'Math ERROR')
  assert.equal(resultText(press(['AC','2','='],s)),'2')
})
test('hyperbolic layer and inverse hyperbolic layer', () => {
  assert.equal(resultText(press(['hyp','cos','0',')','='])),'1')
  assert.equal(resultText(press(['hyp','SHIFT','sin','0',')','='])),'0')
})

test('random is supplied by the event, keeping reducer deterministic', () => {
  const shifted=press(['SHIFT'])
  const action={type:'KEY',key:'.',random:'0.123456'}
  assert.equal(reduce(shifted,action).expression,'0.123456')
  assert.deepEqual(reduce(shifted,action),reduce(shifted,action))
})
