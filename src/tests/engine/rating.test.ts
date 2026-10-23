import {beforeEach,describe,expect,it,vi} from 'vitest'
import {incrementCount,readPreferences,saveChoice,shouldPrompt,THREE_DAYS,recordSuccessfulCalculation,RATING_EVENT} from '../../engagement/rating'
beforeEach(()=>localStorage.clear())
describe('local-only rating preferences',()=>{
 it('prompts after five completed calculations, not four',()=>{
  for(let i=0;i<4;i++)incrementCount(localStorage)
  expect(shouldPrompt(readPreferences(localStorage))).toBe(false)
  incrementCount(localStorage)
  expect(shouldPrompt(readPreferences(localStorage))).toBe(true)
 })
 it('persists a three-day postponement across reloads',()=>{
  localStorage.setItem('calc_count','5');saveChoice(localStorage,'later',1000)
  expect(shouldPrompt(readPreferences(localStorage),1000+THREE_DAYS-1)).toBe(false)
  expect(shouldPrompt(readPreferences(localStorage),1000+THREE_DAYS)).toBe(true)
 })
 it.each(['rate','dismiss'] as const)('permanently stops prompting after %s',choice=>{
  localStorage.setItem('calc_count','5');saveChoice(localStorage,choice)
  expect(shouldPrompt(readPreferences(localStorage),Date.now()+THREE_DAYS*100)).toBe(false)
 })
 it('sanitizes corrupt persisted counts and dates',()=>{
  localStorage.setItem('calc_count','Infinity');localStorage.setItem('rate_remind_at','NaN')
  expect(readPreferences(localStorage)).toEqual({count:0,remindAt:0,done:false})
 })
 it('never fails a calculation if storage is blocked',()=>{
  const blocked={getItem:()=>{throw Error('blocked')},setItem:()=>{throw Error('blocked')}} as unknown as Storage
  expect(()=>incrementCount(blocked)).not.toThrow();expect(()=>saveChoice(blocked,'later')).not.toThrow()
 })
 it('records no expressions and emits a UI-only event once',()=>{
  const listener=vi.fn();window.addEventListener(RATING_EVENT,listener)
  recordSuccessfulCalculation()
  expect(listener).toHaveBeenCalledTimes(1);expect(localStorage.length).toBe(1);expect(localStorage.getItem('calc_count')).toBe('1')
  window.removeEventListener(RATING_EVENT,listener)
 })
})
