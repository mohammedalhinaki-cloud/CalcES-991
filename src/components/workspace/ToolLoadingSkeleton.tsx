import { localize } from '../../i18n/locale'

export default function ToolLoadingSkeleton() {
  return (
    <div className="tool-loading-skeleton" role="status" aria-label={localize('جارٍ تحميل الأداة')}>
      <div className="tool-loading-skeleton-heading" aria-hidden="true">
        <span className="tool-skeleton-block tool-skeleton-eyebrow" />
        <span className="tool-skeleton-block tool-skeleton-title" />
        <span className="tool-skeleton-block tool-skeleton-copy" />
      </div>

      <div className="tool-loading-skeleton-grid" aria-hidden="true">
        <div className="tool-skeleton-card">
          <span className="tool-skeleton-block tool-skeleton-short" />
          <span className="tool-skeleton-block tool-skeleton-medium" />
          <span className="tool-skeleton-block tool-skeleton-field" />
          <span className="tool-skeleton-block tool-skeleton-field" />
          <span className="tool-skeleton-block tool-skeleton-action" />
        </div>
        <div className="tool-skeleton-card tool-skeleton-chart-card">
          <div className="tool-skeleton-chart" />
          <div className="tool-skeleton-legend">
            <span className="tool-skeleton-block tool-skeleton-legend-line" />
            <span className="tool-skeleton-block tool-skeleton-legend-line" />
          </div>
        </div>
      </div>
    </div>
  )
}
