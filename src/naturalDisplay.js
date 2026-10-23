import { math, normalizeExpression } from './calculatorEngine.js'

// Placeholders complete only the visual preview; the evaluated input stays untouched.
export function toNaturalLatex(value, { preview = false } = {}) {
  if (!value || value.length > 500) return null
  const dms = value.match(/^([−-]?\d+)°(\d+)′([\d.]+)″$/)
  if (dms) return `${dms[1].replace('−', '-')}^{\\circ}${dms[2]}^{\\prime}${dms[3]}^{\\prime\\prime}`
  let source = normalizeExpression(value)
  if (preview) {
    if (/[+\-*/^(]$/.test(source)) source += 'displayblank'
    const balance = [...source].reduce((count, char) => count + (char === '(' ? 1 : char === ')' ? -1 : 0), 0)
    if (balance > 0) source += ')'.repeat(balance)
  }
  try {
    return math.parse(source).toTex({
      parenthesis: 'auto',
      implicit: 'hide',
      handler: (node) => {
        if (node.isSymbolNode && node.name === 'displayblank') return '\\square'
        if (node.isSymbolNode && node.name === 'ans') return '\\mathrm{Ans}'
        return undefined
      },
    })
  } catch {
    // An unfinished token, unmatched close parenthesis, or malformed input stays editable.
    return null
  }
}
