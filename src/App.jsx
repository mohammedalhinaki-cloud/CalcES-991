import { useEffect, useMemo, useState } from 'react'
import { decimalToFraction, evaluateExpression, formatResult, MODES, renderNatural } from './calculatorEngine.js'

const COLORS = {
  shell: 'linear-gradient(145deg,#323c32,#202820)',
  key: 'linear-gradient(#4a5649,#303a31)',
  fn: 'linear-gradient(#d8ded7,#aeb8af)',
  op: 'linear-gradient(#586557,#3d493f)',
}

const keys = [
  { label: 'SHIFT', action: 'shift', type: 'fn', shift: 'SHIFT' }, { label: 'ALPHA', action: 'alpha', type: 'fn', alpha: 'A' }, { label: 'MODE', action: 'mode', type: 'fn' }, { label: 'SETUP', action: 'setup', type: 'fn' }, { label: '◀', action: 'back', type: 'fn' }, { label: '▶', action: 'forward', type: 'fn' },
  { label: 'sin', insert: 'sin(', type: 'fn', shift: 'sin⁻¹', alpha: 'A' }, { label: 'cos', insert: 'cos(', type: 'fn', shift: 'cos⁻¹' }, { label: 'tan', insert: 'tan(', type: 'fn', shift: 'tan⁻¹' }, { label: 'log', insert: 'log(', type: 'fn', shift: '10ˣ' }, { label: 'ln', insert: 'ln(', type: 'fn', shift: 'eˣ' }, { label: 'DEL', action: 'delete', type: 'fn' },
  { label: '√', insert: '√(', type: 'fn', shift: '∛(' }, { label: 'x²', insert: '^2', type: 'fn' }, { label: 'xʸ', insert: '^', type: 'fn' }, { label: 'x!', insert: '!', type: 'fn' }, { label: '1/x', insert: '1/', type: 'fn' }, { label: 'AC', action: 'clear', type: 'danger' },
  { label: '7', insert: '7' }, { label: '8', insert: '8' }, { label: '9', insert: '9' }, { label: '÷', insert: '÷', type: 'op' }, { label: '(', insert: '(', type: 'fn' }, { label: ')', insert: ')', type: 'fn' },
  { label: '4', insert: '4' }, { label: '5', insert: '5' }, { label: '6', insert: '6' }, { label: '×', insert: '×', type: 'op' }, { label: 'π', insert: 'π', type: 'fn' }, { label: 'e', insert: 'e', type: 'fn' },
  { label: '1', insert: '1' }, { label: '2', insert: '2' }, { label: '3', insert: '3' }, { label: '−', insert: '−', type: 'op' }, { label: 'Ans', action: 'ans', type: 'fn' }, { label: 'M+', action: 'memory', type: 'fn' },
  { label: '0', insert: '0', wide: true }, { label: '.', insert: '.' }, { label: ',', insert: ',' }, { label: '+', insert: '+', type: 'op' }, { label: '=', action: 'equals', type: 'equals' },
]

function Indicator({ children, active }) { return <span className={active ? 'opacity-100' : 'opacity-25'}>{children}</span> }

function NaturalDisplay({ expression, result, angle, mode, shift, alpha, memory, status }) {
  const resultHtml = result == null ? '' : renderNatural(String(result))
  return <section aria-live="polite" className="relative min-h-[164px] overflow-hidden rounded-lg bg-gradient-to-br from-[#c7e3c5] to-[#b4d1b5] px-3 py-2 text-[#233226] shadow-[inset_0_3px_13px_#20312566,inset_0_-1px_#ffffff]">
    <div className="flex h-5 items-center gap-3 font-mono text-[10px] text-[#4e6953]"><Indicator active={shift}>SHIFT</Indicator><Indicator active={alpha}>ALPHA</Indicator><Indicator active={memory}>M</Indicator><span>{angle}</span><span className="mr-auto">{mode}</span></div>
    <div className="mt-1 h-5 overflow-hidden whitespace-nowrap text-left font-mono text-xs text-[#5d7c62]" dir="ltr">{status}</div>
    <div className="lcd-no-scroll flex h-[61px] items-center overflow-x-auto whitespace-nowrap font-mono text-[25px]" dir="ltr">{expression ? <span dangerouslySetInnerHTML={{ __html: renderNatural(expression) }} /> : <span>0<span className="cursor-blink ml-1 inline-block h-7 w-[2px] bg-[#36513b]" /></span>}</div>
    <div className="lcd-no-scroll flex h-[38px] items-center justify-end overflow-x-auto whitespace-nowrap text-right font-mono text-lg text-[#425e47]" dir="ltr" dangerouslySetInnerHTML={{ __html: resultHtml }} />
    <span className="absolute bottom-1 left-3 font-mono text-[9px] text-[#58735c]">MathO · Norm 1</span>
  </section>
}

