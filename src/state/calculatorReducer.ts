import type { AngleUnit, CalculatorMode, KeyLayer, NumericBase } from './types'
import { emptyVariables } from '../engine/evaluate'
import type { VariableName, Variables } from '../engine/evaluate'
import type { ResultFormat } from '../engine/formatResult'
export interface CalculatorState {
  mode:CalculatorMode; layer:KeyLayer; angle:AngleUnit; base:NumericBase
  menu:'mode'|'setup'|null; latex:string; answer:string|null; committedValue:string|null
  variables:Variables; pending:'store'|'recall'|null
  format:ResultFormat; engineeringOffset:number
  off:boolean; hyp:boolean; notice:string; editingCommitted:boolean
}
export const initialState:CalculatorState={
  mode:'COMP',layer:'NORMAL',angle:'DEG',base:10,menu:null,latex:'',answer:null,committedValue:null,
  variables:{...emptyVariables},pending:null,format:'decimal',engineeringOffset:0,off:false,hyp:false,notice:'',editingCommitted:false,
}
export type CalculatorAction=
  | {type:'RESTORE';snapshot:CalculatorState;value:string|null}
  | {type:'TOGGLE_LAYER';layer:'SHIFT'|'ALPHA'} | {type:'CONSUME_LAYER'}
  | {type:'SET_MODE';mode:CalculatorMode} | {type:'SET_ANGLE';angle:AngleUnit} | {type:'SET_BASE';base:NumericBase}
  | {type:'OPEN_MENU';menu:'mode'|'setup'} | {type:'CLOSE_MENU'}
  | {type:'EDITOR_INTENT'} | {type:'EDIT';latex:string} | {type:'CALCULATE';value:string}
  | {type:'SET_VARIABLE';name:VariableName;value:string}
  | {type:'PENDING';pending:'store'|'recall'|null}
  | {type:'FORMAT';format:ResultFormat;offset?:number}
  | {type:'NOTICE';notice:string} | {type:'TOGGLE_HYP'} | {type:'CLEAR'} | {type:'POWER';off:boolean}
// Exact values are serialized decimal strings; the reducer never runs arithmetic or edits MathLive.
export function calculatorReducer(state:CalculatorState,action:CalculatorAction):CalculatorState {
  if(state.off&&action.type!=='POWER')return state
  switch(action.type){
    case 'RESTORE':return {...action.snapshot,variables:{...action.snapshot.variables},committedValue:action.value,editingCommitted:true,menu:null,pending:null,layer:'NORMAL',hyp:false,notice:'تم استدعاء الحساب؛ يمكنك تحريره أو حسابه مجددًا',off:false}
    case 'TOGGLE_LAYER':return {...state,layer:state.layer===action.layer?'NORMAL':action.layer,notice:''}
    case 'CONSUME_LAYER':return {...state,layer:'NORMAL',hyp:false}
    case 'SET_MODE':return {...state,mode:action.mode,layer:'NORMAL',hyp:false,menu:null,pending:null,notice:'',committedValue:null}
    case 'SET_ANGLE':return {...state,angle:action.angle,layer:'NORMAL',menu:null}
    case 'SET_BASE':return {...state,base:action.base,layer:'NORMAL',notice:'BASE-N: أعداد موقعة 32 بت'}
    case 'OPEN_MENU':return {...state,menu:action.menu,layer:'NORMAL',pending:null,hyp:false}
    case 'CLOSE_MENU':return {...state,menu:null}
    case 'EDITOR_INTENT':return {...state,editingCommitted:true}
    case 'EDIT':return {...state,latex:action.latex,committedValue:null,notice:'',engineeringOffset:0,editingCommitted:false}
    case 'CALCULATE':return {...state,committedValue:action.value,answer:action.value,editingCommitted:false,layer:'NORMAL',hyp:false,notice:''}
    case 'SET_VARIABLE':return {...state,variables:{...state.variables,[action.name]:action.value},pending:null,layer:'NORMAL',notice:`${action.name} = ${action.value}`}
    case 'PENDING':return {...state,pending:action.pending,layer:'NORMAL',notice:action.pending==='store'?'STO: اختر متغيرًا أحمر':'RCL: اختر متغيرًا أحمر'}
    case 'FORMAT':return {...state,format:action.format,engineeringOffset:action.offset??0,layer:'NORMAL'}
    case 'NOTICE':return {...state,notice:action.notice,layer:'NORMAL',hyp:false}
    case 'TOGGLE_HYP':return {...state,hyp:!state.hyp,layer:'NORMAL'}
    case 'CLEAR':return {...state,latex:'',committedValue:null,pending:null,notice:'',layer:'NORMAL',hyp:false,format:'decimal',engineeringOffset:0}
    case 'POWER':return {...state,off:action.off,layer:'NORMAL',hyp:false,menu:null,pending:null}
  }
}
