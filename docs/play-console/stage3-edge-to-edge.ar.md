# المرحلة 3 — Edge-to-Edge وAndroid 15

الفرع: `fix/play-console-r8-edge-to-edge`. لا رفع أو نشر. لا تغيير للتوقيع أو الأسرار أو رقم الإصدار أو الاعتماديات أو معالجة Insets في Capacitor.

## تأكيد المرحلة 2 وتأجيلها

فُحص mapping الناتج من المرحلة 1: 5770 صنفاً mapped، منها 5558 تغيّر اسمها. مثال فعلي: com.getcapacitor.MessageHandler أصبح com.getcapacitor.z، مع بقاء postMessage وJavascriptInterface وفق فحص الحزمة. ملف mapping موجود ومضمّن داخل AAB. هذه أدلة تعتيم فعلية، وليست قياساً لبند Play Console الغامض أو تشفيراً للمفاتيح. المرحلة 2 مؤجلة؛ لا قواعد R8 أو استثناءات جديدة خاصة بها.

## الفحص والتعديل

التطبيق يستهدف SDK 36، والنشاط الرئيسي غير عائم. Android 15+ يفرض Edge-to-Edge في هذه الحالة، ولم نجد opt-out في ثيمات التطبيق أو Manifest. MainActivity كان بلا تفعيل صريح للتوافق على الأنظمة الأقدم.

أضيف إلى MainActivity بعد super.onCreate:

```java
if (Build.VERSION.SDK_INT < Build.VERSION_CODES.VANILLA_ICE_CREAM) {
    EdgeToEdge.enable(
        this,
        SystemBarStyle.dark(Color.TRANSPARENT),
        SystemBarStyle.dark(Color.TRANSPARENT)
    );
}
ViewCompat.requestApplyInsets(getWindow().getDecorView());
```

الرموز الفاتحة للأشرطة متوافقة مع SystemBars.style=DARK ومع خلفية الحاسبة الداكنة. تستفيد الأنظمة 24–34 من واجهة AndroidX القائمة. على Android 15+ نعتمد الفرض النظامي الحالي ولا نستدعي مسار EdgeToEdgeApi29 الخاص بإعداد ألوان الأشرطة من النشاط.

اختير هذا الشرط بعد فحص bytecode لـActivity 1.11.0: EdgeToEdge يستخدم EdgeToEdgeApi30 حتى على Android 15، وهو يرث setUp من Api29 الذي يستدعي setStatusBarColor وsetNavigationBarColor وsetStatusBarContrastEnforced. أكدت بيانات SDK 36 أن هذه الواجهات متوقفة منذ API 35. يبقى استخدامها للتوافق على الإصدارات الأقدم ضمن AndroidX، دون كتابة استدعاءات متوقفة مباشرة في التطبيق أو ترقيع المكتبة.

## منع تكرار Insets

- بقيت إعدادات capacitor.config.ts: insetsHandling=css وviewport-fit=cover كما هي.
- SystemBars في Capacitor 8.5.3 يملك listener على decor view؛ لم يُستبدل أو يُضاف إليه listener آخر.
- على WebView الأحدث يمكن تمرير Insets إلى CSS؛ وعلى الأقدم يستخدم Capacitor padding أصلياً ويصفّر Insets المرسلة إلى CSS. احتُفظ بالمسارين كما هما.
- لم يُضف setPadding أو fitsSystemWindows أو استهلاك WindowInsets إلى كود التطبيق، ولم تتغير CSS أو مواضع الأزرار.
- يأتي requestApplyInsets بعد التفعيل وبعد تهيئة BridgeActivity، لإعادة الحساب عبر مستمع Capacitor الموجود.

## جرد الواجهات المحتملة في الاعتماديات

أضيف scripts/audit-android-window-apis.py لفحص constant-pool في JARs المقروءة دون تعديلها. فُحصت 15 حزمة/وحدة محلولة محلياً، ووجدت مراجع متعلقة بالنوافذ في 30 صنفاً. الجرد يثبت وجود مرجع في المكتبة، ولا يثبت تشغيله في جهاز معين أو وجوده بعد إزالة الكود غير المستخدم بواسطة R8. ليست كل واجهة في الجرد متوقفة؛ طوبقت الحالات المتوقفة مع data/api-versions.xml في SDK 36.

| المصدر | أمثلة مرصودة |
|---|---|
| Activity 1.11.0 — EdgeToEdgeApi23/26/29 | setStatusBarColor وsetNavigationBarColor، وsetStatusBarContrastEnforced في Api29 |
| Core 1.17.0 — WindowCompat/WindowInsetsControllerCompat | setDecorFitsSystemWindows وsetSystemUiVisibility/getSystemUiVisibility في مسارات التوافق |
| Core SplashScreen 1.2.0 — SplashScreen.Impl31 | setDecorFitsSystemWindows وواجهات ألوان الأشرطة |
| AppCompat 1.7.1 — MenuPopupHelper | getDefaultDisplay/getRealSize، وهما من واجهات العرض القديمة |
| Google Ads 25.4.0 — overlay.zzm ومسارات داخلية | setSystemUiVisibility وواجهات Display/WindowManager القديمة |
| AdMob BannerExecutor | getDefaultDisplay/getRealMetrics؛ المستمع الخاص بالبانر يبقى على view التابعة له ولا يستبدل decor listener |

