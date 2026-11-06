# المرحلة 1 — تحسين DEX وR8 محلياً

الفرع: `fix/play-console-r8-edge-to-edge`. الإصدار بقي 8 (1.0.4). لا رفع إلى GitHub أو Cloudflare أو Play Console، ولا تغيير للتوقيع أو مفاتيحه أو إعدادات الإعلانات أو التصميم.

## سبب المشكلة والتعديلات

كان minifyEnabled معطلاً ولم يكن shrinkResources مفعلاً، مع استخدام proguard-android.txt. أصبحت إعدادات release:

```groovy
minifyEnabled true
shrinkResources true
proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
```

- `android/app/build.gradle`: تفعيل R8 والتحسين وتقليص الموارد في release فقط.
- `android/app/proguard-rules.pro`: الحفاظ على طرق JavascriptInterface بأسمائها، وسمات التعليقات التوضيحية ومعلومات مواقع المصدر؛ تبقى قواعد Capacitor الاستهلاكية سارية، ولم نضيق استثناءاتها أو نضع keep شاملاً لحزم التطبيق.
- `android/app/src/main/res/raw/keep.xml`: الحفاظ على xml/config، لأن Cordova يقرأه بالاسم عبر Resources.getIdentifier؛ لا يكفي الاعتماد على المراجع الثابتة لاكتشافه.
- `scripts/verify-android-r8.py`: فحص DEX الفعلي وطرق الجسر وتعليقات runtime وأسماء إضافات capacitor.plugins.json وتطابق ملفات الويب وmapping المضمّن. لا يقرأ إعدادات توقيع أو مفاتيح خاصة.

## الأوامر والنتائج

```sh
env JAVA_HOME=/workspace/.android-tooling/jdk-21 \
 ANDROID_HOME=/workspace/.android-tooling/sdk \
 ANDROID_SDK_ROOT=/workspace/.android-tooling/sdk \
 ANDROID_USER_HOME=/workspace/.android-tooling/user \
 GRADLE_USER_HOME=/workspace/.android-tooling/gradle \
 ./android/gradlew -p android :app:assembleRelease :app:bundleRelease \
 :app:testReleaseUnitTest :app:lintRelease --no-daemon --console=plain
```

نجح البناء: BUILD SUCCESSFUL، 214 مهمة، في دقيقة و45 ثانية. اختبار Java الموجود حالياً واحد، ونجح دون إخفاقات. هو اختبار نموذجي حسابي، ولا يثبت تشغيل جسر Android فعلياً.

```sh
python3 scripts/verify-android-r8.py \
 --baseline releases/android/CalcES-991-1.0.4-build8-signed.aab \
 --bundle android/app/build/outputs/bundle/release/app-release.aab \
 --mapping android/app/build/outputs/mapping/release/mapping.txt
```

نجح فحص 8 طرق: postMessage وطرق HTTP/Cookies وAppConfiguration والمشاركة. بقيت أسماء إضافتي AdMob وShare المقروءتين انعكاسياً كما هي، واحتُفظ بتعليقات JavaScript/PluginMethod اللازمة.

```sh
/workspace/.android-tooling/sdk/build-tools/36.0.0/aapt2 dump resources \
 android/app/build/outputs/apk/release/app-release.apk
```

تأكد وجود xml/config وfile_paths وbackup_rules وdata_extraction_rules في APK. أظهر configuration.txt قواعد المشروع وقواعد Capacitor الاستهلاكية معاً، واحتوى AAB ملف proguard.map مطابقاً لـmapping.txt.

شُغّل jarsigner -verify على AAB ونجح، وقورنت شهادة keytool -printcert -jarfile مع حزمة البناء 8 السابقة وتطابقت. لم نغيّر إعدادات التوقيع.

## المقارنة المحلية

| القياس | البناء 8 السابق | بناء التحقق المصغّر |
|---|---:|---:|
| عدد ملفات DEX | 2 | 1 |
| حجم DEX غير المضغوط بالبايت | 16414324 | 4930176 |
| حجم AAB بالبايت | 9854569 | 8839746 |

انخفض حجم DEX محلياً بنسبة 69.96%. انخفض AAB بنسبة 10.30%؛ يتضمن AAB الجديد بيانات mapping الخاصة بفك التعتيم، فلا تتطابق نسبة حجمه مع نسبة DEX. حجم APK الجديد 6230102 بايت، ولا توجد مقارنة APK قديم مكافئ في هذا التقرير.

تطابقت ملفات assets وعددها 78 بايتاً بايتاً مع البناء 8 السابق؛ لم تُغيّر ملفات واجهة الحاسبة أو محرك الرياضيات.

Lint: صفر أخطاء و9 تحذيرات، مقابل 10 تحذيرات في التقرير السابق. التحذيرات الباقية تخص إصدارات بعض التبعيات وMobileAdsInitProvider وشكل أيقونات launcher؛ تُركت دون تعديل خارج نطاق هذه المرحلة.

## حدود التحقق والخطوة التالية

- لا تمثل نسبة انخفاض DEX نسبة تقييم Play Console ولا تضمن تجاوز حد 25% في أي فئة من تقريره.
- لا يتوفر emulator ضمن SDK الحالي. تعذر فحص الأجهزة عبر adb لأنه يحاول إنشاء /home/agent/.android على نظام ملفات للقراءة فقط؛ أُعيدت المحاولة مع ANDROID_USER_HOME وANDROID_SDK_HOME ولم تنجح. لذلك لم يُنفّذ اختبار على جهاز أو اختبار connectedAndroidTest، ولا نعد الفحص الساكن بديلاً عنه.
- لا تغييرات Edge-to-Edge في هذه المرحلة، ولا ادعاء بتحسن الذاكرة أو الأداء المقاس على جهاز.
- حُفظت مخرجات هذه المرحلة وmapping والسجلات محلياً في build/review/play-console-stage1. لم تُستبدل حزمة البناء 8 المنشورة، ولا يصلح رقم الإصدار المستخدم هنا لرفع تحديث جديد بنفس الرقم.
- تم تنفيذ الإصلاح المطلوب محلياً ويحتاج إعادة رفع واختبار. ننتظر موافقة المرحلة 2 وتوضيح النص الحرفي لبند «إخفاء مفاتيح فك التشفير» قبل تحديد معناه أو إجراء تعديل خاص به.
