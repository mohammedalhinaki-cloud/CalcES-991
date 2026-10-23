import { localize } from '../../i18n/locale'
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
   {localize(advanced.state.status==='running'&&<p role="status">{localize("جارٍ الحساب خارج مسار الواجهة…")}</p>)}
   {localize(advanced.state.status==='error'&&<p role="alert" className="rounded border border-red-400/50 p-3 text-red-200">{localize(advanced.state.error)}</p>)}
   {localize(advanced.state.status==='success'&&<section aria-label={localize("نتيجة الحساب المتقدم")} className="rounded-lg border border-[#a3b69a]/40 p-3"><h2 className="mb-2 font-semibold">{localize(advanced.state.result.title)}</h2><dl className="space-y-2">{localize(advanced.state.result.lines.map((line,i)=><div key={i}><dt className="text-xs text-gray-300">{localize(line.label)}</dt><dd className="overflow-x-auto whitespace-pre-wrap font-mono" dir="ltr">{localize(line.value)}</dd></div>))}</dl>{localize(advanced.state.result.matrix&&<div className="mt-3 overflow-x-auto"><table aria-label={localize("مصفوفة النتيجة")} className="w-full font-mono" dir="ltr"><tbody>{localize(advanced.state.result.matrix.map((row,i)=><tr key={i}>{localize(row.map((value,j)=><td key={j} className="border border-white/15 p-2">{localize(value)}</td>))}</tr>))}</tbody></table></div>)}{localize(advanced.state.result.note&&<p className="mt-3 text-xs leading-6 text-gray-300">{localize(advanced.state.result.note)}</p>)}</section>)}
  </div>
 </div>
}
