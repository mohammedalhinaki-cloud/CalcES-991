import { compileGraphExpression } from './compileGraphExpression'

export const GRAPH_WIDTH = 720
export const GRAPH_HEIGHT = 420
export const GRAPH_SAMPLES = 601

export interface GraphSource {
  id: number
  expression: string
}

export interface GraphSeries {
  id: number
  expression: string
  color: string
  path: string
  error: string
}

export interface GraphPlot {
  yMin: number
  yMax: number
  series: GraphSeries[]
}

export function formatGraphTick(value: number): string {
  if (!Number.isFinite(value) || Math.abs(value) < 1e-9) return '0'
  return String(Number(value.toPrecision(3)))
}

function sampleExpression(expression: string, xMin: number, xMax: number) {
  const evaluate = compileGraphExpression(expression)
  const values: Array<number | null> = []
  const step = (xMax - xMin) / (GRAPH_SAMPLES - 1)
  for (let index = 0; index < GRAPH_SAMPLES; index += 1) {
    const x = xMin + index * step
    try {
      const value = evaluate(x)
      values.push(Number.isFinite(value) && Math.abs(value) <= 1e12 ? value : null)
    } catch {
      values.push(null)
    }
  }
  return values
}

export function buildGraphPlot(
  sources: readonly GraphSource[],
  xMin: number,
  xMax: number,
  colors: readonly string[],
): GraphPlot {
  const sampled = sources.map((source, index) => {
    const color = colors[index % colors.length] ?? '#63d6c5'
    try {
      return { ...source, color, values: sampleExpression(source.expression, xMin, xMax), error: '' }
    } catch (error) {
      return { ...source, color, values: [] as Array<number | null>, error: error instanceof Error ? error.message : 'صيغة الدالة غير صالحة' }
    }
  })

  const finiteValues = sampled.flatMap(series => series.values.filter((value): value is number => value !== null))
  const sorted = finiteValues.slice().sort((a, b) => a - b)
  let yMin = -1
  let yMax = 1
  if (sorted.length > 0) {
    const low = sorted[Math.floor((sorted.length - 1) * 0.05)]!
    const high = sorted[Math.ceil((sorted.length - 1) * 0.95)]!
    yMin = Math.min(0, low)
    yMax = Math.max(0, high)
    if (!Number.isFinite(yMin) || !Number.isFinite(yMax) || yMin === yMax) {
      yMin = -1
      yMax = 1
    } else {
      const padding = (yMax - yMin) * 0.1
      yMin -= padding
      yMax += padding
    }
  }

  const xToSvg = (x: number) => ((x - xMin) / (xMax - xMin)) * GRAPH_WIDTH
  const yToSvg = (y: number) => GRAPH_HEIGHT - ((y - yMin) / (yMax - yMin)) * GRAPH_HEIGHT
  const series = sampled.map(item => {
    let path = ''
    let drawing = false
    item.values.forEach((value, index) => {
      if (value === null || value < yMin || value > yMax) {
        drawing = false
        return
      }
      const x = xMin + (index / (GRAPH_SAMPLES - 1)) * (xMax - xMin)
      const command = drawing ? 'L' : 'M'
      path += `${command}${xToSvg(x).toFixed(2)},${yToSvg(value).toFixed(2)} `
      drawing = true
    })
    return { id: item.id, expression: item.expression, color: item.color, path: path.trim(), error: item.error }
  })

  return { yMin, yMax, series }
}
