# خطة بناء CalcES 991

## Architecture

التطبيق React/Vite ثابت، ومخرج البناء هو `site/` حتى يبقى النشر على Cloudflare Pages بسيطاً. الواجهة لا تنفّذ الحسابات بنفسها؛ كل تعبير يمر عبر `src/calculatorEngine.js`، ثم يعود كقيمة ونسخة Natural Display.

- `src/App.jsx`: الحالة التفاعلية، لوحة الأزرار، مؤشرات DEG/MATH/SHIFT، الحواران MODE وSETUP، سجل العمليات، Ans والذاكرة، ودعم لوحة المفاتيح.
- `src/calculatorEngine.js`: تهيئة math.js بنظام Fraction، تطبيع رموز Casio مثل `× ÷ − π √`، دوال الزوايا، التقييم، تنسيق النتائج، والتحويل العشري/الكسر.
- `src/index.css`: طبقة Tailwind الأساسية مع CSS محدود لتأثير الضغط والـ cursor والـ scrollbar الخاص بالشاشة.
- `src/main.jsx`: نقطة تشغيل React وتحميل KaTeX CSS.
- `vite.config.js`: React + Tailwind Vite plugins، وإخراج `site/`.
- `public/manus-routes.json`: إعلان المسار الرئيسي للمنصة.

## Natural Display

يحوّل المحرك تعبير المستخدم إلى AST عبر `math.parse()` ثم يستدعي `toTex()`، ويعرض الناتج بواسطة KaTeX. بهذه الطريقة تبقى الكسور والجذور والأسس بصيغة كتابية، بينما يبقى الحساب منفصلاً وآمناً عن DOM و`eval`.

## Design

الحركة البصرية هي محاكاة جهاز ES PLUS: جسم رمادي مطفي، شاشة LCD أخضر باهت، monospace في الشاشة، أزرار رمادية بثلاثة أبعاد، لون برتقالي لـ SHIFT و`=`, وأحمر داكن للحالات الخطرة. لا توجد صور أو أصول خارجية؛ KaTeX وmath.js تبعيات برمجية فقط.

## مراحل التنفيذ

1. واجهة جسم الآلة والشاشة الطبيعية ولوحة مفاتيح ES PLUS.
2. ربط math.js مع COMP، الزوايا DEG/RAD/GRA، Ans، M+، سجل العمليات، S⇔D، وSHIFT.
3. إضافة قوائم MODE وSETUP مع فصل واضح لنطاقات CMPLX وSTAT وBASE-N وEQN وMATRIX وTABLE وVECTOR.
4. بناء `site/` وإتاحته كأصل Static Pages.
