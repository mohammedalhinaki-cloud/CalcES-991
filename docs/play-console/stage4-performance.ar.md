# المرحلة 4 — الذاكرة والأداء

الفرع: `fix/play-console-r8-edge-to-edge`. بدأ العمل بحالة Git نظيفة بعد اعتماد المرحلة السابقة. لا نشر أو رفع، ولا تغيير للتوقيع أو الأسرار أو الاعتماديات أو إصدار 8 (1.0.4). المرحلة 2 مؤجلة.

## الفحص والتغييرات

- `src/components/display/MathEditor.tsx`: تخزين مؤقت لمواضع مجموعات التكامل بدل إعادة مسح جميع مواضع MathLive مع كل حركة مؤشر. المفتاح يجمع LaTeX وطول المواضع؛ التعديل يبطل النتيجة، وحركة المؤشر وحدها تعيد استخدامها. WeakMap يحتفظ بإزاحات فقط، دون عقد DOM أو مستطيلات، وبنسخة واحدة من التعبير لكل محرر حي. لا تغيير للحساب أو التنسيق.
- `src/native/androidAds.ts`: إدخال تسجيل المستمعين داخل مسار التنظيف؛ فشل التسجيل الثاني أو مراقب DOM أو مستمع الاتجاه ينظف الموارد التي جرى تخصيصها والجلسة. Promise.allSettled يتيح محاولة إزالة كل مستمع حتى لو رفضت إزالة آخر. المراقب والمستمع الناجحان يبقيان singleton طوال عمر الصفحة كما كانا.
- `src/native/bannerSession.ts`: تجاهل إشعار الحجب المتكرر بالقيمة نفسها وعدم إرسال أوامر ظهور بعد التخلص من الجلسة، لتقليل استدعاءات الجسر الأصلية.

محرك worker القائم ينهي المهام الملغاة وينظف المؤقتات؛ أبقينا إعادة استخدام العامل بعد نجاح الحساب لتفادي تكلفة إعادة تحميل المحرك دون قياس. أضيف اختبار لإثبات إعادة الاستخدام والإنهاء عند إزالة المكون. لم يتغير المحرك الرياضي أو شكل الواجهة أو إعداد تفعيل الإعلان. الإصدار الحالي المعطّل للإعلانات لا يخصص مستمعي SDK؛ إصلاح مسارات الفشل يفيد الاختبار والإعلانات عند تفعيلها لاحقاً ولا يمثل ادعاءً بخفض ذاكرة إصدار الإعلانات المعطّل.

## الاختبارات والقياس

أضيفت خمسة اختبارات تنظيف فشل تهيئة الإعلان، واختبار أوامر الظهور المتكررة، واختبار عمر العامل، واختبار متصفح لتحريك المؤشر ثم تعديل تكاملين وحساب 6.5.

في نفس Chromium وبنفس التعبير ذي 61 موضعاً، أدت 20 حركة يمين إلى 1260 استدعاء getElementInfo قبل التعديل و20 بعده. هذا عدّ لاستدعاءات DOM، وليس قياس زمن الإطار أو RSS/PSS أو درجة Play Console. ما زالت قراءة LaTeX تحدث للتحقق من صلاحية التخزين؛ لم ندّع إزالة جميع الأعمال لكل حركة.

الأوامر:

```sh
node node_modules/vitest/vitest.mjs run
node /workspace/.study-tools-tooling/node_modules/npm/bin/npm-cli.js run build
node node_modules/@capacitor/cli/bin/capacitor sync android
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node node_modules/@playwright/test/cli.js test --config=playwright.production.config.ts --workers=1
env JAVA_HOME=/workspace/.android-tooling/jdk-21 ANDROID_HOME=/workspace/.android-tooling/sdk ANDROID_SDK_ROOT=/workspace/.android-tooling/sdk ANDROID_USER_HOME=/workspace/.android-tooling/user GRADLE_USER_HOME=/workspace/.android-tooling/gradle ./android/gradlew -p android :app:assembleRelease :app:bundleRelease :app:testReleaseUnitTest :app:lintRelease --no-daemon --console=plain
python3 scripts/verify-android-r8.py --baseline releases/android/CalcES-991-1.0.4-build8-signed.aab --bundle android/app/build/outputs/bundle/release/app-release.aab --mapping android/app/build/outputs/mapping/release/mapping.txt --expected-web build/web
```

فحص Vitest: 191 اختباراً في 16 ملفاً ناجحاً. بناء TypeScript/Vite ونسخ Capacitor نجحا. بناء Android نجح في 33 ثانية (214 مهمة، 44 منفذة و170 محدثة). مهمة testReleaseUnitTest كانت UP-TO-DATE وتقريرها القائم يبيّن نجاح اختبار Java النموذجي الواحد؛ لا نعتمد عليه لإثبات أداء Android. Lint: صفر أخطاء و9 تحذيرات. نتيجة المتصفح النهائية أدناه.

أضيف خيار اختياري `--expected-web` لفاحص الحزمة لأن أصول الويب تغيرت عمداً في هذه المرحلة: يطابق ملفات public مع البناء الجديد بايتاً ببايت، ويتحقق من ثبات أصول Capacitor خارج public. ملفا cordova.js وcordova_plugins.js المولدان أثناء sync مستثنيان من مقارنة Vite فقط، ويجب أن يطابقا البناء السابق بايتاً ببايت. دون هذا الخيار يبقى فحص التطابق الكامل السابق. فحوص mapping وطرق الجسر وأسماء الإضافات الانعكاسية تبقى إلزامية.

## حدود التحقق

لا جهاز Android أو محاكي متاح، ولذلك لم يُقَس استهلاك heap أو PSS أو بدء التشغيل أو الإطارات على جهاز حقيقي. يلزم Android Studio Profiler/Perfetto على أجهزة فعلية، مع مسائل متكررة ومعقدة والتبديل بين الخلفية والمقدمة والإعلانات التجريبية. لا يمكن استنتاج تحسن نسب Play Console من هذه القياسات. لم تُجرَ تغييرات في مكتبات Capacitor/Ads أو ترقيعات تخمينية.

تم تنفيذ الإصلاح المطلوب محلياً ويحتاج إعادة رفع واختبار. لا تبدأ المرحلة 5 قبل موافقة المستخدم.

فحص الحزمة نجح: 73 ملف ويب مطابقاً للبناء الجديد، و70 ملف assets مطابقاً للبناء السابق، و8 طرق جسر سليمة، وmapping المضمّن مطابق للملف الخارجي. DEX بقي ملفاً واحداً بحجم 4,932,400 بايت كما في المرحلة 3؛ لا تحسن DEX إضافياً من تغييرات JavaScript. نجح jarsigner -verify وشهادة التوقيع تطابق إصدار البناء 8 السابق. المخرجات والسجلات المحلية في build/review/play-console-stage4، ولم تُستبدل ملفات releases أو تُرفع أي حزمة.

نجحت اختبارات المتصفح الـ75 على بناء الإنتاج في 2.1 دقيقة، ومنها اختبار التخزين المؤقت الجديد، والتكاملان، والتحرير باللمس، والأزرار والأوضاع، والمساحات الآمنة المحاكية. هذه اختبارات Chromium وليست اختبارات جهاز Android.