لا استدعاءات مباشرة لهذه الواجهات المتوقفة في MainActivity أو AppConfigurationPlugin. بعض مسارات المكتبات قد تبقى في DEX أو تعمل عبر التوافق؛ لا يمكن الجزم بزوال تحذير Play دون قائمته وإعادة الفحص بعد الرفع. لم تُحدّث أو تُرقّع أي اعتمادية رئيسية.

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

BUILD SUCCESSFUL في دقيقة و44 ثانية، 214 مهمة. نجح اختبار Java النموذجي الواحد. Lint: صفر أخطاء و9 تحذيرات كما في المرحلة 1، دون تحذير جديد من التعديل.

```sh
node node_modules/typescript/bin/tsc --noEmit
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
 node node_modules/@playwright/test/cli.js test \
 --config=playwright.production.config.ts tests/e2e/native-insets.spec.ts \
 tests/e2e/android-slot.spec.ts tests/e2e/viewport.spec.ts --workers=1
```

نجح فحص TypeScript و9 اختبارات متصفح. الاختبارات الجديدة الستة تحاكي: إيماءات، أزرار نظام ثلاثية، نتوء أفقي، viewport مصغّراً بسبب لوحة المفاتيح، ومسار native padding بمتغيرات CSS صفرية في الاتجاهين. تحققت من مقدار padding مرة واحدة ومن ظهور الأزرار الخمسين ونتيجة تكاملين 2.5 دون تمرير عام. روجعت صور الوضع الرأسي والأفقي المحاكية بصرياً. هذه ليست لقطات Android فعلي أو اختباراً لنشاط Java.

شُغّل audit-android-window-apis.py على JARs الإصدارات الحالية: Activity/Core/Core KTX/AppCompat/AppCompat Resources/Fragment/WebKit/CoordinatorLayout/SplashScreen وGoogle Ads API/Ads/UMP ووحدات Capacitor/AdMob/Share. شُغّل javap -c -p على أصناف EdgeToEdge وWindowCompat، وقُرئ api-versions.xml لتأكيد إصدارات التوقف. وحُفظ الجرد في window-api-inventory.json.

```sh
python3 scripts/verify-android-r8.py \
 --baseline releases/android/CalcES-991-1.0.4-build8-signed.aab \
 --bundle android/app/build/outputs/bundle/release/app-release.aab \
 --mapping android/app/build/outputs/mapping/release/mapping.txt
```

نجح الفحص: 8 طرق جسر سليمة، أسماء الإضافات الانعكاسية ثابتة، و78 ملف assets مطابقاً للبناء السابق. mapping الحالي يبيّن 5567 اسماً متغيراً من 5779 صنفاً؛ لم تتغير إعدادات R8. نجح jarsigner -verify، وتطابقت شهادة التوقيع مع حزمة البناء 8 السابقة.

فُحص MainActivity.class بواسطة javap: يوجد شرط SDK_INT < 35 قبل EdgeToEdge.enable، ويأتي requestApplyInsets بعد الشرط. هذا دليل bytecode مترجم، وليس اختبار تشغيل على الجهاز.

## ما يحتاج اختبار Android فعلياً

لا emulator مثبت ولا /dev/kvm متاح في هذه البيئة. بقي تعذر adb المذكور في المرحلة 1؛ لذلك لم يُنفّذ connectedAndroidTest أو اختبار Android 15/الإصدارات الأقدم فعلياً. يلزم التحقق من:

- API 24/28/29/34 للتفعيل الخلفي، وAPI 35/36 للفرض النظامي.
- الإيماءات والأزرار الثلاثة، الاتجاهين والنتوء وتقسيم الشاشة.
- تباين رموز الأشرطة، بدء التشغيل/Splash والعودة من الخلفية.
- WebView أقدم من 140 وأحدث منه، وفتح لوحة المفاتيح وإغلاقها، والبانر عند اختباره بإعلانات تجريبية.

المخرجات المحلية والسجلات والجرد ولقطات المحاكاة محفوظة في build/review/play-console-stage3. الإصدار بقي 8 (1.0.4) للتحقق المحلي، ولم تُستبدل حزمة الإصدار المنشورة. المرحلة 4 لم تبدأ.

تم تنفيذ الإصلاح المطلوب محلياً ويحتاج إعادة رفع واختبار؛ لا ادعاء بأن ملاحظات Google Play حُلّت نهائياً.
