import { localize, getDirection } from '../i18n/locale'
import {useEffect,useRef} from 'react'
import type {ReactNode} from 'react'
export default function EngagementDialog({open,onClose,titleId,children}:{open:boolean;onClose:()=>void;titleId:string;children:ReactNode}){
 const ref=useRef<HTMLDialogElement>(null)
 useEffect(()=>{
  const dialog=ref.current
  if(open&&!dialog?.open)dialog?.showModal()
  if(!open&&dialog?.open)dialog.close()
 },[open])
 return <dialog ref={ref} className="history-dialog engagement-dialog" dir={getDirection()} aria-labelledby={titleId}
  onCancel={event=>{event.preventDefault();onClose()}} onClose={()=>{if(open)onClose()}}
  onClick={event=>{
   const bounds=event.currentTarget.getBoundingClientRect()
   if(event.target===event.currentTarget&&(event.clientX<bounds.left||event.clientX>bounds.right||event.clientY<bounds.top||event.clientY>bounds.bottom))onClose()
  }}>{localize(children)}</dialog>
}
