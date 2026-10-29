import { math } from '../engine/mathInstance'
import type { HistoryEntry } from './history'

// Presentation only: parse computed math.js strings for typesetting, never
// evaluate them or replace the exact values and inputs stored for recall.
export function resultLatex(value: string): string | undefined {
 if (value.length > 4000 || /[^\x20-\x7E\s]/.test(value)) return undefined
 try { return math.parse(value).toTex({ parenthesis: 'auto', implicit: 'hide' }) }
 catch { return undefined }
}
export function historyExpression(entry: HistoryEntry): string | undefined {
 const request = entry.request
 if (!request) return entry.snapshot.latex
 switch (request.kind) {
  case 'integrate': return `\\int_{${request.lower}}^{${request.upper}}\\left(${request.latex}\\right)\\,dx`
  case 'derivative': return `\\frac{d}{dx}\\left(${request.latex}\\right)`
  case 'root': case 'complex': case 'linear-calculus': return request.latex
  default: return undefined
 }
}
export const matrixLatex = (matrix: string[][]) =>
 `\\begin{bmatrix}${matrix.map(row => row.map(value => resultLatex(value) ?? value).join('&')).join('\\\\')}\\end{bmatrix}`
