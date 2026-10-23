import { localize } from '../../i18n/locale'
import { useState } from 'react'
import { showAdPrivacyOptions, useNativeAdsState } from '../../native/androidAds'
import EngagementDialog from '../EngagementDialog'
import {saveChoice} from '../../engagement/rating'
import {openStore} from '../../engagement/openStore'
export default function AndroidPrivacyButton(){
 const [open,setOpen]=useState(false)
 const {configuration,privacyRequired,message}=useNativeAdsState()
 const rate=()=>{
  try{saveChoice(window.localStorage,'rate')}catch{/* A blocked preference store must not prevent opening Play. */}
  void openStore()
 }
 return <>
  <button type="button" className="toolbar-button" aria-label={localize("الخصوصية والإعلانات")} title={localize("عن التطبيق والخصوصية")} onClick={()=>setOpen(true)}><svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></svg><span>{localize("الخصوصية")}</span></button>
  <EngagementDialog open={open} onClose={()=>setOpen(false)} titleId="android-privacy-title">
   <h2 id="android-privacy-title">{localize("عن التطبيق والخصوصية 🛡️")}</h2>
   <p>{localize("تطبيق CalcES 991 (إصدار ")}{localize(configuration?.versionName??'1.0.0')})<br/>{localize("تطوير: Maaoun Studio")}</p>
   <section><h3>{localize("سياسة الخصوصية")}</h3><p>{localize("نحن نحترم خصوصيتك تماماً. تعمل وظائف الحاسبة أوفلاين (بدون إنترنت)، ولا نرسل معادلاتك أو نتائجك إلى خادم للحساب. لا نطلب الوصول إلى موقعك الجغرافي أو ملفاتك الخاصة.")}</p><p>{localize("نحفظ محلياً على جهازك اللغة المختارة وعدد العمليات وتفضيلات تذكير التقييم فقط. لا تُرسل هذه التفضيلات إلينا. عند تفعيل إعلانات Google، يحتاج الإعلان إلى الإنترنت وقد تعالج خدمات Google بيانات الإعلان وفق سياسة الخصوصية وخيارات الموافقة المتاحة في منطقتك. لا توجد إعلانات كاملة الشاشة.")}</p>
    {localize(configuration?.privacyPolicyUrl&&<a href={configuration.privacyPolicyUrl} target="_blank" rel="noreferrer">{localize("سياسة الخصوصية التفصيلية")}</a>)}
    {localize(privacyRequired&&<button type="button" className="utility-button" onClick={()=>void showAdPrivacyOptions()}>{localize("خيارات خصوصية الإعلانات")}</button>)}
   </section>
   <section><h3>{localize("الدعم الفني")}</h3><p>{localize("للدعم الفني والاستفسارات، يسعدنا تواصلك معنا عبر البريد:")}</p><a href="mailto:jy906675@gmail.com" dir="ltr">jy906675@gmail.com</a></section>
   <section><h3>{localize("شروط الاستخدام")}</h3><p>{localize("هذا التطبيق مقدم كأداة تعليمية وحسابية لمساعدتك في دراستك وأعمالك الحسابية.")}</p></section>
   {localize(message&&<p role="status">{localize(message)}</p>)}
   {localize(configuration?.debug&&<p>{localize("نسخة اختبار: تستخدم معرّفات إعلانات Google التجريبية فقط.")}</p>)}
   <div className="engagement-actions"><button type="button" className="utility-button rating-primary" onClick={rate}>{localize("هل أعجبك التطبيق؟ ادعمنا بالتقييم ⭐️")}</button><button type="button" className="utility-button" onClick={()=>setOpen(false)}>{localize("إغلاق")}</button></div>
  </EngagementDialog>
 </>
}
