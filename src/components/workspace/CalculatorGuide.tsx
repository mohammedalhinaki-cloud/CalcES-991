import { localize } from '../../i18n/locale'

/** Short introduction above the calculator; only shown on tall desktop screens. */
export function CalculatorIntro() {
  return (
    <header className="calculator-heading">
      <div>
        <span className="calculator-heading-eyebrow">{localize('حاسبة علمية')}</span>
        <h2>{localize('فكّر بالأرقام، لا بالأزرار')}</h2>
        <p>{localize('اكتب تعبيرًا طبيعيًا واستخدم الأدوات العلمية في مساحة واحدة.')}</p>
      </div>
      <div className="calculator-heading-tags">
        <span><i aria-hidden="true" /> {localize('عرض رياضي طبيعي')}</span>
        <span>{localize('حساب محلي')}</span>
      </div>
    </header>
  )
}

/** Contextual guide card beside the calculator on desktop (≥1180px). */
export default function CalculatorGuide() {
  return (
    <div className="calculator-guide">
      <div className="guide-card-heading">
        <span className="guide-card-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-2-5.8L4 11l6-2.2L12 3Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/></svg>
        </span>
        <div>
          <span className="guide-eyebrow">{localize('مساحة تعلّم')}</span>
          <h3>{localize('ابدأ بخطوة صغيرة')}</h3>
        </div>
      </div>

      <p className="guide-intro">{localize('اكتب التعبير كما تراه، ثم استكشف الوظائف العلمية من لوحة المفاتيح.')}</p>

      <div className="guide-layer-list">
        <div className="guide-layer-row"><kbd>SHIFT</kbd><span>{localize('للوظائف الثانوية مثل العكسية والجذر التكعيبي')}</span></div>
        <div className="guide-layer-row"><kbd className="guide-alpha-key">ALPHA</kbd><span>{localize('للمتغيرات والرموز الإضافية')}</span></div>
      </div>

      <div className="guide-precision">
        <span className="precision-mark" aria-hidden="true">64</span>
        <div><strong>{localize('دقة عشرية عالية')}</strong><span>{localize('محرك الحساب يعمل محليًا على جهازك')}</span></div>
      </div>
    </div>
  )
}
