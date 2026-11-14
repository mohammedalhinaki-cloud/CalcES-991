import LanguageGate from '../i18n/LanguageGate'
import { CalculatorProvider } from '../state/CalculatorProvider'
import WorkspaceShell from '../components/workspace/WorkspaceShell'

// The workspace composes tools around the existing scientific calculator.
// Calculator state and the MathLive editor stay mounted while the user changes tabs.
export default function App() {
  return (
    <LanguageGate>
      <CalculatorProvider>
        <WorkspaceShell />
      </CalculatorProvider>
    </LanguageGate>
  )
}
