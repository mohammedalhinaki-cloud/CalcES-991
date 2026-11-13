# Huawei AppGallery release profile

The Android project has an AppGallery-specific `appGallery` build type. It keeps the existing package ID (`calces991.calculator`), turns advertising off, removes the optional Capacitor AdMob plugin from the AppGallery bundle, removes Google advertising metadata/permissions, and opens a publisher-configured HTTPS store listing from native rating/share/install actions. The normal Android `debug` and `release` profiles are unchanged.

## Build locally

1. Install JDK 21 and Android SDK 36; set `JAVA_HOME` and `ANDROID_HOME` (or create `android/local.properties`).
2. Copy `android/publisher.properties.example` to the ignored file `android/publisher.properties`.
3. Set the public AppGallery listing URL after AppGallery Connect provides it, the published privacy-policy URL and support email, and the signing inputs:
   - `APP_STORE_URL`
   - `UPLOAD_KEYSTORE_PATH`
   - `UPLOAD_KEY_ALIAS`
   - `UPLOAD_KEYSTORE_PASSWORD`
   - `UPLOAD_KEY_PASSWORD`
4. Leave `ADS_ENABLED=false` for AppGallery. This project has no Huawei Ads Kit integration. Keep the upload keystore and passwords private; do not commit them.
5. Run:

   ```sh
   npm run android:appgallery:check
   npm run android:appgallery
   ```

A successful build writes `build/android/calces-991-appgallery.aab`. The build helper temporarily removes the generated AdMob dependency/plugin registration for this variant, restores those generated files after Gradle exits, and does not change the standard Play-oriented release profile.

## Before submission

- Confirm the AppGallery application/package ID is exactly `calces991.calculator`; changing it creates a different app listing.
- Use a unique, increasing `APP_VERSION_CODE` for each AppGallery upload and retain the same signing key for updates.
- Install and exercise the signed bundle on a physical Huawei/HMS device. Check offline startup, the ad-free layout, the publisher store link, privacy/support links, and system-bar/safe-area layout.
- Complete AppGallery Connect's current privacy, content-rating, store-listing, screenshot, target-API and SDK declarations for the actual release. This repository does not submit the app or provide publisher identity, signing material, a store listing, or store-console declarations.

## Current workspace readiness

The repository does not contain a publisher keystore or a published AppGallery listing URL. This environment also has no JDK or Android SDK configured. Therefore the AppGallery release check and signed AAB build cannot be completed here; the profile and reproducible build steps are prepared, but the artifact must be built after the publisher supplies those inputs in their local environment.
