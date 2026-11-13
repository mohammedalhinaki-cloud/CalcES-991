import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const task = process.argv[2]
const appGallery = task === 'bundleAppGallery' || process.argv.includes('--appgallery')
const allowedTasks = ['assembleDebug', 'bundleRelease', 'bundleAppGallery', 'lintDebug']
if (!allowedTasks.includes(task)) throw new Error(`Choose one of: ${allowedTasks.join(', ')}`)
if (appGallery && task !== 'bundleAppGallery') throw new Error('Use bundleAppGallery for the Huawei AppGallery build.')
if (!appGallery && task === 'bundleAppGallery') throw new Error('The AppGallery build requires the --appgallery profile flag.')
const env = { ...process.env }
if (!env.ANDROID_HOME && !existsSync('android/local.properties')) throw new Error('Install Android SDK 36, set ANDROID_HOME (or android/local.properties), and use JDK 21.')

const temporaryFiles = new Map()
function rewriteTemporarily(file, transform) {
  if (!existsSync(file)) throw new Error(`Missing generated Android file: ${file}. Run npm run android:sync first.`)
  const original = readFileSync(file, 'utf8')
  const updated = transform(original)
  if (updated !== original) {
    temporaryFiles.set(file, original)
    writeFileSync(file, updated)
  }
}

let result
try {
  if (appGallery) {
    // The AppGallery flavor is ad-free and has no HMS/GMS ad SDK requirement. Remove the optional
    // Capacitor AdMob native plugin only while this variant is built; standard builds are restored.
    rewriteTemporarily('android/app/capacitor.build.gradle', source => source.replace(/^\s*implementation project\(':capacitor-community-admob'\)\s*\n/m, ''))
    rewriteTemporarily('android/capacitor.settings.gradle', source => source.replace(/\ninclude ':capacitor-community-admob'\nproject\(':capacitor-community-admob'\)\.projectDir = new File\([^\n]+\)\n/g, '\n'))
    rewriteTemporarily('android/app/src/main/assets/capacitor.plugins.json', source => {
      const plugins = JSON.parse(source)
      if (!Array.isArray(plugins)) throw new Error('Unexpected Capacitor plugin manifest format.')
      return `${JSON.stringify(plugins.filter(plugin => plugin.pkg !== '@capacitor-community/admob'), null, 2)}\n`
    })
  }

  result = spawnSync(
    process.platform === 'win32' ? 'gradlew.bat' : './gradlew',
    [`:app:${task}`, '--no-daemon', '--console=plain'],
    { cwd: 'android', env, stdio: 'inherit', shell: process.platform === 'win32' },
  )
} finally {
  for (const [file, original] of temporaryFiles) writeFileSync(file, original)
}

if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status ?? 1)

const artifacts = {
  assembleDebug: ['android/app/build/outputs/apk/debug/app-debug.apk', 'study-tools-debug.apk'],
  bundleRelease: ['android/app/build/outputs/bundle/release/app-release.aab', 'study-tools-release.aab'],
  bundleAppGallery: ['android/app/build/outputs/bundle/appGallery/app-appGallery.aab', 'calces-991-appgallery.aab'],
}
if (artifacts[task]) {
  const [source, name] = artifacts[task]
  mkdirSync('build/android', { recursive: true })
  copyFileSync(source, path.join('build/android', name))
  console.log(`Artifact: build/android/${name}`)
  if (task === 'bundleRelease') console.log('Only upload after android:check-release succeeds and the bundle is signed with the publisher upload key.')
  if (task === 'bundleAppGallery') console.log('Only upload after android:appgallery:check succeeds and the bundle is signed with the publisher upload key.')
}
