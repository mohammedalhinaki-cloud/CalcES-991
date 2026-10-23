import { useEffect, useRef } from 'react'
import { useCalculator } from '../../state/CalculatorProvider'
import { useAppActions } from '../../hooks/useAppActions'
import Icon from './Icon'
import { isAndroidApp } from '../../native/platform'
import AndroidPrivacyButton from './AndroidPrivacyButton'
export default function AppToolbar({onHistory}:{onHistory:()=>void}){
 const {state,history,workspaceOpen,setWorkspaceOpen,dispatch}=useCalculator()
 const {share,install,installed,notice,help,setHelp,url}=useAppActions()
 const dialog=useRef<HTMLDialogElement>(null)
 useEffect(()=>{if(help&&!dialog.current?.open)dialog.current?.showModal();if(!help&&dialog.current?.open)dialog.current.close()},[help])
 return <>
  <nav className="app-toolbar" aria-label="أدوات الحاسبة" dir="ltr">
   <button type="button" className="toolbar-button workspace-toggle" aria-label="مساحة العمل" aria-expanded={workspaceOpen} aria-controls="workspace" disabled={state.off} onClick={()=>setWorkspaceOpen(!workspaceOpen)} title="مساحة العمل"><Icon name="workspace"/><span>الأدوات</span></button>
   <button type="button" className="toolbar-button" aria-label={`السجل (${history.length})`} disabled={state.off} onClick={onHistory} title="سجل الحسابات"><Icon name="history"/><span>السجل</span></button>
   <button type="button" className="toolbar-button angle-button" aria-label="إعداد وحدة الزوايا" disabled={state.off} onClick={()=>dispatch({type:'OPEN_MENU',menu:'setup'})} title="وحدة الزوايا"><b>{state.angle}</b><span>الزاوية</span></button>
   <button type="button" className="toolbar-button" aria-label="مشاركة الحاسبة" onClick={()=>void share()} title="مشاركة"><Icon name="share"/><span>مشاركة</span></button>
   {isAndroidApp()?<AndroidPrivacyButton/>:<button type="button" className="toolbar-button" aria-label={installed?'التطبيق مثبت':'تثبيت التطبيق'} onClick={()=>void install()} title={installed?'مثبت':'تثبيت'}><Icon name="install"/><span>{installed?'مثبت':'تثبيت'}</span></button>}
  </nav>
  {notice&&<p role="status" className="toolbar-notice" dir="rtl">{notice}</p>}
  <dialog ref={dialog} onCancel={()=>setHelp(null)} className="history-dialog" aria-labelledby="app-help-title" dir="rtl">
   <h2 id="app-help-title" className="mb-4 text-lg font-semibold">{help==='share'?'مشاركة الحاسبة':'تثبيت الحاسبة'}</h2>
   {help==='share'?<><p className="mb-3 leading-7">تعذرت المشاركة والنسخ التلقائي. حدد الرابط التالي وانسخه:</p><a className="block select-text break-all text-purple-300" dir="ltr" href={url}>{url}</a></>:<div className="space-y-3 text-sm leading-7"><p>إذا لم تظهر نافذة التثبيت تلقائيًا، استخدم قائمة المتصفح:</p><p><b>Android وChrome/Edge:</b> افتح القائمة ⋮ ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».</p><p><b>iPhone وiPad:</b> افتح الموقع في Safari، ثم اضغط مشاركة واختر «إضافة إلى الشاشة الرئيسية».</p><p><b>الحاسوب:</b> استخدم أيقونة التثبيت في شريط العنوان أو خيار التثبيت من قائمة المتصفح، إذا كان يدعمه.</p></div>}
   <button type="button" className="utility-button mt-5 w-full" onClick={()=>setHelp(null)}>إغلاق</button>
  </dialog>
 </>
}
