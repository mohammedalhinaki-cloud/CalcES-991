import { useEffect, useReducer } from 'react'
import { calculatorReducer, initialState, resultText } from './calculatorState.js'

import Keypad from './components/Keypad.jsx'
import NaturalDisplay from './components/NaturalDisplay.jsx'

function CalculatorScreen({ state }) {
  const indicators = [{ label: state.angle, active: true }, { label: 'MATH', active: true }, { label: 'SHIFT', active: state.shift }, { label: 'ALPHA', active: state.alpha }, { label: 'HYP', active: state.hyp }, { label: 'M', active: !state.variables.M.isZero() }]
  if (state.off) return <section aria-label="الحاسبة مطفأة، اضغط AC للتشغيل" className="calculator-lcd min-h-[186px] rounded-lg bg-[#a3b69a]" />
  return (
    <section
      aria-label="شاشة الحاسبة"
      className="calculator-lcd rounded-lg bg-[#a3b69a] px-4 py-3 text-black/75"
      dir="ltr"
    >
      {/* Inactive layers stay visible, just as on a physical LCD. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[9px] font-bold tracking-wide">
        {indicators.map(({ label, active }) => (
          <span key={label} className={active ? 'opacity-70' : 'opacity-20'}>
            {label}
          </span>
        ))}
      </div>

      <NaturalDisplay expression={state.expression} cursor={state.cursor} result={resultText(state)} />
      <p className="min-h-4 text-[10px]" dir="auto" role="status">{state.status}</p>
    </section>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(calculatorReducer, initialState)
  const pressKey = (key) => dispatch({ type: 'KEY', key, ...(key === '.' ? { random: String(Math.random()) } : {}) })
  useEffect(() => {
    const handleKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || (event.target.closest('button') && ['Enter', ' '].includes(event.key))) return
      const mapped = { Enter: '=', Escape: 'AC', Backspace: 'DEL', ArrowLeft: '◀', ArrowRight: '▶', '*': '×', '/': '÷', '-': '−' }[event.key]
      if (mapped || /^[0-9.+()]$/.test(event.key)) {
        event.preventDefault()
        dispatch({ type: 'KEY', key: mapped || event.key, ...(event.key === '.' ? { random: String(Math.random()) } : {}) })
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])
  return (
    <main className="grid min-h-dvh place-items-center bg-[#17191d] px-3 py-8 text-gray-100" dir="rtl">
      <div className="min-w-0 w-full max-w-[400px]">
        <article aria-label="تصميم حاسبة علمية مستوحى من fx-991ES PLUS" className="calculator-shell rounded-2xl bg-[#2a2d32] p-5 sm:p-6">
          <header className="mb-5 flex flex-wrap items-start justify-between gap-3" dir="ltr">
            <div>
              <h1 className="m-0 text-lg font-bold tracking-wide">SCIENTIFIC</h1>
              <p className="mt-1 text-[9px] tracking-[0.16em] text-gray-400">NATURAL TEXTBOOK DISPLAY</p>
            </div>
            <p className="pt-1 font-mono text-[11px] text-gray-300">fx-991ES PLUS</p>
          </header>
          <CalculatorScreen state={state} />
          <Keypad onPress={pressKey} shift={state.shift} alpha={state.alpha} />
        </article>
        <p className="mt-5 text-center text-xs leading-6 text-gray-400">
          عرض رياضي طبيعي · SHIFT للدوال الثانوية · ALPHA للمتغيرات
        </p>
      </div>
    </main>
  )
}
