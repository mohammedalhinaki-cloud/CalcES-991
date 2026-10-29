import { localize } from '../i18n/locale'
import {recordSuccessfulCalculation} from '../engagement/rating'
import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { calculatorReducer, initialState } from './calculatorReducer'
import type { CalculatorState } from './calculatorReducer'
import { useAdvancedCalculation } from '../hooks/useAdvancedCalculation'
import { appendHistory } from './history'
import type { HistoryEntry } from './history'
import type { AdvancedRequest } from '../engine/advancedTypes'
import { previewCalculation } from '../editor/previewCalculation'
import { latexToExpression } from '../editor/latexToExpression'
import type { CalculationPreview } from '../editor/previewCalculation'
import { emptyVariables, evaluateScientific } from '../engine/evaluate'
import type { VariableName, Variables } from '../engine/evaluate'
import { formatScientific } from '../engine/formatResult'
import { math } from '../engine/mathInstance'
import { containsInlineCalculus } from '../engine/inlineCalculus'
import type { CalculatorMode } from './types'
import type { KeyBinding } from '../components/keypad/keyDefinitions'

export interface EditorHandle {
  insert:(latex:string)=>void; move:(direction:'Left'|'Right'|'Up'|'Down')=>void
  deleteBackward:()=>void; clear:()=>void; focus:()=>void; replace?:(latex:string)=>void
}
export type ReplayDirection='Up'|'Down'

