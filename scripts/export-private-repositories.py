"""Export reviewed sources into two private-repository working copies; never push."""
import json, pathlib, shutil, subprocess, zipfile
root = pathlib.Path(__file__).resolve().parents[1]
out = root / 'build/private-repositories'
if out.exists():
    raise SystemExit('Output already exists. Move it aside before exporting again.')
web, native = out / 'study-tools-web', out / 'study-tools-android'
web.mkdir(parents=True); native.mkdir(parents=True)
files = subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=root).decode().split('\0')
def copy(rel, target):
    source = root / rel
    if not source.is_file(): return
    dest = target / rel; dest.parent.mkdir(parents=True, exist_ok=True); shutil.copy2(source,dest)
for rel in files:
    if not rel or rel.startswith(('site/', '.github/', 'build/')): continue
    if rel.startswith('android/') or rel == 'capacitor.config.ts' or rel.startswith('docs/play/') or rel in ['scripts/android-gradle.mjs','scripts/check-android-release.mjs']:
        copy(rel,native)
    else:
        copy(rel,web)
# Capacitor bridge code remains in the web bundle so the same UI runs on both platforms.
# Native SDKs, manifest, signing, launcher assets and publisher settings live only in Android.
package = json.loads((root/'package.json').read_text())
web_package = json.loads(json.dumps(package))
web_package['scripts'] = {k:v for k,v in package['scripts'].items() if not k.startswith('android:')}
(web/'package.json').write_text(json.dumps(web_package,indent=2)+'\n')
# package-lock root metadata does not encode scripts; dependency versions remain unchanged.
for rel in ['package-lock.json','.gitignore']: copy(rel,native)
native_package = json.loads(json.dumps(package))
native_package['name']='study-tools-android'
native_package['scripts']={k:v for k,v in package['scripts'].items() if k.startswith('android:')}
native_package['scripts']['web:build']='node scripts/prepare-web.mjs'
native_package['scripts']['android:sync']='npm run web:build && cap sync android'
(native/'package.json').write_text(json.dumps(native_package,indent=2)+'\n')
lock=json.loads((native/'package-lock.json').read_text());lock['name']=native_package['name'];lock['packages']['']['name']=native_package['name'];(native/'package-lock.json').write_text(json.dumps(lock,indent=2)+'\n')
(web/'.github/workflows').mkdir(parents=True)
(web/'.github/workflows/web.yml').write_text('''name: Check and deploy web
on:
  push:
    branches: [main]
  pull_request:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  web:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - name: Deploy production to Cloudflare Pages
        if: github.event_name != 'pull_request' && github.ref == 'refs/heads/main'
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          CLOUDFLARE_ACCOUNT_ID: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        run: |
          test -n "$CLOUDFLARE_API_TOKEN" && test -n "$CLOUDFLARE_ACCOUNT_ID" || { echo 'Configure Cloudflare repository secrets first'; exit 1; }
          npx --yes wrangler@4.151.3 pages deploy build/web --project-name study-tools-calculator --branch main
''')
(web/'PRIVATE-REPOSITORY.ar.md').write_text('''# مستودع الموقع الخاص
أنشئ study-tools-web في GitHub بخيار Private، دون README ابتدائي. لا تحذف المستودع القديم.
ارفع هذا المجلد باستخدام GitHub Desktop: Add local repository ثم Publish repository واترك Keep this code private مفعلاً.
في Settings → Secrets and variables → Actions أضف CLOUDFLARE_API_TOKEN بصلاحية تعديل Pages للحساب المقصود فقط، وCLOUDFLARE_ACCOUNT_ID.
بعدها كل push إلى main يشغّل الاختبارات والبناء وينشر في مشروع study-tools-calculator القائم؛ لا تحتاج تغيير DNS.
هذا يستخدم GitHub Actions للنشر المباشر، ولا يدّعي تفعيل ربط Git الأصلي داخل Cloudflare. لا تفعّل طريقتي نشر متوازيتين.
تحديث الموقع لا يغيّر ملفات Android المضمّنة؛ اتبع دليل المستودع الثاني لبناء إصدار جديد.
''')
def init(directory):
    subprocess.run(['git','init','-b','main'],cwd=directory,check=True,stdout=subprocess.DEVNULL)
    subprocess.run(['git','add','.'],cwd=directory,check=True)
    subprocess.run(['git','-c','user.name=Study Tools Export','-c','user.email=export@localhost','commit','-m','Preserve current reviewed calculator sources'],cwd=directory,check=True,stdout=subprocess.DEVNULL)
