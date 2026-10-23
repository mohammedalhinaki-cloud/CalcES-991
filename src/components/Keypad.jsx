// Key labels and layer legends share the same dispatch path.
const KEYS = [
  { label: 'SHIFT', accent: 'text-orange-400' },
  { label: 'ALPHA', accent: 'text-red-400' },
  { label: '◀', name: 'تحريك المؤشر يسارًا' },
  { label: '▶', name: 'تحريك المؤشر يمينًا' },
  { label: 'MODE', shift: 'SETUP' },
  { label: 'a b/c', shift: 'd/c' },
  { label: '√', shift: '∛' },
  { label: 'x²', shift: 'x³' },
  { label: 'xʸ', shift: 'ʸ√x' },
  { label: 'log', shift: '10ˣ' },
  { label: 'ln', shift: 'eˣ' },
  { label: 'sin', shift: 'sin⁻¹' },
  { label: 'cos', shift: 'cos⁻¹' },
  { label: 'tan', shift: 'tan⁻¹' },
  { label: 'x⁻¹', shift: 'x!' },
  { label: '(−)', alpha: 'A' },
  { label: '°′″', alpha: 'B' },
  { label: 'hyp', alpha: 'C' },
  { label: '(', alpha: 'D' },
  { label: ')', alpha: 'E' },
  { label: 'RCL', shift: 'STO', alpha: 'F' },
  { label: 'ENG', shift: '←ENG' },
  { label: 'S⇔D', shift: 'a b/c' },
  { label: 'M+', shift: 'M−', alpha: 'M' },
  { label: 'π', shift: 'e', alpha: 'X' },
  { label: '7', tone: 'dark' },
  { label: '8', tone: 'dark' },
  { label: '9', tone: 'dark' },
  { label: 'DEL', shift: 'INS' },
  { label: 'AC', tone: 'clear', shift: 'OFF' },
  { label: '4', tone: 'dark' },
  { label: '5', tone: 'dark' },
  { label: '6', tone: 'dark' },
  { label: '×', tone: 'dark' },
  { label: '÷', tone: 'dark' },
  { label: '1', tone: 'dark' },
  { label: '2', tone: 'dark' },
  { label: '3', tone: 'dark' },
  { label: '+', tone: 'dark' },
  { label: '−', tone: 'dark' },
  { label: '0', tone: 'dark' },
  { label: '.', tone: 'dark', shift: 'Ran#' },
  { label: '×10ˣ', tone: 'dark', shift: 'π' },
  { label: 'Ans', tone: 'dark', alpha: 'Y' },
  { label: '=', tone: 'equals' },
]

const TONES = {
  function: 'bg-[#d1d5db] text-[#202329]',
  dark: 'bg-[#3a3e45] text-gray-100',
  clear: 'bg-[#7f1d1d] text-white',
  equals: 'bg-[#d97706] text-white',
}

export function CalculatorKey({ label, name, tone = 'function', shift, alpha, accent, onPress, active }) {
  return (
    <div className="min-w-0">
      {/* Layer legends sit above the moving keycap, like printed case labels. */}
      <div aria-hidden="true" className="mb-1 flex h-3 items-center justify-between gap-0.5 whitespace-nowrap font-mono text-[8px] font-semibold sm:text-[9px]">
        <span className="text-orange-400">{shift}</span>
        <span className="text-red-400">{alpha}</span>
      </div>
      <button
        type="button"
        onClick={() => onPress?.(label)}
        aria-pressed={label === 'SHIFT' || label === 'ALPHA' ? Boolean(active) : undefined}
        aria-label={name || label}
        className={`calculator-key flex h-11 w-full touch-manipulation items-center justify-center rounded-lg px-0.5 text-[12px] font-bold outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#2a2d32] sm:text-sm ${TONES[tone]}`}
      >
        <span className={accent}>{label}</span>
      </button>
    </div>
  )
}

export default function Keypad({ onPress, shift, alpha }) {
  return (
    <section aria-label="لوحة مفاتيح الحاسبة" aria-describedby="keypad-stage" className="mt-4">
      <p id="keypad-stage" className="sr-only">استخدم SHIFT للدوال البرتقالية وALPHA للمتغيرات الحمراء.</p>
      <div className="grid grid-cols-5 gap-x-2 gap-y-2 sm:gap-x-3" dir="ltr">
        {KEYS.map((key) => <CalculatorKey key={key.label} {...key} onPress={onPress} active={key.label === 'SHIFT' ? shift : alpha} />)}
      </div>
    </section>
  )
}
