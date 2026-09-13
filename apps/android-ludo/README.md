# Ludo Arena Android App

This folder contains a standalone Android project that packages a Ludo-style game into an APK using a WebView and bundled local assets.

## Build APK

```bash
cd apps/android-ludo
./gradlew assembleDebug
```

Expected output (debug APK):

`app/build/outputs/apk/debug/app-debug.apk`

## Notes
- The game UI is loaded from `app/src/main/assets/index.html` (offline/local).
- The app entrypoint is `MainActivity.kt`.
