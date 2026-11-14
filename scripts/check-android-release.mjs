import { readFileSync, existsSync } from 'node:fs'

const settings = {}
if (existsSync('android/publisher.properties')) {
  for (const line of readFileSync('android/publisher.properties', 'utf8').split(/\r?\n/)) {
    const match = /^\s*([A-Z_]+)\s*=(.*)$/.exec(line)
    if (match) settings[match[1]] = match[2].trim()
  }
}
const get = key => process.env[key] ?? settings[key] ?? ''
const appGallery = process.argv.includes('--appgallery')
const problems = []
const capacitorId = /appId:\s*['"]([^'"]+)['"]/.exec(readFileSync('capacitor.config.ts', 'utf8'))?.[1]
const androidId = /applicationId\s+["']([^"']+)["']/.exec(readFileSync('android/app/build.gradle', 'utf8'))?.[1]

if (!capacitorId || capacitorId !== androidId) problems.push('The Capacitor appId and Android applicationId must match before the first store submission.')
if (get('ADMOB_APP_ID') && !/^ca-app-pub-\d{16}~\d{10}$/.test(get('ADMOB_APP_ID'))) problems.push('ADMOB_APP_ID: invalid format, even for an ad-disabled build.')
if (get('ADS_ENABLED') === 'true') {
  for (const [key, pattern] of [['ADMOB_APP_ID', /^ca-app-pub-\d{16}~\d{10}$/], ['ADMOB_BANNER_ID', /^ca-app-pub-\d{16}\/\d{10}$/]]) {
    if (!pattern.test(get(key)) || get(key).includes('3940256099942544')) problems.push(`${key}: set your real AdMob ID, not a sample.`)
  }
}
if (appGallery && get('ADS_ENABLED') === 'true') problems.push('ADS_ENABLED: disable AdMob for the AppGallery build; this project has no Huawei Ads Kit integration.')
if (get('ADS_ENABLED') && !['true', 'false'].includes(get('ADS_ENABLED'))) problems.push('ADS_ENABLED: choose true or false.')
if (get('ADS_ENABLED') === 'true' && !['general', 'children'].includes(get('APP_AUDIENCE'))) problems.push('APP_AUDIENCE: explicitly choose general or children; mixed audiences need an age gate before ads.')
if (!/^https:\/\//.test(get('PRIVACY_POLICY_URL'))) problems.push('PRIVACY_POLICY_URL: provide a published HTTPS privacy policy.')
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(get('SUPPORT_EMAIL'))) problems.push('SUPPORT_EMAIL: provide the publisher support address.')
if (appGallery) {
  const storeUrl = get('APP_STORE_URL')
  if (!/^https:\/\/appgallery\.huawei\.com(?:\/|$)/i.test(storeUrl)) problems.push('APP_STORE_URL: set the published HTTPS AppGallery listing URL on appgallery.huawei.com.')
}
if (!get('UPLOAD_KEYSTORE_PATH') || !existsSync(get('UPLOAD_KEYSTORE_PATH'))) problems.push('UPLOAD_KEYSTORE_PATH: supply the publisher upload keystore; it is never generated or committed by this project.')
for (const key of ['UPLOAD_KEY_ALIAS', 'UPLOAD_KEYSTORE_PASSWORD', 'UPLOAD_KEY_PASSWORD']) {
  if (!get(key)) problems.push(`${key}: missing (use local properties or environment variables).`)
}

if (problems.length) {
  const heading = appGallery ? 'AppGallery release is not ready:' : 'Android store release is not ready:'
  console.error(`${heading}\n${problems.map(problem => ` - ${problem}`).join('\n')}`)
  process.exit(1)
}

console.log(appGallery
  ? 'Local AppGallery signing and listing settings are present. Still validate the signed AAB on a Huawei/HMS device and complete AppGallery Connect declarations before submission.'
  : 'Local Android signing and publisher settings are present. Still validate the signed bundle on physical devices and complete the target-store declarations before submission.')
