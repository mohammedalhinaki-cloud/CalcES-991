import { localize } from '../i18n/locale'
import {recordSuccessfulCalculation} from '../engagement/rating'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { calculatorReducer, initialState } from './calculatorReducer'
import { useAdvancedCalculation } from '../hooks/useAdvancedCalculation'
import { appendHistory } from './history'
import type { HistoryEntry } from './history'
import type { AdvancedRequest } from '../engine/advancedTypes'
import { previewCalculation } from '../editor/previewCalculation'
import type { CalculationPreview } from '../editor/previewCalculation'
import { evaluateScientific } from '../engine/evaluate'
import type { VariableName } from '../engine/evaluate'
import { formatScientific } from '../engine/formatResult'
import { math } from '../engine/mathInstance'
import {isLinearCalculus} from '../editor/linearCalculus'
import type {LinearCalculusKind} from '../editor/linearCalculus'
import type { CalculatorMode } from './types'
import type { KeyBinding } from '../components/keypad/keyDefinitions'
export interface EditorHandle {
  insert:(latex:string)=>void; move:(direction:'Left'|'Right'|'Up'|'Down')=>void
  deleteBackward:()=>void; clear:()=>void; focus:()=>void; replace?:(latex:string)=>void
}
function valueLatex(value:string):string {
  const [mantissa,exponent]=value.split('e')
  return exponent?`${mantissa}\\times10^{${exponent.replace('+','')}}`:value
}
function useCalculatorController(){
  const advanced=useAdvancedCalculation()
  const [workspaceOpen,setWorkspaceOpen]=useState(false)
  const [tool,updateTool]=useState<string|null>(null)
  const setTool=useCallback((value:string|null)=>{updateTool(value);if(value!==null)setWorkspaceOpen(true)},[])
  const dataTarget=useRef<EditorHandle|null>(null)
  const submit=useRef<(()=>void)|null>(null)
  const registerDataTarget=useCallback((handle:EditorHandle)=>{dataTarget.current=handle;return ()=>{if(dataTarget.current===handle)dataTarget.current=null}},[])
  const registerSubmit=useCallback((handler:()=>void)=>{submit.current=handler;return ()=>{if(submit.current===handler)submit.current=null}},[])
  const [state,dispatch]=useReducer(calculatorReducer,initialState)
  const linearScreen=isLinearCalculus(state.latex)&&(state.mode==='COMP'||state.mode==='EQUATION'&&tool!=='linear'&&tool!=='polynomial')
  const [history,setHistory]=useState<HistoryEntry[]>([])
  const [recalled,setRecalled]=useState<HistoryEntry|null>(null)
  const sequence=useRef(0)
  const pendingHistory=useRef<HistoryEntry|null>(null)
  const recordedResult=useRef<unknown>(null)
  const record=useCallback((entry:HistoryEntry)=>{
    setHistory(previous=>appendHistory(previous,entry))
    recordSuccessfulCalculation()
  },[])
  const runAdvanced=useCallback((request:AdvancedRequest)=>{
    pendingHistory.current={id:String(++sequence.current),snapshot:structuredClone(state),tool,title:'',value:null,request:structuredClone(request)}
    advanced.run(request)
  },[advanced.run,state,tool])
  useEffect(()=>advanced.cancel(),[state.angle,state.variables,state.base,advanced.cancel])
  useEffect(()=>{
    if(advanced.state.status!=='success'||advanced.state.recalled||recordedResult.current===advanced.state)return
    recordedResult.current=advanced.state
    const result=advanced.state.result
    if(pendingHistory.current)record({...pendingHistory.current,title:result.title,value:result.scalar??null,result})
    if(result.scalar!==undefined)dispatch({type:'CALCULATE',value:result.scalar})
  },[advanced.state,record])
  // Run after settings invalidation, so a restored result cannot be cleared by it.
  useEffect(()=>{if(recalled?.result)advanced.restore(recalled.result)},[recalled,advanced.restore])
  const editor=useRef<EditorHandle|null>(null)
  const [ready,setReady]=useState(false)
  const registerEditor=useCallback((handle:EditorHandle|null)=>{editor.current=handle;setReady(handle!==null)},[])
  const edit=useCallback((latex:string)=>{advanced.cancel();if(isLinearCalculus(latex)){setWorkspaceOpen(false);updateTool(null)}dispatch({type:'EDIT',latex})},[advanced.cancel])
  const options=useMemo(()=>({angle:state.angle,variables:state.variables,answer:state.answer,format:state.format,engineeringOffset:state.engineeringOffset}),[state.angle,state.variables,state.answer,state.format,state.engineeringOffset])
  const result=useMemo<CalculationPreview>(()=>{
    if(linearScreen||state.mode!=='COMP'||tool!==null){
      if(advanced.state.status==='running')return {status:'incomplete',text:'جارٍ الحساب…'}
      if(advanced.state.status==='error')return {status:'error',text:linearScreen?(advanced.state.error==='Syntax ERROR'?'Syntax ERROR':'Math ERROR'):advanced.state.error}
      if(advanced.state.status==='success'){
        const value=advanced.state.result
        return {status:'success',text:value.scalar!==undefined?formatScientific(math.bignumber(value.scalar),options):`${value.lines[0]?.label??''}: ${value.lines[0]?.value??''}`}
      }
      return {status:'empty',text:linearScreen?'':'أدخل البيانات ثم اضغط = أو احسب'}
    }
    if(!state.latex)return {status:'empty',text:'—'}
    if(state.committedValue!==null)return {status:'success',text:formatScientific(math.bignumber(state.committedValue),options)}
    const preview=previewCalculation(state.latex,options)
    // An unfinished formula is normal while editing. Explicit calculation still
    // uses evaluateScientific and reports the original diagnostic via NOTICE.
    return preview.status==='incomplete'?{...preview,text:''}:preview
  },[state.latex,state.mode,state.committedValue,options,tool,advanced.state,linearScreen])
  const beginEdit=useCallback(()=>{dataTarget.current=null;dispatch({type:'EDITOR_INTENT'})},[])
  const setMode=(mode:CalculatorMode)=>{advanced.cancel();dataTarget.current=null;setTool(null);setWorkspaceOpen(mode!=='COMP');dispatch({type:'SET_MODE',mode})}
  const currentValue=()=>{
    if(advanced.state.status==='success'&&advanced.state.result.scalar!==undefined)return math.bignumber(advanced.state.result.scalar)
    if(state.mode!=='COMP'||tool!==null)throw new Error('استخدم نتيجة مساحة العمل المتقدمة')
    return state.committedValue!==null?math.bignumber(state.committedValue):evaluateScientific(state.latex,options)
  }
  const insert=(latex:string,continueResult=true)=>{
    if(dataTarget.current){dataTarget.current.insert(latex);return}
    if(['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:'المس خلية أو حقل بيانات قبل استخدام الأرقام'});return}
    advanced.cancel()
    if(state.committedValue!==null&&!state.editingCommitted){
      editor.current?.clear()
      if(continueResult&&/^(?:[+\-!^]|\\times|\\div|\\%|\\degree)/.test(latex))editor.current?.insert('\\mathrm{Ans}')
    }
    editor.current?.insert(latex)
  }
  const startCalculus=(kind:LinearCalculusKind)=>{
    advanced.cancel();dataTarget.current=null;updateTool(null);setWorkspaceOpen(false)
    const func=state.latex.trim()&&!isLinearCalculus(state.latex)&&state.committedValue===null?state.latex:'#?'
    const name=kind==='integrate'?'\\int':kind==='derivative'?'\\operatorname{d/dx}':'\\operatorname{SOLVE}'
    editor.current?.clear()
    editor.current?.insert(`${name}\\left(${func}${kind==='derivative'?'':',#?,#?'}\\right)`)
    dispatch({type:'CONSUME_LAYER'})
  }
  const submitLinearCalculation=()=>{
    if(advanced.state.status==='running')return
    runAdvanced({kind:'linear-calculus',latex:state.latex,angle:state.angle})
  }
  const commit=(value:string)=>{
    record({id:String(++sequence.current),snapshot:structuredClone(state),tool:null,title:formatScientific(math.bignumber(value),options),value})
    dispatch({type:'CALCULATE',value})
  }
  const recallHistory=(entry:HistoryEntry)=>{
    advanced.cancel();dataTarget.current=null
    setTool(entry.tool)
    setWorkspaceOpen(entry.request?.kind==='linear-calculus'?false:entry.snapshot.mode!=='COMP'||entry.tool!==null)
    editor.current?.replace?.(entry.snapshot.latex)
    dispatch({type:'RESTORE',snapshot:entry.snapshot,value:entry.value})
    setRecalled({...entry,id:`${entry.id}-${++sequence.current}`})
  }
  const clearHistory=()=>setHistory([])
  const press=(binding:KeyBinding)=>{
    const command=binding.command
    if(command.kind==='on'){dispatch({type:'POWER',off:false});return}
    if(state.off)return
    try{
      if(state.pending&&command.kind==='insert'){
        const name=command.latex
        if(!/^[A-FXYM]$/.test(name)){dispatch({type:'NOTICE',notice:'اختر حرف متغير، أو AC للإلغاء'});return}
        if(state.pending==='store')dispatch({type:'SET_VARIABLE',name:name as VariableName,value:currentValue().toString()})
        else{dispatch({type:'PENDING',pending:null});insert(valueLatex(state.variables[name as VariableName]))}
        return
      }
      switch(command.kind){
        case 'advanced':
          if(['integrate','derivative','root'].includes(command.tool)){startCalculus(command.tool as LinearCalculusKind);return}
          advanced.cancel();dataTarget.current=null;setTool(command.tool);dispatch({type:'CONSUME_LAYER'});return
        case 'layer':dispatch({type:'TOGGLE_LAYER',layer:command.layer});return
        case 'menu':dispatch({type:'OPEN_MENU',menu:command.menu});return
        case 'off':advanced.cancel();dispatch({type:'POWER',off:true});return
        case 'base':advanced.cancel();dispatch({type:'SET_BASE',base:command.base});return
        case 'hyp':dispatch({type:'TOGGLE_HYP'});return
        case 'unavailable':dispatch({type:'NOTICE',notice:command.message});return
        case 'equals':
          if(linearScreen){if(advanced.state.status!=='success')submitLinearCalculation();return}
          if(state.mode!=='COMP'||tool!==null){submit.current?.();return}
          // Repeating = keeps the committed answer; do not record a new Ans context.
          if(state.committedValue!==null){dispatch({type:'CALCULATE',value:state.committedValue});return}
          commit(currentValue().toString());return
        case 'calculate':
          if(linearScreen){submitLinearCalculation();return}
          if(state.mode!=='COMP'||tool!==null){submit.current?.();return}
          commit(evaluateScientific(state.latex,options).toString());return
        case 'store':case 'recall':dispatch({type:'PENDING',pending:command.kind});return
        case 'memory':{
          const value=currentValue(), memory=math.bignumber(state.variables.M)
          dispatch({type:'SET_VARIABLE',name:'M',value:(command.subtract?math.subtract(memory,value):math.add(memory,value)).toString()});return
        }
        case 'format':{
          const format=(command.format==='fraction'||command.format==='dms')&&state.format===command.format?'decimal':command.format
          dispatch({type:'FORMAT',format,offset:format==='engineering'?(state.format==='engineering'?state.engineeringOffset+(command.delta??0):0):0});return
        }
        case 'answer':
          if(state.answer===null){dispatch({type:'NOTICE',notice:'احسب تعبيرًا بالزر = أولًا لحفظ Ans'});return}
          insert('\\mathrm{Ans}');break
        case 'insert':insert(command.latex,binding.label!=='(−)');break
        case 'move':if(!dataTarget.current&&['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:'المس حقل بيانات أولًا'});return}(dataTarget.current??editor.current)?.move(command.direction);break
        case 'delete':if(!dataTarget.current&&['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:'المس حقل بيانات أولًا'});return}(dataTarget.current??editor.current)?.deleteBackward();break
        case 'clear':advanced.cancel();if(dataTarget.current){dataTarget.current.clear();dispatch({type:'NOTICE',notice:''});return}if(['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:''});return}editor.current?.clear();dispatch({type:'CLEAR'});break
      }
      dispatch({type:'CONSUME_LAYER'})
    }catch(error){dispatch({type:'NOTICE',notice:error instanceof Error?error.message:'خطأ رياضي'})}
  }
  return {linearScreen,startCalculus,submitLinearCalculation,workspaceOpen,setWorkspaceOpen,history,recalled,recallHistory,clearHistory,advanced,tool,setTool,runAdvanced,registerDataTarget,registerSubmit,state,result,beginEdit,dispatch,ready,registerEditor,edit,setMode,press}
}
const CalculatorContext=createContext<ReturnType<typeof useCalculatorController>|null>(null)
export function CalculatorProvider({children}:{children:ReactNode}){
  const controller=useCalculatorController()
  return <CalculatorContext.Provider value={controller}>{localize(children)}</CalculatorContext.Provider>
}
export function useCalculator(){const value=useContext(CalculatorContext);if(!value)throw new Error('CalculatorProvider is required');return value}