init(web)
sha=subprocess.check_output(['git','rev-parse','HEAD'],cwd=web).decode().strip()
(native/'web-source.json').write_text(json.dumps({'repository':'https://github.com/mohammedalhinaki-cloud/study-tools-web.git','commit':sha},indent=2)+'\n')
(native/'scripts/prepare-web.mjs').write_text('''// Fetch an immutable web revision. Private access uses your existing Git credentials.
import {readFileSync,mkdirSync,cpSync,existsSync,rmSync} from 'node:fs'
import {spawnSync} from 'node:child_process'
import path from 'node:path'
const spec=JSON.parse(readFileSync('web-source.json','utf8'))
if(!/^[a-f0-9]{40}$/.test(spec.commit))throw Error('Pin a full reviewed web commit SHA')
const checkout=path.resolve('build/web-checkout')
function run(cmd,args,cwd){const r=spawnSync(cmd,args,{cwd,stdio:'inherit',shell:process.platform==='win32'});if(r.error)throw r.error;if(r.status)process.exit(r.status)}
mkdirSync('build',{recursive:true})
if(existsSync(checkout))rmSync(checkout,{recursive:true})
run('git',['clone','--no-checkout',spec.repository,checkout],process.cwd())
run('git',['checkout','--detach',spec.commit],checkout)
const npm=process.platform==='win32'?'npm.cmd':'npm'
run(npm,['ci'],checkout)
run(npm,['test'],checkout)
run(npm,['run','build'],checkout)
rmSync('build/web',{recursive:true,force:true})
cpSync(path.join(checkout,'build/web'),'build/web',{recursive:true})
console.log(`Android assets prepared from web revision ${spec.commit}`)
''')
(native/'README.md').write_text('''# Study Tools Android — مستودع خاص
يحتوي Android وAdMob والأيقونات والتوقيع؛ لا يحتوي نسخة ثانية قابلة للتحرير من مصدر الحاسبة.
أنشئ study-tools-android في GitHub بخيار Private وارفع المجلد عبر GitHub Desktop؛ لا تحذف المستودع القديم.
## أول بناء
ثبّت Node 24 وJDK 21 وAndroid SDK 36، وسجّل دخول Git إلى حساب يملك المستودع الخاص للموقع.
نفّذ npm ci ثم npm run android:debug. تُجلب نسخة الموقع المحددة في web-source.json وتُختبر وتُبنى وتُضمّن محلياً.
إذا غيرت اسم مستودع الموقع، حدّث repository في web-source.json.
## التحديثات
عدّل الموقع في مستودعه وارفعه. حدّث commit في web-source.json إلى SHA الكامل للنسخة التي راجعتها.
ارفع APP_VERSION_CODE في android/publisher.properties ثم نفّذ npm run android:release بعد إكمال إعدادات النشر والتوقيع.
احفظ تعديل web-source.json في Git. لا تتغير نسخة التطبيق المثبتة بمجرد نشر الموقع؛ يلزم إصدار Play جديد في هذا التصميم الذي يعمل دون إنترنت.
تغييرات معرّفات AdMob والأيقونات وSDK تحتاج أيضاً إصدار Android جديداً.
## التوقيع والنسخ الاحتياطي
لم يُنشأ مفتاح إنتاج. أنشئ Upload Key محلياً عبر Android Studio، وفعّل Play App Signing.
احفظ ملف المفتاح وكلمات المرور خارج المستودعين: مدير كلمات مرور ونسخة مشفرة في تخزين سحابي ونسخة منفصلة آمنة.
GitHub الخاص ليس مكاناً للمفاتيح. ملفات jks وkeystore وpepk وإعدادات الناشر مستبعدة من Git.
مع Play App Signing، فقدان مفتاح الرفع يمكن عادةً علاجه بطلب إعادة تعيينه؛ فهو مختلف عن مفتاح توقيع التطبيق الذي تديره Google.
ملف pepk حزمة لتصدير مفتاح بشكل مشفر عند الحاجة، وليس مفتاحاً يولّده كل بناء تلقائياً.
راجع docs/play/README.ar.md لباقي إعدادات المتجر. أوامر npm run android:* هنا تجلب الويب من مستودعه بدلاً من تحريره داخل Android.
''')
init(native)
for directory in [web,native]:
    with zipfile.ZipFile(out/(directory.name+'.zip'),'w',zipfile.ZIP_DEFLATED) as archive:
        for file in directory.rglob('*'):
            if file.is_file(): archive.write(file,str(pathlib.Path(directory.name)/file.relative_to(directory)))
print(out)
print('Pinned web commit:',sha)
