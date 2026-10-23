import { localize } from '../../i18n/locale'
import DataEntry from './DataEntry'
export default function MatrixGrid({label,values,onChange}:{label:string;values:string[][];onChange:(values:string[][])=>void}){
 return <fieldset className="mb-3 min-w-0 rounded border border-white/15 p-2"><legend className="px-1 text-sm">{localize(label)}</legend><div className="grid gap-2" style={{gridTemplateColumns:`repeat(${values[0]!.length},minmax(0,1fr))`}} dir="ltr">{localize(values.flatMap((row,i)=>row.map((cell,j)=><DataEntry key={`${i}-${j}`} label={localize(`${label}${i+1}${j+1}`)} value={cell} onChange={value=>onChange(values.map((r,n)=>n===i?r.map((c,m)=>m===j?value:c):r))}/>)))}</div></fieldset>
}
