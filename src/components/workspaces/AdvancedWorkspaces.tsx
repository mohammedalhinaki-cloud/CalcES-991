import { useCalculator } from '../../state/CalculatorProvider'
import CalculusWorkspace from './CalculusWorkspace'
import MatrixWorkspace from './MatrixWorkspace'
import StatisticsWorkspace from './StatisticsWorkspace'
import EquationWorkspace from './EquationWorkspace'
import ComplexWorkspace from './ComplexWorkspace'
import BaseNWorkspace from './BaseNWorkspace'
export default function AdvancedWorkspaces(){
 const {advanced,state}=useCalculator()
 return <div hidden={state.off}>
  <CalculusWorkspace/><MatrixWorkspace/><StatisticsWorkspace/><EquationWorkspace/><ComplexWorkspace/><BaseNWorkspace/>
  <div aria-live="polite" aria-atomic="true" className="mt-3 break-words text-sm [overflow-wrap:anywhere]">
   {advanced.state.status==='running'&&<p role="status">جارٍ الحساب خارج مسار الواجهة…</p>}
   {advanced.state.status==='error'&&<p role="alert" className="rounded border border-red-400/50 p-3 text-red-200">{advanced.state.error}</p>}
   {advanced.state.status==='success'&&<section aria-label="نتيجة الحساب المتقدم" className="rounded-lg border border-[#a3b69a]/40 p-3"><h2 className="mb-2 font-semibold">{advanced.state.result.title}</h2><dl className="space-y-2">{advanced.state.result.lines.map((line,i)=><div key={i}><dt className="text-xs text-gray-300">{line.label}</dt><dd className="overflow-x-auto whitespace-pre-wrap font-mono" dir="ltr">{line.value}</dd></div>)}</dl>{advanced.state.result.matrix&&<div className="mt-3 overflow-x-auto"><table aria-label="مصفوفة النتيجة" className="w-full font-mono" dir="ltr"><tbody>{advanced.state.result.matrix.map((row,i)=><tr key={i}>{row.map((value,j)=><td key={j} className="border border-white/15 p-2">{value}</td>)}</tr>)}</tbody></table></div>}{advanced.state.result.note&&<p className="mt-3 text-xs leading-6 text-gray-300">{advanced.state.result.note}</p>}</section>}
  </div>
 </div>
}
