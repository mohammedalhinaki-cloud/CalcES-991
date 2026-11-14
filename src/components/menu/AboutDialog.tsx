import { localize } from '../../i18n/locale'
import { showAdPrivacyOptions, useNativeAdsState } from '../../native/androidAds'
import EngagementDialog from '../EngagementDialog'
import { saveChoice } from '../../engagement/rating'
import { openStore } from '../../engagement/openStore'

/** About, privacy and support. Opened from the header menu on Android and on the web. */
export default function AboutDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
 const {configuration,privacyRequired,message}=useNativeAdsState()
 const rate=()=>{
  try{saveChoice(window.localStorage,'rate')}catch{/* A blocked preference store must not prevent opening the store listing. */}
  void openStore()
 }
 return <EngagementDialog open={open} onClose={onClose} titleId="android-privacy-title">
  <h2 id="android-privacy-title">{localize("عن التطبيق والخصوصية 🛡️")}</h2>
  <p>{configuration?.versionName?<>{localize("تطبيق CalcES 991 (إصدار ")}{configuration.versionName})</>:'CalcES 991'}<br/>{localize("تطوير: Maaoun Studio")}</p>
  <section><h3>{localize("سياسة الخصوصية")}</h3><p>{localize("نحن نحترم خصوصيتك تماماً. تعمل وظائف الحاسبة أوفلاين (بدون إنترنت)، ولا نرسل معادلاتك أو نتائجك إلى خادم للحساب. لا نطلب الوصول إلى موقعك الجغرافي أو ملفاتك الخاصة.")}</p><p>{localize("نحفظ محلياً على جهازك اللغة المختارة وعدد العمليات وتفضيلات تذكير التقييم فقط. لا تُرسل هذه التفضيلات إلينا.")}</p>{configuration?.adsEnabled&&<p>{localize("عند تفعيل إعلانات Google، يحتاج الإعلان إلى الإنترنت وقد تعالج خدمات Google بيانات الإعلان وفق سياسة الخصوصية وخيارات الموافقة المتاحة في منطقتك. لا توجد إعلانات كاملة الشاشة.")}</p>}
   {configuration?.privacyPolicyUrl&&<a href={configuration.privacyPolicyUrl} target="_blank" rel="noreferrer">{localize("سياسة الخصوصية التفصيلية")}</a>}
   {privacyRequired&&<button type="button" className="utility-button" onClick={()=>void showAdPrivacyOptions()}>{localize("خيارات خصوصية الإعلانات")}</button>}
  </section>
  <section><h3>{localize("الدعم الفني")}</h3><p>{localize("للدعم الفني والاستفسارات، يسعدنا تواصلك معنا عبر البريد:")}</p><a href="mailto:jy906675@gmail.com" dir="ltr">jy906675@gmail.com</a></section>
  <section><h3>{localize("شروط الاستخدام")}</h3><p>{localize("هذا التطبيق مقدم كأداة تعليمية وحسابية لمساعدتك في دراستك وأعمالك الحسابية.")}</p></section>
  {message&&<p role="status">{localize(message)}</p>}
  {configuration?.debug&&<p>{localize("نسخة اختبار: تستخدم معرّفات إعلانات Google التجريبية فقط.")}</p>}
  <div className="engagement-actions"><button type="button" className="utility-button rating-primary" onClick={rate}>{localize("هل أعجبك التطبيق؟ ادعمنا بالتقييم ⭐️")}</button><button type="button" className="utility-button" onClick={onClose}>{localize("إغلاق")}</button></div>
 </EngagementDialog>
}
