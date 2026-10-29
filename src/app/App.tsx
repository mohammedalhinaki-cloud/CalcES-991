import LanguageGate from '../i18n/LanguageGate'
import { CalculatorProvider } from '../state/CalculatorProvider'
import CalculatorShell from '../components/CalculatorShell'

// Scientific evaluation stays separate from MathLive cursor/selection ownership.
export default function App() {
  return (
    <LanguageGate><main className="app-shell">
      <CalculatorProvider><CalculatorShell /></CalculatorProvider>
    </main></LanguageGate>
  )
}
