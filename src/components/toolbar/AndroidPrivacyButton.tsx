import { useEffect, useRef, useState } from 'react'
import { showAdPrivacyOptions, useNativeAdsState } from '../../native/androidAds'
export default function AndroidPrivacyButton(){
 const [open,setOpen]=useState(false)
 const dialog=useRef<HTMLDialogElement>(null)
 const {configuration,privacyRequired,message}=useNativeAdsState()
 useEffect(()=>{if(open&&!dialog.current?.open)dialog.current?.showModal();if(!open&&dialog.current?.open)dialog.current.close()},[open])
 return <>
  <button type="button" className="toolbar-button" aria-label="الخصوصية والإعلانات" title="الخصوصية والإعلانات" onClick={()=>setOpen(true)}><svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></svg><span>الخصوصية</span></button>
  <dialog ref={dialog} onCancel={()=>setOpen(false)} className="history-dialog" aria-labelledby="android-privacy-title" dir="rtl">
   <h2 id="android-privacy-title" className="text-lg font-semibold">الخصوصية والإعلانات</h2>
   <div className="my-4 space-y-3 text-sm leading-7"><p>المعادلات والذاكرة وسجل الحسابات تعمل على جهازك، ولا نرسلها إلى خادم للحساب.</p><p>عند تفعيل إعلانات Google، تخضع بيانات الإعلان لسياسة الخصوصية وخيارات الموافقة المتاحة في منطقتك. لا توجد إعلانات كاملة الشاشة أو نوافذ إعلانية عند فتح الحاسبة.</p>
    {configuration?.privacyPolicyUrl?<a className="block text-purple-300 underline" href={configuration.privacyPolicyUrl} target="_blank" rel="noreferrer">سياسة الخصوصية</a>:<p>سياسة الخصوصية النهائية ستُضاف قبل نشر هذه النسخة في المتجر.</p>}
    {configuration?.supportEmail&&<a className="block text-purple-300" href={`mailto:${configuration.supportEmail}`}>تواصل مع الدعم</a>}
    {privacyRequired&&<button type="button" className="utility-button w-full" onClick={()=>void showAdPrivacyOptions()}>خيارات خصوصية الإعلانات</button>}
    {message&&<p role="status">{message}</p>}
    {configuration?.debug&&<p className="text-xs text-amber-200">نسخة اختبار: تستخدم معرّفات إعلانات Google التجريبية فقط.</p>}
   </div>
   <button type="button" className="utility-button w-full" onClick={()=>setOpen(false)}>إغلاق</button>
  </dialog>
 </>
}
