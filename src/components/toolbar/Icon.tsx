import { localize } from '../../i18n/locale'
import type { ReactNode } from 'react'
export default function Icon({name}:{name:'workspace'|'history'|'share'|'install'}){
 const shapes:Record<typeof name,ReactNode>={
  workspace:<><path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/></>,
  history:<><path d="M3 11a9 9 0 1 1 2.5 7M3 4v7h7M12 7v5l3 2"/></>,
  share:<><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/></>,
  install:<><path d="M5 4H3v16h18v-5M12 2v12m-4-4 4 4 4-4"/></>,
 }
 return <svg aria-hidden="true" width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{localize(shapes[name])}</svg>
}
