import LanguageGate from '../i18n/LanguageGate'
import { CalculatorProvider } from '../state/CalculatorProvider'
import EducationHub from '../components/education/EducationHub'

// Scientific evaluation stays separate from MathLive cursor/selection ownership.
export default function App() {
  return (
    <LanguageGate><main className="app-shell">
      <CalculatorProvider><EducationHub /></CalculatorProvider>
    </main></LanguageGate>
  )
}
