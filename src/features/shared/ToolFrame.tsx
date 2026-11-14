import type { ReactNode } from 'react'
import { localize } from '../../i18n/locale'

export type EducationalToolId = 'equation-solver' | 'graphing' | 'unit-converter' | 'formulas'

const TOOL_COPY: Record<EducationalToolId, { title: string; description: string }> = {
  'equation-solver': {
    title: 'حل المعادلات',
    description: 'حلّ المعادلات الخطية والتربيعية، وتتبّع خطوات الوصول إلى الجذور.',
  },
  graphing: {
    title: 'الرسم البياني',
    description: 'استكشف الدوال محليًا؛ أضف منحنيات، واسحب المخطط أو كبّره.',
  },
  'unit-converter': {
    title: 'تحويل الوحدات والثوابت',
    description: 'حوّل المقادير الشائعة وأدرج الثوابت العلمية مباشرة في الحاسبة.',
  },
  formulas: {
    title: 'القوانين والصيغ',
    description: 'ابحث في مجموعة مختارة من القوانين الرياضية والعلمية وأدرجها في الحاسبة.',
  },
}

export default function ToolFrame({
  kind,
  onReturn,
  children,
}: {
  kind: EducationalToolId
  onReturn: () => void
  children: ReactNode
}) {
  const copy = TOOL_COPY[kind]

  return (
    <div className={`learning-tool learning-tool--${kind}`}>
      <header className="learning-tool-header">
        <div className="learning-tool-heading">
          <span className="learning-tool-eyebrow"><span className="local-engine-dot" aria-hidden="true" />{localize('يعمل محليًا · دون اتصال')}</span>
          <h1>{localize(copy.title)}</h1>
          <p>{localize(copy.description)}</p>
        </div>
        <button type="button" className="learning-tool-back" onClick={onReturn}>
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5m7 7-7-7 7-7"/></svg>
          {localize('العودة إلى الحاسبة')}
        </button>
      </header>
      <div className="learning-tool-content">{children}</div>
    </div>
  )
}
