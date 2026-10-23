import type { CalculatorState } from './calculatorReducer'
import type { AdvancedRequest, AdvancedResult } from '../engine/advancedTypes'

// Keep the inputs to Ans and variables, not only the rounded display string.
export interface HistoryEntry {
  id:string
  snapshot:CalculatorState
  tool:string|null
  title:string
  value:string|null
  request?:AdvancedRequest
  result?:AdvancedResult
}
export const HISTORY_LIMIT=50
export function appendHistory(entries:HistoryEntry[],entry:HistoryEntry):HistoryEntry[]{
  const previous=entries[0]
  if(previous&&JSON.stringify({...previous,id:''})===JSON.stringify({...entry,id:''}))return entries
  return [structuredClone(entry),...entries].slice(0,HISTORY_LIMIT)
}
