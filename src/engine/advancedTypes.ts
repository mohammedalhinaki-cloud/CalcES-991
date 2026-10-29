import type { AngleUnit } from '../state/types'
import type { Variables } from './evaluate'
export type AdvancedRequest=
 | {kind:'integrate';latex:string;lower:string;upper:string;angle:AngleUnit}
 | {kind:'derivative';latex:string;point:string;angle:AngleUnit}
 | {kind:'root';latex:string;lower:string;upper:string;angle:AngleUnit}
 | {kind:'sum';latex:string;lower:string;upper:string;angle:AngleUnit;variables?:Variables;answer?:string|null}
 | {kind:'polynomial';coefficients:string[]}
 | {kind:'linear';a:string[][];b:string[]}
 | {kind:'matrix';operation:'det'|'inverse'|'multiply';a:string[][];b:string[][]}
 | {kind:'statistics';operation:'summary'|'regression';data:string}
 | {kind:'complex';latex:string;angle:AngleUnit}
 | {kind:'polar';radius:string;theta:string;angle:AngleUnit}
 | {kind:'base';operation:'convert'|'AND'|'OR'|'XOR'|'NOT';a:string;b:string;base:2|8|10|16}
export interface AdvancedResult {
 title:string
 lines:Array<{label:string;value:string}>
 matrix?:string[][]
 scalar?:string
 note?:string
}
export type WorkerReply={id:number;ok:true;result:AdvancedResult}|{id:number;ok:false;error:string}
