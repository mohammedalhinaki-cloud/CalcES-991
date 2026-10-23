import {readFileSync,existsSync} from 'node:fs'
const settings={}
if(existsSync('android/publisher.properties')){
 for(const line of readFileSync('android/publisher.properties','utf8').split(/\r?\n/)){
  const match=/^\s*([A-Z_]+)\s*=(.*)$/.exec(line)
  if(match)settings[match[1]]=match[2].trim()
 }
}
const get=key=>process.env[key]??settings[key]??''
const problems=[]
const capacitorId=/appId:\s*['"]([^'"]+)['"]/.exec(readFileSync('capacitor.config.ts','utf8'))?.[1]
const androidId=/applicationId\s+["']([^"']+)["']/.exec(readFileSync('android/app/build.gradle','utf8'))?.[1]
if(!capacitorId||capacitorId!==androidId)problems.push('The Capacitor appId and Android applicationId must match before first upload.')
if(get('ADMOB_APP_ID')&&!/^ca-app-pub-\d{16}~\d{10}$/.test(get('ADMOB_APP_ID')))problems.push('ADMOB_APP_ID: invalid format, even for an ad-disabled build.')
if((get('ADS_ENABLED')||'false')==='true')for(const [key,pattern] of [['ADMOB_APP_ID',/^ca-app-pub-\d{16}~\d{10}$/],['ADMOB_BANNER_ID',/^ca-app-pub-\d{16}\/\d{10}$/]]){
 if(!pattern.test(get(key))||get(key).includes('3940256099942544'))problems.push(`${key}: set your real AdMob ID, not a sample.`)
}
if(get('ADS_ENABLED')&&!['true','false'].includes(get('ADS_ENABLED')))problems.push('ADS_ENABLED: choose true or false.')
if(!['general','children'].includes(get('APP_AUDIENCE')))problems.push('APP_AUDIENCE: explicitly choose general or children; mixed audiences need an age gate before ads.')
if(!/^https:\/\//.test(get('PRIVACY_POLICY_URL')))problems.push('PRIVACY_POLICY_URL: provide a published HTTPS privacy policy.')
if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('SUPPORT_EMAIL')))problems.push('SUPPORT_EMAIL: provide the real publisher support address.')
if(!get('UPLOAD_KEYSTORE_PATH')||!existsSync(get('UPLOAD_KEYSTORE_PATH')))problems.push('UPLOAD_KEYSTORE_PATH: supply your upload keystore; it is never generated or committed by this project.')
for(const key of ['UPLOAD_KEY_ALIAS','UPLOAD_KEYSTORE_PASSWORD','UPLOAD_KEY_PASSWORD'])if(!get(key))problems.push(`${key}: missing (use local properties or environment variables).`)
if(problems.length){console.error('Not ready for Play upload:\n'+problems.map(p=>' - '+p).join('\n'));process.exit(1)}
console.log('Local release settings are present. Also complete Play Console declarations, test on a physical device, and verify the signed bundle.')
