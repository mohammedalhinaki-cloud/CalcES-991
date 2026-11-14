import { AppConfiguration, isAndroidApp, PUBLIC_APP_URL } from '../native/platform'
import { STORE_URL } from './rating'
export async function openStore(){
 if(isAndroidApp()){
  try{await AppConfiguration.openStore();return}catch{/* Older builds can use the publisher website fallback. */}
  window.open(PUBLIC_APP_URL,'_blank','noopener,noreferrer')
  return
 }
 window.open(STORE_URL,'_blank','noopener,noreferrer')
}
