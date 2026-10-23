import { Capacitor, registerPlugin } from '@capacitor/core'
export const PUBLIC_APP_URL='https://study-tools-calculator.pages.dev/'
export const isAndroidApp=()=>Capacitor.isNativePlatform()&&Capacitor.getPlatform()==='android'
export interface AndroidConfiguration {
 bannerHeight:number
 debug:boolean
 adsEnabled:boolean
 bannerId:string
 audience:'general'|'children'|'unconfigured'
 privacyPolicyUrl:string
 supportEmail:string
 versionName:string
}
export const AppConfiguration=registerPlugin<{getConfiguration:()=>Promise<AndroidConfiguration>;openStore:()=>Promise<void>}>('AppConfiguration')