function ModeDialog({ title, children, onClose }) { return <div className="fixed inset-0 z-20 grid place-items-center bg-black/60 p-4" onClick={onClose}><div className="w-full max-w-[480px] rounded-2xl border border-[#687466] bg-[#293329] p-4 shadow-2xl" onClick={(event) => event.stopPropagation()}><h2 className="m-0 text-lg font-bold">{title}</h2><p className="mb-3 mt-1 text-xs text-[#aeb9ad]">اختر الإعداد الذي يحاكي قائمة الجهاز.</p>{children}<button onClick={onClose} className="mt-4 rounded-md bg-[#f1a33b] px-4 py-2 font-bold text-[#241a0e]">إغلاق</button></div></div> }

export default function App() {
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState(null)
  const [lastAnswer, setLastAnswer] = useState(0)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [angle, setAngle] = useState('DEG')
  const [mode, setMode] = useState('COMP')
  const [shift, setShift] = useState(false)
  const [alpha, setAlpha] = useState(false)
  const [memory, setMemory] = useState(0)
  const [dialog, setDialog] = useState(null)
  const [status, setStatus] = useState('Ready')

  const answerText = useMemo(() => result == null ? '' : formatResult(result), [result])
  const insert = (value) => { setExpression((current) => current + value); setResult(null); setStatus('Ready') }
  const clear = () => { setExpression(''); setResult(null); setStatus('Ready') }
  const calculate = () => { if (!expression) return; try { const value = evaluateExpression(expression, { angle, answer: lastAnswer }); setResult(value); setLastAnswer(value); setHistory((items) => [...items, { expression, value }]); setHistoryIndex(-1); setExpression(''); setStatus('OK') } catch { setResult('Math ERROR'); setStatus('Check expression') } }
  const convert = () => { if (result == null || typeof result === 'string') return; const converted = decimalToFraction(result); setResult(converted || result); setStatus(converted ? 'S⇔D · fraction' : 'S⇔D · decimal') }
  const action = (name) => { if (name === 'shift') setShift((value) => !value); else if (name === 'alpha') setAlpha((value) => !value); else if (name === 'mode' || name === 'setup') setDialog(name); else if (name === 'equals') calculate(); else if (name === 'clear') clear(); else if (name === 'delete') setExpression((value) => value.slice(0, -1)); else if (name === 'ans') insert('Ans'); else if (name === 'memory') { if (result != null && typeof result !== 'string') setMemory((value) => value + Number(result)); else if (memory) insert(String(memory)) } else if (name === 'back' && history.length) { const index = Math.max(0, historyIndex < 0 ? history.length - 1 : historyIndex - 1); setHistoryIndex(index); setExpression(history[index].expression); setResult(null) } else if (name === 'forward' && historyIndex >= 0) { const index = historyIndex + 1; setHistoryIndex(index < history.length ? index : -1); setExpression(index < history.length ? history[index].expression : '') } }
  const pressKey = (key) => { if (key.action) return action(key.action); if (!key.insert) return; let value = key.insert; if (shift) { value = ({ 'sin(': 'asin(', 'cos(': 'acos(', 'tan(': 'atan(', 'log(': '10^(', 'ln(': 'e^', '√(': '∛(' })[value] || value; setShift(false) } insert(value) }

  useEffect(() => { const handle = (event) => { if (event.key === 'Enter') calculate(); else if (event.key === 'Escape') clear(); else if (event.key === 'Backspace') action('delete'); else if (event.key === 'Shift') setShift(true); else if (/^[0-9+\-*/().,!]$/.test(event.key)) insert(({ '*': '×', '/': '÷', '-': '−' }[event.key] || event.key)) }; window.addEventListener('keydown', handle); return () => window.removeEventListener('keydown', handle) })

  return <div className="min-h-screen bg-[radial-gradient(ellipse_at_50%_-10%,#435044,#111612_56%)] px-2 py-5 text-[#eff3ed] sm:px-4"><main className="mx-auto w-full max-w-[620px] rounded-[25px] border border-[#596557] p-4 shadow-[0_30px_80px_#000b,inset_0_1px_#ffffff22] sm:p-5" style={{ background: COLORS.shell }}>
    <header className="mb-3 flex items-end justify-between"><div className="font-bold"><small className="block font-mono text-[10px] tracking-[2px] text-[#f1a33b]">NATURAL TEXTBOOK DISPLAY</small>حاسبة علمية</div><div className="font-mono text-xs text-[#c3ccc1]">fx‑991ES PLUS style</div></header>
    <NaturalDisplay expression={expression} result={answerText} angle={angle} mode={mode} shift={shift} alpha={alpha} memory={memory} status={status} />
    <nav className="my-3 grid grid-cols-5 gap-2">{[['MODE', 'mode'], ['SETUP', 'setup'], [angle, 'angle'], ['S⇔D', 'fraction'], ['AC', 'clear']].map(([label, actionName]) => <button key={actionName} onClick={() => actionName === 'angle' ? setAngle((value) => value === 'DEG' ? 'RAD' : value === 'RAD' ? 'GRA' : 'DEG') : actionName === 'fraction' ? convert() : action(actionName)} className="rounded-md border border-[#465246] bg-[#202920] px-1 py-2 text-[11px] text-[#aeb9ad] hover:border-[#f1a33b]">{label}</button>)}</nav>
    <section className="grid grid-cols-6 gap-2" dir="ltr">{keys.map((key, index) => <button key={`${key.label}-${index}`} onClick={() => pressKey(key)} className={`key-3d relative min-h-[49px] rounded-lg font-bold shadow-[0_3px_#151a15,inset_0_1px_#ffffff22] ${key.wide ? 'col-span-2' : ''} ${key.type === 'fn' ? 'text-[#1c281e]' : ''} ${key.type === 'op' ? 'text-[#f0f4ee]' : ''} ${key.type === 'danger' ? 'text-[#e88171]' : ''} ${key.type === 'equals' ? 'bg-[#f1a33b] text-[#241a0e] shadow-[0_3px_#a66a1c]' : ''}`} style={key.type === 'fn' ? { background: COLORS.fn } : key.type === 'op' ? { background: COLORS.op } : key.type === 'danger' ? { background: COLORS.key } : key.type === 'equals' ? undefined : { background: COLORS.key }}><span className="absolute left-1 top-1 font-mono text-[9px] text-[#f1a33b]">{key.shift}</span><span className="absolute right-1 top-1 font-mono text-[9px] text-[#b05e5b]">{key.alpha}</span>{key.label}</button>)}</section>
  </main><p className="mx-auto mt-4 max-w-[620px] text-center text-[11px] leading-7 text-[#98a398]">واجهة مستقلة للتعلم، مستوحاة من تخطيط ES PLUS وليست منتجاً رسمياً من Casio.</p>
  {dialog === 'mode' && <ModeDialog title="MODE" onClose={() => setDialog(null)}><div className="grid grid-cols-2 gap-2">{MODES.map(([id, description]) => <button key={id} onClick={() => { setMode(id); setDialog(null) }} className={`rounded-lg border p-3 text-right ${mode === id ? 'border-[#f1a33b] bg-[#423522]' : 'border-[#465246] bg-[#202820]'}`}><b className="block font-mono text-sm text-[#f1a33b]">{id}</b><small className="text-[#aeb9ad]">{description}</small></button>)}</div></ModeDialog>}
  {dialog === 'setup' && <ModeDialog title="SETUP" onClose={() => setDialog(null)}><div className="grid grid-cols-2 gap-2">{['DEG', 'RAD', 'GRA', 'MathO', 'LineO'].map((item) => <button key={item} onClick={() => { if (['DEG', 'RAD', 'GRA'].includes(item)) setAngle(item); setDialog(null) }} className="rounded-lg border border-[#465246] bg-[#202820] p-3 text-right"><b className="block font-mono text-sm text-[#f1a33b]">{item}</b><small className="text-[#aeb9ad]">إعداد شاشة أو زاوية</small></button>)}</div></ModeDialog>}
  </div>
}
