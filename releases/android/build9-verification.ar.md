# الإصدار 1.0.5 — البناء 9

- الحزمة: calces991.calculator.
- الملف: CalcES-991-1.0.5-build9-signed.aab؛ الحجم: 8842893 بايت.
- SHA256: f05f3a2aeb8f782c89103bdafa7c95cd15f7bf182c0d749e8c71765c49e44d3c.
- نجح bundleRelease وlintRelease؛ صفر أخطاء و9 تحذيرات قائمة.
- نجح فحص R8 وmapping وطرق الجسر وأصول الويب، وjarsigner -verify؛ شهادة التوقيع تطابق البناء 8.
- يحتوي إصلاحات مراحل Google Play المحلية. المصدر اجتاز 191 اختبار وحدة و75 اختبار متصفح، دون تعديل وظيفي لاحق؛ التغيير الجديد هو رقم الإصدار فقط.
- ملف mapping لهذا البناء محفوظ محلياً في build/review/play-console-stage5/build9-mapping.txt ومضمّن داخل AAB.
- إعدادات التوقيع والإعلانات لم تتغير. لم تختبر الحزمة على جهاز أندرويد فعلي ولم ترفع إلى المتجر.
- تم تنفيذ الإصلاح المطلوب محلياً ويحتاج إعادة رفع واختبار.

## تصحيح الحزمة

الملف السابق بهذا الاسم كان يحمل فعلياً versionCode=8 وversionName=1.0.4 بسبب override في publisher.properties. أعيد البناء بعد تصحيح إعدادات الإصدار وتمرير -PAPP_VERSION_CODE=9 -PAPP_VERSION_NAME=1.0.5 صراحة. fallback في publisher.gradle أصبح يعتمد على إعداد app/build.gradle بدلاً من أرقام قديمة. لم تتغير إعدادات التوقيع أو أسراره.

أضيف scripts/verify-aab-version.py لقراءة Manifest protobuf من داخل AAB والتحقق من package وversionCode وversionName؛ اختُبر أنه يرفض الملف السابق ذي الرمز 8.

نجح الفحص المباشر للحزمة المصححة: package=calces991.calculator، versionCode=9، versionName=1.0.5.
