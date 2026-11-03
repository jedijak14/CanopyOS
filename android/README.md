# Fern for Android

This is a native Android package for the existing CanopyOS Fern assistant. It loads the repository's `index.html` and `vendor/` assets in a WebView; it is not a replacement application or a hosted-service wrapper.

## What it does

- Declares Android's `VoiceInteractionService` and session service so Android can list Fern as a digital assistant.
- Requests the Android assistant role when supported. If the OS does not permit an app to request the role directly, it opens the system's assistant settings. The user always makes the final selection.
- Opens a focused Fern assistant surface from the system assistant gesture, requests microphone permission when needed, and uses Android's available speech-recognition service for incoming speech.
- Speaks replies with a dedicated offline Kokoro neural voice (speaker `af_sarah`) through sherpa-onnx and `AudioTrack`. It does **not** call Android `TextToSpeech` or use an installed phone TTS voice. No phone-voice fallback is present.
- Downloads the compressed INT8 English voice model from the official sherpa-onnx GitHub release on first preparation (about 103 MB); verifies a pinned SHA-256 before safely unpacking it. The model remains in app-private storage and speech synthesis works offline after installation. A network connection is required for the initial download.
- Keeps CanopyOS profile/session data in this WebView's local storage. Canopy ID is not a remote identity provider, and the Android assistant role does not grant server-side access control.

The Android speech-recognition provider is selected by the operating system and may use its own network service. Fern's *spoken output* is the on-device Kokoro model, not the phone's TTS voice. Existing open-ended Fern prompts continue to use the CanopyOS Pollinations integration when available.

## Build

Requirements: JDK 17, Android SDK platform/build-tools 35, Gradle 8.9, and internet access to Google Maven, Maven Central, and GitHub releases.

```bash
# Run from the repository root
bash android/download-android-deps.sh
gradle -p android assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. The sherpa-onnx AAR is pinned by version and SHA-256 and intentionally not committed. The `Build Fern Android APK` GitHub Actions workflow performs the same setup and uploads a 14-day debug APK artifact when manually dispatched or when the Android app/source files change on this session branch.

A debug APK is signed with the standard debug key and is intended for testing/sideloading. A release-ready store APK needs a separate release signing key and Play-policy review; no signing credentials are included here.

## Licensing

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and [`LICENSES/`](LICENSES/). In particular, sherpa-onnx's static Android runtime includes GPL-3.0-covered components, so the combined APK is distributed under GPL-3.0. The upstream corresponding source and exact version are identified in the notices.
