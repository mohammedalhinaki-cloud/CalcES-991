import { localize } from '../i18n/locale'
import RatingPrompt from './RatingPrompt'
import { useState } from 'react'
import AdvancedWorkspaces from './workspaces/AdvancedWorkspaces'
import Keypad from './keypad/Keypad'
import ModeMenu from './ModeMenu'
import HistoryPanel from './HistoryPanel'
import AppToolbar from './toolbar/AppToolbar'
import CalculatorDisplay from './display/CalculatorDisplay'
import { useCalculator } from '../state/CalculatorProvider'

export default function CalculatorShell() {
 const {state,workspaceOpen,setWorkspaceOpen}=useCalculator()
 const [historyOpen,setHistoryOpen]=useState(false)
 return <div className="calculator-layout">
  <article id="calculator" className="calculator-body" aria-labelledby="calculator-title">
   <header className="ad-reservation" aria-label={localize("مساحة محجوزة لإعلان مستقبلي")}><h1 id="calculator-title" className="sr-only">fx-991ES PLUS · Web</h1></header>
   <CalculatorDisplay/>
   <AppToolbar onHistory={()=>setHistoryOpen(true)}/>
   {/* Keep data fields mounted: hiding the panel must not reset their values. */}
   <aside id="workspace" hidden={!workspaceOpen||state.off} className="workspace-panel" aria-labelledby="workspace-title">
    <header className="flex items-center justify-between gap-2"><h2 id="workspace-title" className="font-semibold">{localize("مساحة العمل · ")}{localize(state.mode)}</h2><button type="button" className="utility-button" aria-label={localize("إغلاق مساحة العمل")} onClick={()=>setWorkspaceOpen(false)}>{localize("إخفاء ×")}</button></header>
    <p className="mt-2 text-xs leading-6 text-gray-300">{localize("أدخل البيانات ثم اضغط «احسب» أو =. يمكنك إخفاء الأدوات للوصول إلى الأزرار؛ تبقى البيانات محفوظة.")}</p>
    <AdvancedWorkspaces/>
   </aside>
   <Keypad/>
  </article>
  <RatingPrompt/>
  <ModeMenu/>
  <HistoryPanel open={historyOpen} onClose={()=>setHistoryOpen(false)}/>
 </div>
}
