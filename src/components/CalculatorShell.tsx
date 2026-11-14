import { getLanguage, localize } from '../i18n/locale'
import RatingPrompt from './RatingPrompt'
import AdvancedWorkspaces from './workspaces/AdvancedWorkspaces'
import Keypad from './keypad/Keypad'
import ModeMenu from './ModeMenu'
import CalculatorDisplay from './display/CalculatorDisplay'
import { useCalculator } from '../state/CalculatorProvider'

/** Display + keypad only: app-level actions live in the header menu, not inside the calculator. */
export default function CalculatorShell() {
 const {state,workspaceOpen,setWorkspaceOpen}=useCalculator()
 return <div className="calculator-layout">
  <article id="calculator" className="calculator-body" aria-labelledby="calculator-title">
   <h1 id="calculator-title" className="sr-only">{getLanguage()==='en'?'CalcES 991 — Scientific Calculator':'CalcES 991 — حاسبة علمية'}</h1>
   <CalculatorDisplay/>
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
 </div>
}
