import {spawnSync} from 'node:child_process'
import {existsSync,mkdirSync,copyFileSync} from 'node:fs'
import path from 'node:path'
const task=process.argv[2]
if(!['assembleDebug','bundleRelease','lintDebug'].includes(task))throw new Error('Choose assembleDebug, bundleRelease, or lintDebug')
const env={...process.env}
if(!env.ANDROID_HOME&&!existsSync('android/local.properties'))throw new Error('Install Android SDK 36, set ANDROID_HOME (or android/local.properties), and use JDK 21.')
const result=spawnSync(process.platform==='win32'?'gradlew.bat':'./gradlew',[`:app:${task}`,'--no-daemon','--console=plain'],{cwd:'android',env,stdio:'inherit',shell:process.platform==='win32'})
if(result.error)throw result.error
if(result.status)process.exit(result.status)
const artifacts={assembleDebug:['android/app/build/outputs/apk/debug/app-debug.apk','study-tools-debug.apk'],bundleRelease:['android/app/build/outputs/bundle/release/app-release.aab','study-tools-release.aab']}
if(artifacts[task]){
 const [source,name]=artifacts[task];mkdirSync('build/android',{recursive:true});copyFileSync(source,path.join('build/android',name))
 console.log(`Artifact: build/android/${name}`)
 if(task==='bundleRelease')console.log('Only upload after android:check-release succeeds and the bundle is signed with your upload key.')
}
