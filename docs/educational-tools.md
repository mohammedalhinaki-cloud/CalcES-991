# Offline educational tools

The app now includes Calculator, Equations, Converter and Constants navigation in Arabic and English. The calculator stays mounted when switching sections, preserving its expression, cursor, history and mode. Each tool retains its in-session form state. The tool page scrolls independently on smaller screens; the calculator continues to fit the viewport with the navigation present.

## Implementation

- `src/components/education/EducationHub.tsx`: navigation, accessible labelled forms, worked solutions, converter, searchable constants and clipboard/calculator actions.
- `src/education/tools.ts`: pure local BigNumber quadratic calculations, conversion factors/temperature transforms and scientific reference data.
- `CalculatorProvider.loadEducationalValue`: switches to COMP and replaces the current expression with a selected constant, preserving scientific notation and calculator history. Inserting a constant intentionally replaces the current expression, including when the calculator was off.
- Existing math.js LU solver supplies the optional 2×2 linear system, including residual checking. No external APIs or new dependencies.

Quadratic output includes coefficients, discriminant with substitution, root classification, quadratic formula with substitution, and real or conjugate complex roots. A zero leading coefficient is rejected with an inline explanation. A stable algebraic rearrangement computes distinct real roots to reduce cancellation. Decimal arithmetic uses the existing math.js 64-digit instance; displayed values are rounded to 16 significant digits, not symbolic exact answers.

Conversions cover length, mass, temperature, area, volume, speed and time. Temperature uses affine transforms and rejects below absolute zero. US and Imperial gallons are separate. Mass is distinct from force. Decimal and scientific notation input are accepted; expressions are deliberately rejected in coefficient/conversion forms.

Constants include c, h, Nₐ, G, e, k, R, F, electron/proton masses, ε₀ and standard gravity. SI defining values are marked exact; rounded measurements are marked accordingly. Reference basis: SI defining constants and CODATA 2022 recommended values. “Use in calculator” inserts only the numeric value; units remain reference information. Clipboard availability depends on browser permissions; a readable fallback explains manual selection if copying fails.

## Offline and testing

All code/data is bundled. The existing build service worker precaches the generated assets; a website needs one successful online load/install before an offline reload. Android embeds web assets when `npm run android:sync` is run for its next build. No Android package or live website is published by this change.

```sh
npm test
npm run build
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium node node_modules/@playwright/test/cli.js test --config=playwright.production.config.ts --workers=1
```

Unit coverage includes real/repeated/complex roots, ill-scaled coefficients, invalid data, known conversion answers, all-unit round trips, absolute zero and reference records. Browser coverage includes English/Arabic forms, live conversions, constant insertion with notation preservation, offline reload and phone/tablet viewport checks, alongside existing calculator regression tests.

## Suggested store description addition

**English:** More than a scientific calculator: explore quadratic equations with step-by-step solutions and real or complex roots, solve two-variable linear systems, instantly convert units across seven categories, and browse 12 scientific constants. Copy reference values or use them directly in the calculator. Supports Arabic and English and works offline.

**العربية:** أكثر من حاسبة علمية: تعلّم حل المعادلات التربيعية خطوة بخطوة مع الجذور الحقيقية والمركبة، وحل أنظمة خطية بمجهولين، وحوّل الوحدات فورياً ضمن سبع فئات، واستعرض 12 ثابتاً علمياً. انسخ القيم المرجعية أو استخدمها مباشرة في الحاسبة. يدعم العربية والإنجليزية ويعمل دون إنترنت.

Store acceptance remains the store reviewer's decision; these additions do not guarantee approval.

## Verification results

- Production build and TypeScript check passed.
- 209 unit tests across 17 files passed.
- 82 production browser tests passed (1.9 minutes), including all existing calculator regressions and seven educational-tool flows.
- Reviewed phone and tablet screenshots of the equation and constants screens.
- Preserved the existing 44px calculator-key height check at 390×844. Updated the old keyboard-bottom assertion to account for the new bottom navigation; keyboard keys now end immediately above that navigation.
- During testing, fixed explicit select labelling and adjusted portrait LCD/toolbar/reserved-space proportions so fraction touch targets remain unobstructed. The keypad's functions, ordering and colors were not changed.
- Local evidence is saved in `build/review/education/`. Browser geometry tests simulate native banner space; no Android-device run or store upload was performed.
