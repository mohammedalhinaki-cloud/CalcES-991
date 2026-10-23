import { expect, it } from 'vitest'
import { appendHistory, HISTORY_LIMIT } from '../../state/history'
import type { HistoryEntry } from '../../state/history'
import { calculatorReducer, initialState } from '../../state/calculatorReducer'
function entry(id:string):HistoryEntry{return {id,snapshot:structuredClone(initialState),tool:null,title:id,value:id}}
it('bounds history and isolates snapshots from later variable and matrix edits',()=>{
 const original=entry('1');original.request={kind:'matrix',operation:'det',a:[['2']],b:[['1']]}
 const saved=appendHistory([],original)
 original.snapshot.variables.A='99'
 if(original.request.kind==='matrix')original.request.a[0]![0]='99'
 expect(saved[0]!.snapshot.variables.A).toBe('0')
 expect(saved[0]!.request).toMatchObject({a:[['2']]})
 let history=saved
 for(let i=2;i<=60;i++)history=appendHistory(history,entry(String(i)))
 expect(history).toHaveLength(HISTORY_LIMIT)
 expect(history[0]!.id).toBe('60')
})
it('restores the original Ans context, variables and settings without changing the saved snapshot',()=>{
 const snapshot={...initialState,latex:'\\mathrm{Ans}+1',answer:'7',angle:'RAD' as const,variables:{...initialState.variables,A:'3'}}
 const restored=calculatorReducer({...initialState,answer:'100'}, {type:'RESTORE',snapshot,value:'8'})
 expect(restored.answer).toBe('7')
 expect(restored.committedValue).toBe('8')
 expect(restored.angle).toBe('RAD')
 expect(restored.editingCommitted).toBe(true)
 restored.variables.A='10'
 expect(snapshot.variables.A).toBe('3')
})
