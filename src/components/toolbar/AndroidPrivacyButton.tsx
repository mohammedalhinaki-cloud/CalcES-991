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
  <button type="button" className="toolbar-button" aria-label="الخصوصية والإعلانات" title="عن التطبيق والخصوصية" onClick={()=>setOpen(true)}><svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z"/><path d="m8 12 3 3 5-6"/></svg><span>الخصوصية</span></button>
  <EngagementDialog open={open} onClose={()=>setOpen(false)} titleId="android-privacy-title">
   <h2 id="android-privacy-title">عن التطبيق والخصوصية 🛡️</h2>
   <p>تطبيق CalcES 991 (إصدار {configuration?.versionName??'1.0.0'})<br/>تطوير: Maaoun Studio</p>
   <section><h3>سياسة الخصوصية</h3><p>نحن نحترم خصوصيتك تماماً. تعمل وظائف الحاسبة أوفلاين (بدون إنترنت)، ولا نرسل معادلاتك أو نتائجك إلى خادم للحساب. لا نطلب الوصول إلى موقعك الجغرافي أو ملفاتك الخاصة.</p><p>نحفظ محلياً على جهازك عدد العمليات وتفضيلات تذكير التقييم فقط. لا تُرسل هذه التفضيلات إلينا. عند تفعيل إعلانات Google، يحتاج الإعلان إلى الإنترنت وقد تعالج خدمات Google بيانات الإعلان وفق سياسة الخصوصية وخيارات الموافقة المتاحة في منطقتك. لا توجد إعلانات كاملة الشاشة.</p>
    {configuration?.privacyPolicyUrl&&<a href={configuration.privacyPolicyUrl} target="_blank" rel="noreferrer">سياسة الخصوصية التفصيلية</a>}
    {privacyRequired&&<button type="button" className="utility-button" onClick={()=>void showAdPrivacyOptions()}>خيارات خصوصية الإعلانات</button>}
   </section>
   <section><h3>الدعم الفني</h3><p>للدعم الفني والاستفسارات، يسعدنا تواصلك معنا عبر البريد:</p><a href="mailto:jy906675@gmail.com" dir="ltr">jy906675@gmail.com</a></section>
   <section><h3>شروط الاستخدام</h3><p>هذا التطبيق مقدم كأداة تعليمية وحسابية لمساعدتك في دراستك وأعمالك الحسابية.</p></section>
   {message&&<p role="status">{message}</p>}
   {configuration?.debug&&<p>نسخة اختبار: تستخدم معرّفات إعلانات Google التجريبية فقط.</p>}
   <div className="engagement-actions"><button type="button" className="utility-button rating-primary" onClick={rate}>هل أعجبك التطبيق؟ ادعمنا بالتقييم ⭐️</button><button type="button" className="utility-button" onClick={()=>setOpen(false)}>إغلاق</button></div>
  </EngagementDialog>
 </>
}
