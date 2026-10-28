import {useState,useEffect} from 'react'
import {startAndroidAds} from '../native/androidAds'
import type {ReactNode} from 'react'
import {getDirection,readStoredLanguage,selectLanguage} from './locale'
import type {Language} from './locale'
export default function LanguageGate({children}:{children:ReactNode}){
 const [selected,setSelected]=useState(readStoredLanguage)
 useEffect(()=>{if(selected){selectLanguage(selected);void startAndroidAds()}},[selected])
 const choose=(value:Language)=>{selectLanguage(value);setSelected(value)}
 // The calculator mounts after selection: its editor and all labels start in the chosen language.
 if(!selected)return <main className="language-onboarding" dir="ltr">
  <section className="language-card" role="dialog" aria-modal="true" aria-labelledby="language-title">
   <p className="language-brand">CalcES 991</p>
   <h1 id="language-title" lang="en">Choose your language</h1>
   <p className="language-hint" lang="en">Your choice will be saved on this device</p>
   <div className="engagement-actions"><button type="button" lang="ar" dir="rtl" onClick={()=>choose('ar')}>العربية</button><button type="button" lang="en" onClick={()=>choose('en')}>English</button></div>
  </section>
 </main>
 return <div className="language-root" lang={selected} dir={getDirection()}>{children}</div>
}