const variableNames=Object.keys(emptyVariables) as VariableName[]
/** Return only calculator variables actually used by the current MathLive expression. */
export function expressionVariables(latex:string):VariableName[]{
  try{
    const found=new Set<VariableName>()
    math.parse(latexToExpression(latex)).traverse(node=>{
      if(math.isSymbolNode(node)&&variableNames.includes(node.name as VariableName))found.add(node.name as VariableName)
    })
    return variableNames.filter(name=>found.has(name))
  }catch{return []}
}
function valueLatex(value:string):string {
  const [mantissa,exponent]=value.split('e')
  return exponent?`${mantissa}\\times10^{${exponent.replace('+','')}}`:value
}
function controllerError(error:unknown):string {return error instanceof Error?error.message:'خطأ رياضي'}

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
  const deviceDefaultsInitialized=useRef(false)
  // MathLive is uncontrolled and can remount when the hardware LCD draws a
  // prompt. Preserve its exact current expression for a silent restoration.
  const currentState=useRef(state)
  currentState.current=state
  const [history,setHistory]=useState<HistoryEntry[]>([])
  const [recalled,setRecalled]=useState<HistoryEntry|null>(null)
  const [substitutionVariables,setSubstitutionVariables]=useState<VariableName[]|null>(null)
  const sequence=useRef(0)
  const pendingHistory=useRef<HistoryEntry|null>(null)
  const recordedResult=useRef<unknown>(null)
  const replayCursor=useRef<number|null>(null)
  const replayAnchor=useRef<string|null>(null)
  const record=useCallback((entry:HistoryEntry)=>{
    setHistory(previous=>appendHistory(previous,entry))
    recordSuccessfulCalculation()
  },[])
  const runAdvanced=useCallback((request:AdvancedRequest)=>{
    replayCursor.current=null
    const snapshot=structuredClone(state)
    if(request.kind==='scientific'&&request.variables)snapshot.variables={...snapshot.variables,...request.variables}
    pendingHistory.current={id:String(++sequence.current),snapshot,tool,title:'',value:null,request:structuredClone(request)}
    dispatch({type:'NOTICE',notice:''})
    advanced.run(request)
  },[advanced.run,state,tool])
  useEffect(()=>advanced.cancel(),[state.angle,state.variables,state.base,advanced.cancel])
  useEffect(()=>{
    if(advanced.state.status!=='success'||advanced.state.recalled||recordedResult.current===advanced.state)return
    recordedResult.current=advanced.state
    const result=advanced.state.result
    if(pendingHistory.current){
      const entry={...pendingHistory.current,title:result.title,value:result.scalar??null,result}
      record(entry)
      replayAnchor.current=entry.id
      replayCursor.current=null
      if(entry.request?.kind==='scientific'&&entry.request.variables&&JSON.stringify(entry.snapshot.variables)!==JSON.stringify(state.variables)){
        dispatch({type:'SET_VARIABLES',variables:entry.snapshot.variables})
      }
    }
    if(result.scalar!==undefined)dispatch({type:'CALCULATE',value:result.scalar})
  },[advanced.state,record])
  // Run after settings invalidation, so a restored result cannot be cleared by it.
  useEffect(()=>{if(recalled?.result)advanced.restore(recalled.result)},[recalled,advanced.restore])
  const editor=useRef<EditorHandle|null>(null)
  const [ready,setReady]=useState(false)
  const registerEditor=useCallback((handle:EditorHandle|null)=>{
    editor.current=handle
    setReady(handle!==null)
    if(handle&&currentState.current.latex)handle.replace?.(currentState.current.latex)
  },[])
  const edit=useCallback((latex:string)=>{replayCursor.current=null;advanced.cancel();dispatch({type:'EDIT',latex})},[advanced.cancel])
  const options=useMemo(()=>({
    angle:state.angle,variables:state.variables,answer:state.answer,format:state.format,engineeringOffset:state.engineeringOffset,
    notation:state.notation,digits:state.digits,
  }),[state.angle,state.variables,state.answer,state.format,state.engineeringOffset,state.notation,state.digits])
  const result=useMemo<CalculationPreview>(()=>{
    // A COMP inline-calculus expression has no selected legacy tool, but it
    // still runs in the worker and must surface the same running/error state.
    if(advanced.state.status==='running')return {status:'incomplete',text:'جارٍ الحساب…'}
    if(advanced.state.status==='error')return {status:'error',text:advanced.state.error}
    if(state.mode!=='COMP'||tool!==null){
      if(advanced.state.status==='success'){
        const value=advanced.state.result
        return {status:'success',text:value.scalar!==undefined?formatScientific(math.bignumber(value.scalar),options):`${value.lines[0]?.label??''}: ${value.lines[0]?.value??''}`}
      }
      return {status:'empty',text:'أدخل البيانات ثم اضغط = أو احسب'}
    }
    if(!state.latex)return {status:'empty',text:'—'}
    if(state.committedValue!==null)return {status:'success',text:formatScientific(math.bignumber(state.committedValue),options)}
    const preview=previewCalculation(state.latex,options)
    // An unfinished formula is normal while editing. Explicit calculation still
    // uses evaluateScientific and reports the original diagnostic via NOTICE.
    return preview.status==='incomplete'?{...preview,text:''}:preview
  },[state.latex,state.mode,state.committedValue,options,tool,advanced.state])
  const beginEdit=useCallback(()=>{replayCursor.current=null;dataTarget.current=null;dispatch({type:'EDITOR_INTENT'})},[])
  const ensureDeviceDefaults=useCallback(()=>{
    if(deviceDefaultsInitialized.current)return
    deviceDefaultsInitialized.current=true
    // The physical 991ES-style display favors exact natural output for a
    // genuinely fresh session, while existing entered work is never restyled.
    if(!state.latex&&state.answer===null&&state.committedValue===null)dispatch({type:'FORMAT',format:'fraction'})
  },[state.answer,state.committedValue,state.latex])
  const restoreDeviceNaturalAfterClear=useCallback(()=>{
    // CLEAR deliberately retains the user's line/natural output choice. On
    // the physical natural LCD, however, a fresh entry starts in exact mode.
    if(deviceDefaultsInitialized.current&&state.displayMode==='natural')dispatch({type:'FORMAT',format:'fraction'})
  },[state.displayMode])
  const setMode=(mode:CalculatorMode)=>{replayCursor.current=null;setSubstitutionVariables(null);advanced.cancel();dataTarget.current=null;setTool(null);setWorkspaceOpen(mode!=='COMP');dispatch({type:'SET_MODE',mode})}
  const currentValue=()=>{
    if(advanced.state.status==='success'&&advanced.state.result.scalar!==undefined)return math.bignumber(advanced.state.result.scalar)
    if(state.mode!=='COMP'||tool!==null)throw new Error('احسب قيمة عددية أولًا')
    if(state.committedValue===null&&containsInlineCalculus(state.latex))throw new Error('اضغط = لحساب التعبير أولًا')
    return state.committedValue!==null?math.bignumber(state.committedValue):evaluateScientific(state.latex,options)
  }
  const insert=(latex:string,continueResult=true)=>{
    replayCursor.current=null
    if(dataTarget.current){dataTarget.current.insert(latex);return}
    if(['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:'اضغط = لاختيار عملية هذا الوضع'});return}
    advanced.cancel()
    if(state.committedValue!==null&&!state.editingCommitted){
      editor.current?.clear()
      if(continueResult&&/^(?:[+\-!^]|\\times|\\div|\\%|\\degree)/.test(latex))editor.current?.insert('\\mathrm{Ans}')
    }
    editor.current?.insert(latex)
  }
  const commit=useCallback((value:string,snapshotOverride:Partial<CalculatorState>={})=>{
    const snapshot:CalculatorState={
      ...state,...snapshotOverride,
      variables:{...state.variables,...(snapshotOverride.variables??{})},
    }
    const entry:HistoryEntry={id:String(++sequence.current),snapshot:structuredClone(snapshot),tool:null,title:formatScientific(math.bignumber(value),options),value}
    record(entry)
    replayAnchor.current=entry.id
    replayCursor.current=null
    dispatch({type:'CALCULATE',value})
  },[options,record,state])
  const restoreEntry=useCallback((entry:HistoryEntry)=>{
    advanced.cancel();dataTarget.current=null;setSubstitutionVariables(null)
    setTool(entry.tool)
    setWorkspaceOpen(entry.snapshot.mode!=='COMP'||entry.tool!==null)
    editor.current?.replace?.(entry.snapshot.latex)
    dispatch({type:'RESTORE',snapshot:entry.snapshot,value:entry.value})
    setRecalled({...entry,id:`${entry.id}-${++sequence.current}`})
  },[advanced.cancel,setTool])
  const recallHistory=useCallback((entry:HistoryEntry)=>{
    const index=history.findIndex(candidate=>candidate.id===entry.id)
    replayCursor.current=index>=0?index:null
    replayAnchor.current=entry.id
    restoreEntry(entry)
  },[history,restoreEntry])
  const replay=useCallback((direction:ReplayDirection):boolean=>{
    if(state.committedValue===null||history.length===0)return false
    const step=direction==='Up'?1:-1
    let index=replayCursor.current
    if(index===null){
      const anchorIndex=replayAnchor.current===null?-1:history.findIndex(entry=>entry.id===replayAnchor.current)
      if(anchorIndex<0)return false
      index=anchorIndex
    }
    const next=index+step
    if(next<0||next>=history.length)return false
    recallHistory(history[next]!)
    return true
  },[history,recallHistory,state.committedValue])
  const clearHistory=()=>{replayCursor.current=null;replayAnchor.current=null;setHistory([])}
  const closeSubstitution=useCallback(()=>setSubstitutionVariables(null),[])
  const calculateWithSubstitutions=useCallback((values:Partial<Variables>):string|null=>{
    if(!substitutionVariables?.length)return null
    try{
      const variables={...state.variables}
      for(const name of substitutionVariables){
        const source=values[name]?.trim()??''
        if(!source)throw new Error('أدخل قيمة رقمية صالحة')
        const value=math.bignumber(source)
        if(!value.isFinite())throw new Error('أدخل قيمة رقمية منتهية')
        variables[name]=value.toString()
      }
      if(containsInlineCalculus(state.latex)){
        runAdvanced({kind:'scientific',latex:state.latex,angle:state.angle,variables,answer:state.answer})
        setSubstitutionVariables(null)
        return null
      }
      const value=evaluateScientific(state.latex,{...options,variables}).toString()
      dispatch({type:'SET_VARIABLES',variables})
      commit(value,{variables})
      setSubstitutionVariables(null)
      return null
    }catch(error){
      const notice=controllerError(error)
      dispatch({type:'NOTICE',notice})
      return notice
    }
  },[commit,options,runAdvanced,state.angle,state.answer,state.latex,state.variables,substitutionVariables])
  const requestCalculation=()=>{
    const names=expressionVariables(state.latex)
    if(names.length){setSubstitutionVariables(names);return}
    if(containsInlineCalculus(state.latex)){
      runAdvanced({kind:'scientific',latex:state.latex,angle:state.angle,variables:state.variables,answer:state.answer})
      return
    }
    commit(evaluateScientific(state.latex,options).toString())
  }
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
        case 'advanced':replayCursor.current=null;advanced.cancel();dataTarget.current=null;setTool(command.tool);dispatch({type:'CONSUME_LAYER'});return
        case 'layer':dispatch({type:'TOGGLE_LAYER',layer:command.layer});return
        case 'menu':dispatch({type:'OPEN_MENU',menu:command.menu});return
        case 'off':advanced.cancel();setSubstitutionVariables(null);dispatch({type:'POWER',off:true});return
        case 'base':advanced.cancel();dispatch({type:'SET_BASE',base:command.base});return
        case 'hyp':dispatch({type:'TOGGLE_HYP'});return
        case 'unavailable':dispatch({type:'NOTICE',notice:command.message});return
        case 'equals':
          if(state.mode!=='COMP'||tool!==null){submit.current?.();return}
          // Repeating = keeps the committed answer; do not record a new Ans context.
          if(state.committedValue!==null){dispatch({type:'CALCULATE',value:state.committedValue});return}
          commit(currentValue().toString());return
        case 'calculate':
          if(state.mode!=='COMP'||tool!==null){submit.current?.();return}
          requestCalculation();return
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
        case 'move':
          // Up/down replay only after a committed result. A focused workspace field
          // always owns movement, and left/right always preserve MathLive selection.
          if(!dataTarget.current&&(command.direction==='Up'||command.direction==='Down')&&replay(command.direction))return
          if(!dataTarget.current&&['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:'المس حقل بيانات أولًا'});return}
          ;(dataTarget.current??editor.current)?.move(command.direction);break
        case 'delete':if(!dataTarget.current&&['MATRIX','STAT','BASE-N'].includes(state.mode)){dispatch({type:'NOTICE',notice:'المس حقل بيانات أولًا'});return}(dataTarget.current??editor.current)?.deleteBackward();break
        case 'clear':advanced.cancel();setSubstitutionVariables(null);replayCursor.current=null;if(dataTarget.current){dataTarget.current.clear();dispatch({type:'NOTICE',notice:''});return}editor.current?.clear();dispatch({type:'CLEAR'});break
      }
      dispatch({type:'CONSUME_LAYER'})
    }catch(error){dispatch({type:'NOTICE',notice:controllerError(error)})}
  }
  return {
    workspaceOpen,setWorkspaceOpen,history,recalled,recallHistory,replay,clearHistory,advanced,tool,setTool,runAdvanced,registerDataTarget,registerSubmit,
    state,result,beginEdit,ensureDeviceDefaults,restoreDeviceNaturalAfterClear,dispatch,ready,registerEditor,edit,setMode,press,substitutionVariables,closeSubstitution,calculateWithSubstitutions,
  }
}
const CalculatorContext=createContext<ReturnType<typeof useCalculatorController>|null>(null)
export function CalculatorProvider({children}:{children:ReactNode}){
  const controller=useCalculatorController()
  return <CalculatorContext.Provider value={controller}>{localize(children)}</CalculatorContext.Provider>
}
export function useCalculator(){const value=useContext(CalculatorContext);if(!value)throw new Error('CalculatorProvider is required');return value}
