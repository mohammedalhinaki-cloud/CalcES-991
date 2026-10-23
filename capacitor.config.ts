import type { CapacitorConfig } from '@capacitor/cli'

// Confirm this applicationId before the first Play upload; it identifies the app permanently.
const config:CapacitorConfig={
 appId:'com.mohammedalhinaki.studytools.calculator',
 appName:'CalcES 991 - حاسبة علمية',
 webDir:'build/web',
 backgroundColor:'#15171c',
 android:{allowMixedContent:false,backgroundColor:'#15171c',minWebViewVersion:107},
 server:{androidScheme:'https'},
 plugins:{SystemBars:{insetsHandling:'css',initialViewportFitValueHint:'cover',style:'DARK'}},
}
export default config
