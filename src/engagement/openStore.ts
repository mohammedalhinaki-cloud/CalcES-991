import { AppConfiguration,isAndroidApp } from '../native/platform'
import { STORE_URL } from './rating'
export async function openStore(){
 if(isAndroidApp()){
  try{await AppConfiguration.openStore();return}catch{/* Old installed bridges can use the HTTPS fallback. */}
 }
 window.open(STORE_URL,'_blank','noopener,noreferrer')
}
