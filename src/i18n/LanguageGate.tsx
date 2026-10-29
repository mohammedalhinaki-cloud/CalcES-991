import {createContext,useContext,useState,useEffect} from 'react'
import {startAndroidAds} from '../native/androidAds'
import type {ReactNode} from 'react'
import {getDirection,getLanguage,selectLanguage} from './locale'
import type {Language} from './locale'
const LanguageContext=createContext<{language:Language;changeLanguage:(value:Language)=>void}>({language:getLanguage(),changeLanguage:()=>{}})
export const useLanguage=()=>useContext(LanguageContext)
export default function LanguageGate({children}:{children:ReactNode}){
 const [language,setLanguage]=useState(getLanguage)
 useEffect(()=>{selectLanguage(language,false)},[language])
 useEffect(()=>{void startAndroidAds()},[])
 const changeLanguage=(value:Language)=>{selectLanguage(value);setLanguage(value)}
 // Keep the calculator mounted when switching languages: expressions, history,
 // workspace data and the MathLive selection must survive this preference change.
 return <LanguageContext.Provider value={{language,changeLanguage}}><div className="language-root" lang={language} dir={getDirection()}>{children}</div></LanguageContext.Provider>
}
