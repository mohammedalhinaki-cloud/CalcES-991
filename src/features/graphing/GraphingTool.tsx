import { useEffect, useMemo, useRef, useState } from 'react'
import { localize } from '../../i18n/locale'
import ToolFrame from '../shared/ToolFrame'
import { buildGraphPlot, formatGraphTick, GRAPH_HEIGHT, GRAPH_WIDTH } from './buildGraphPlot'
import type { GraphSource } from './buildGraphPlot'

const COLORS = ['#63d6c5', '#a994ff', '#f2bd66'] as const
const X_TICKS = 10
const Y_TICKS = 8
const INITIAL_RANGE = { min: -10, max: 10 }
const MAX_RANGE_SPAN = 1e6

function rangeText(value: number) {
  return String(Number(value.toPrecision(5)))
}

export default function GraphingTool({ onReturn }: { onReturn: () => void }) {
  const [functions, setFunctions] = useState<GraphSource[]>([{ id: 1, expression: 'sin(x)' }])
  const [domain, setDomain] = useState(INITIAL_RANGE)
  const [minDraft, setMinDraft] = useState(String(INITIAL_RANGE.min))
  const [maxDraft, setMaxDraft] = useState(String(INITIAL_RANGE.max))
  const [rangeError, setRangeError] = useState('')
  const [dragging, setDragging] = useState(false)
  const [plotLoading, setPlotLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [exportNotice, setExportNotice] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)
  const plotCardRef = useRef<HTMLElement>(null)
  const dragStart = useRef<{ clientX: number; min: number; max: number } | null>(null)
  const nextId = useRef(2)
  const plot = useMemo(() => buildGraphPlot(functions, domain.min, domain.max, COLORS), [functions, domain])
  const xSpan = domain.max - domain.min
  const xToSvg = (x: number) => ((x - domain.min) / xSpan) * GRAPH_WIDTH
  const yToSvg = (y: number) => GRAPH_HEIGHT - ((y - plot.yMin) / (plot.yMax - plot.yMin)) * GRAPH_HEIGHT
  const xAxisY = plot.yMin <= 0 && plot.yMax >= 0 ? yToSvg(0) : GRAPH_HEIGHT
  const yAxisX = domain.min <= 0 && domain.max >= 0 ? xToSvg(0) : 0
  const xTicks = Array.from({ length: X_TICKS + 1 }, (_, index) => domain.min + (xSpan * index) / X_TICKS)
  const yTicks = Array.from({ length: Y_TICKS + 1 }, (_, index) => plot.yMin + ((plot.yMax - plot.yMin) * index) / Y_TICKS)

  useEffect(() => {
    const timer = window.setTimeout(() => setPlotLoading(false), 260)
    return () => window.clearTimeout(timer)
  }, [plot])

  useEffect(() => {
    const syncFullscreen = () => setExpanded(document.fullscreenElement === plotCardRef.current)
    document.addEventListener('fullscreenchange', syncFullscreen)
    return () => document.removeEventListener('fullscreenchange', syncFullscreen)
  }, [])

  useEffect(() => {
    if (!expanded || document.fullscreenElement) return
    const closeFallback = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false) }
    document.addEventListener('keydown', closeFallback)
    return () => document.removeEventListener('keydown', closeFallback)
  }, [expanded])

  function updateFunction(id: number, expression: string) {
    setPlotLoading(true)
    setFunctions(current => current.map(item => item.id === id ? { ...item, expression } : item))
  }

  function addFunction() {
    if (functions.length >= 3) return
    setPlotLoading(true)
    setFunctions(current => [...current, { id: nextId.current++, expression: 'x^2' }])
  }

  function removeFunction(id: number) {
    setPlotLoading(true)
    setFunctions(current => current.length > 1 ? current.filter(item => item.id !== id) : current)
  }

  function applyRange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const min = Number(minDraft)
    const max = Number(maxDraft)
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || max - min > MAX_RANGE_SPAN) {
      setRangeError('أدخل مجالًا صالحًا؛ يجب أن تكون النهاية أكبر من البداية.')
      return
    }
    setPlotLoading(true)
    setDomain({ min, max })
    setMinDraft(rangeText(min))
    setMaxDraft(rangeText(max))
    setRangeError('')
  }

  function setView(min: number, max: number) {
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min || max - min > MAX_RANGE_SPAN) return
    if (!dragging) setPlotLoading(true)
    setDomain({ min, max })
    setMinDraft(rangeText(min))
    setMaxDraft(rangeText(max))
    setRangeError('')
  }

  function zoom(factor: number) {
    const center = (domain.min + domain.max) / 2
    const half = (xSpan * factor) / 2
    setView(center - half, center + half)
  }

  function handlePointerDown(event: React.PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    dragStart.current = { clientX: event.clientX, min: domain.min, max: domain.max }
    setDragging(true)
    try { event.currentTarget.setPointerCapture(event.pointerId) } catch { /* Pointer capture is optional in older embedded browsers. */ }
  }

  function handlePointerMove(event: React.PointerEvent<SVGSVGElement>) {
    const start = dragStart.current
    const svg = svgRef.current
    if (!start || !svg) return
    const width = svg.getBoundingClientRect().width
    if (width <= 0) return
    const shift = ((event.clientX - start.clientX) / width) * (start.max - start.min)
    setView(start.min - shift, start.max - shift)
  }

  function finishPan() {
    dragStart.current = null
    setDragging(false)
  }

  async function toggleFullscreen() {
    const element = plotCardRef.current
    if (!element) return
    if (document.fullscreenElement === element) {
      try { await document.exitFullscreen() } catch { setExpanded(false) }
      return
    }
    if (expanded && !document.fullscreenElement) {
      setExpanded(false)
      return
    }
    if (typeof element.requestFullscreen === 'function') {
      try { await element.requestFullscreen(); return } catch { /* Use the fixed-position fallback if fullscreen is unavailable. */ }
    }
    setExpanded(true)
  }

  function exportGraph() {
    const source = svgRef.current
    if (!source) return
    const clone = source.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    clone.setAttribute('width', String(GRAPH_WIDTH))
    clone.setAttribute('height', String(GRAPH_HEIGHT))
    const background = source.querySelector('.graph-background')
    const grid = source.querySelector('.graph-grid-line')
    const axis = source.querySelector('.graph-axis-line')
    const tick = source.querySelector('.graph-tick-label')
    const computed = (element: Element | null, property: string, fallback: string) => element ? window.getComputedStyle(element).getPropertyValue(property).trim() || fallback : fallback
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style')
    style.textContent = `.graph-background{fill:${computed(background, 'fill', '#172237')}}.graph-grid-line{stroke:${computed(grid, 'stroke', '#ffffff28')};stroke-width:1}.graph-axis-line{stroke:${computed(axis, 'stroke', '#a5b1c5')};stroke-width:1.4}.graph-tick-label{fill:${computed(tick, 'fill', '#a5b1c5')};font:10px ui-monospace,SFMono-Regular,Consolas,monospace}.graph-function-path{fill:none;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}`
    clone.insertBefore(style, clone.firstChild)
    const blob = new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `calces-graph-${new Date().toISOString().slice(0, 10)}.svg`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    setExportNotice('تم تصدير الرسم بصيغة SVG')
  }

  return (
    <ToolFrame kind="graphing" onReturn={onReturn}>
      <div className="graphing-layout">
        <section className="tool-card graph-controls-card" aria-label={localize('إعدادات الرسم')}>
          <div className="tool-card-heading">
            <span className="tool-card-step">01</span>
            <div><h2>{localize('الدوال')}</h2><p>{localize('استخدم x فقط؛ الدوال المثلثية تعمل بالراديان.')}</p></div>
          </div>

          <div className="graph-function-list">
            {functions.map((item, index) => {
              const color = COLORS[index % COLORS.length]!
              const series = plot.series.find(candidate => candidate.id === item.id)
              return (
                <div className="graph-function-row" key={item.id}>
                  <span className="graph-function-color" style={{ background: color }} aria-hidden="true" />
                  <label className="tool-field">
                    <span>{localize('الدالة')} {index + 1}</span>
                    <input
                      aria-label={`${localize('الدالة')} ${index + 1}`}
                      dir="ltr"
                      autoComplete="off"
                      spellCheck={false}
                      value={item.expression}
                      onChange={event => updateFunction(item.id, event.currentTarget.value)}
                    />
                  </label>
                  {functions.length > 1 && (
                    <button type="button" className="graph-remove-button" aria-label={`${localize('إزالة الدالة')} ${index + 1}`} onClick={() => removeFunction(item.id)}>
                      <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M5 12h14"/></svg>
                    </button>
                  )}
                  {series?.error && <p className="tool-error graph-function-error" role="alert">{localize(series.error)}</p>}
                </div>
              )
            })}
          </div>

          <button type="button" className="tool-secondary-button graph-add-button" onClick={addFunction} disabled={functions.length >= 3}>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14m-7-7h14"/></svg>
            {localize('إضافة دالة')}
          </button>

          <form className="graph-range-form" onSubmit={applyRange}>
            <h3>{localize('مجال x')}</h3>
            <div className="graph-range-inputs">
              <label className="tool-field"><span>{localize('من')}</span><input aria-label={localize('بداية مجال x')} inputMode="decimal" value={minDraft} onChange={event => setMinDraft(event.currentTarget.value)} /></label>
              <label className="tool-field"><span>{localize('إلى')}</span><input aria-label={localize('نهاية مجال x')} inputMode="decimal" value={maxDraft} onChange={event => setMaxDraft(event.currentTarget.value)} /></label>
              <button type="submit" className="tool-secondary-button">{localize('تطبيق المجال')}</button>
            </div>
            {rangeError && <p className="tool-error" role="alert">{localize(rangeError)}</p>}
          </form>
        </section>

        <section ref={plotCardRef} className={`tool-card graph-plot-card${expanded ? ' graph-plot-card--expanded' : ''}`} aria-label={localize('منطقة الرسم البياني')}>
          <div className="graph-plot-heading">
            <div className="tool-card-heading">
              <span className="tool-card-step tool-card-step--accent">02</span>
              <div><h2>{localize('المستوى الإحداثي')}</h2><p>{localize('اسحب المخطط للتحريك، واستخدم الأزرار لتغيير التكبير.')}</p></div>
            </div>
          </div>

          <div className="graph-canvas-wrap" aria-busy={plotLoading}>
            <svg
              ref={svgRef}
              className={`graph-canvas${dragging ? ' graph-canvas--dragging' : ''}`}
              viewBox={`0 0 ${GRAPH_WIDTH} ${GRAPH_HEIGHT}`}
              preserveAspectRatio="none"
              role="img"
              aria-label={localize('الرسم البياني للدوال')}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPan}
              onPointerCancel={finishPan}
              onLostPointerCapture={finishPan}
            >
              <rect className="graph-background" x="0" y="0" width={GRAPH_WIDTH} height={GRAPH_HEIGHT} rx="14" />
              {xTicks.map((tick, index) => {
                const x = xToSvg(tick)
                return <g key={`x-${index}`}><line className="graph-grid-line" x1={x} y1="0" x2={x} y2={GRAPH_HEIGHT}/><text className="graph-tick-label" x={x} y={Math.min(GRAPH_HEIGHT - 8, Math.max(17, xAxisY + 17))} textAnchor="middle">{formatGraphTick(tick)}</text></g>
              })}
              {yTicks.map((tick, index) => {
                const y = yToSvg(tick)
                return <g key={`y-${index}`}><line className="graph-grid-line" x1="0" y1={y} x2={GRAPH_WIDTH} y2={y}/><text className="graph-tick-label" x={Math.min(GRAPH_WIDTH - 8, Math.max(28, yAxisX + 8))} y={Math.max(12, y - 5)} textAnchor="start">{formatGraphTick(tick)}</text></g>
              })}
              <line className="graph-axis-line" x1="0" y1={xAxisY} x2={GRAPH_WIDTH} y2={xAxisY}/>
              <line className="graph-axis-line" x1={yAxisX} y1="0" x2={yAxisX} y2={GRAPH_HEIGHT}/>
              {plot.series.map(series => series.path && <path key={series.id} className="graph-function-path" data-function-id={series.id} d={series.path} stroke={series.color}/ >)}
            </svg>
            {plotLoading && <div className="graph-loading-shimmer" aria-hidden="true" />}
          </div>

          <div className="graph-floating-controls" role="group" aria-label={localize('أدوات تحريك الرسم وتصديره')}>
            <div className="graph-pan-controls" role="group" aria-label={localize('تحريك الرسم')}>
              <button type="button" aria-label={localize('تحريك الرسم لليسار')} title={localize('تحريك الرسم لليسار')} onClick={() => setView(domain.min - xSpan * .18, domain.max - xSpan * .18)}>←</button>
              <button type="button" aria-label={localize('تحريك الرسم لليمين')} title={localize('تحريك الرسم لليمين')} onClick={() => setView(domain.min + xSpan * .18, domain.max + xSpan * .18)}>→</button>
            </div>
            <div className="graph-zoom-controls" role="group" aria-label={localize('تكبير الرسم')}>
              <button type="button" aria-label={localize('تصغير الرسم')} title={localize('تصغير الرسم')} onClick={() => zoom(1.35)}>−</button>
              <button type="button" aria-label={localize('إعادة ضبط المجال')} title={localize('إعادة ضبط المجال')} onClick={() => setView(INITIAL_RANGE.min, INITIAL_RANGE.max)}>
                <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 11a8 8 0 0 1 13.7-5.7L20 7.5M20 4v3.5h-3.5M20 13a8 8 0 0 1-13.7 5.7L4 16.5M4 20v-3.5h3.5"/></svg>
              </button>
              <button type="button" aria-label={localize('تكبير الرسم')} title={localize('تكبير الرسم')} onClick={() => zoom(.72)}>+</button>
            </div>
            <button type="button" className="graph-export-button" aria-label={localize('تصدير الرسم بصيغة SVG')} title={localize('تصدير الرسم بصيغة SVG')} onClick={exportGraph}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3m-5 5 5-5 5 5M4 14v6h16v-6"/></svg>
            </button>
            <button type="button" className="graph-fullscreen-button" aria-label={localize(expanded ? 'إغلاق ملء الشاشة' : 'عرض الرسم بملء الشاشة')} title={localize(expanded ? 'إغلاق ملء الشاشة' : 'عرض الرسم بملء الشاشة')} aria-pressed={expanded} onClick={() => void toggleFullscreen()}>
              <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{expanded ? <path d="M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5"/> : <path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>}</svg>
            </button>
          </div>
          {exportNotice && <p className="graph-export-status" role="status">{localize(exportNotice)}</p>}

          <div className="graph-legend" aria-label={localize('مفتاح الرسم')}>
            {functions.map((item, index) => <span key={item.id}><i style={{ background: COLORS[index % COLORS.length] }} aria-hidden="true"/><code dir="ltr">y = {item.expression || '…'}</code></span>)}
          </div>
          {plot.series.every(series => series.error || !series.path) && <p className="graph-empty-note">{localize('لا توجد نقاط حقيقية ضمن المجال الحالي.')}</p>}
        </section>
      </div>
    </ToolFrame>
  )
}
