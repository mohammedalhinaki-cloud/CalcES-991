import { localize, getDirection } from '../../i18n/locale'
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
  <nav className="app-toolbar" aria-label={localize("أدوات الحاسبة")} dir="ltr">
   <button type="button" className="toolbar-button workspace-toggle" aria-label={localize("مساحة العمل")} aria-expanded={workspaceOpen} aria-controls="workspace" disabled={state.off} onClick={()=>setWorkspaceOpen(!workspaceOpen)} title={localize("مساحة العمل")}><Icon name="workspace"/><span>{localize("الأدوات")}</span></button>
   <button type="button" className="toolbar-button" aria-label={localize(`السجل (${history.length})`)} disabled={state.off} onClick={onHistory} title={localize("سجل الحسابات")}><Icon name="history"/><span>{localize("السجل")}</span></button>
   <button type="button" className="toolbar-button angle-button" aria-label={localize("إعداد وحدة الزوايا")} disabled={state.off} onClick={()=>dispatch({type:'OPEN_MENU',menu:'setup'})} title={localize("وحدة الزوايا")}><b>{localize(state.angle)}</b><span>{localize("الزاوية")}</span></button>
   <button type="button" className="toolbar-button" aria-label={localize("مشاركة الحاسبة")} onClick={()=>void share()} title={localize("مشاركة")}><Icon name="share"/><span>{localize("مشاركة")}</span></button>
   {localize(isAndroidApp()?<AndroidPrivacyButton/>:<button type="button" className="toolbar-button" aria-label={localize(installed?'التطبيق مثبت':'تثبيت التطبيق')} onClick={()=>void install()} title={localize(installed?'مثبت':'تثبيت')}><Icon name="install"/><span>{localize(installed?'مثبت':'تثبيت')}</span></button>)}
  </nav>
  {localize(notice&&<p role="status" className="toolbar-notice" dir={getDirection()}>{localize(notice)}</p>)}
  <dialog ref={dialog} onCancel={()=>setHelp(null)} className="history-dialog" aria-labelledby="app-help-title" dir={getDirection()}>
   <h2 id="app-help-title" className="mb-4 text-lg font-semibold">{localize(help==='share'?'مشاركة الحاسبة':'تثبيت الحاسبة')}</h2>
   {localize(help==='share'?<><p className="mb-3 leading-7">{localize("تعذرت المشاركة والنسخ التلقائي. حدد الرابط التالي وانسخه:")}</p><a className="block select-text break-all text-purple-300" dir="ltr" href={url}>{localize(url)}</a></>:<div className="space-y-3 text-sm leading-7"><p>{localize("إذا لم تظهر نافذة التثبيت تلقائيًا، استخدم قائمة المتصفح:")}</p><p><b>{localize("Android وChrome/Edge:")}</b>{localize(" افتح القائمة ⋮ ثم «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».")}</p><p><b>{localize("iPhone وiPad:")}</b>{localize(" افتح الموقع في Safari، ثم اضغط مشاركة واختر «إضافة إلى الشاشة الرئيسية».")}</p><p><b>{localize("الحاسوب:")}</b>{localize(" استخدم أيقونة التثبيت في شريط العنوان أو خيار التثبيت من قائمة المتصفح، إذا كان يدعمه.")}</p></div>)}
   <button type="button" className="utility-button mt-5 w-full" onClick={()=>setHelp(null)}>{localize("إغلاق")}</button>
  </dialog>
 </>
}
