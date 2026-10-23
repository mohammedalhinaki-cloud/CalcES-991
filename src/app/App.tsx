import { CalculatorProvider } from '../state/CalculatorProvider'
import CalculatorShell from '../components/CalculatorShell'

// Scientific evaluation stays separate from MathLive cursor/selection ownership.
export default function App() {
  return (
    <main className="app-shell" dir="rtl">
      <CalculatorProvider><CalculatorShell /></CalculatorProvider>
    </main>
  )
}
