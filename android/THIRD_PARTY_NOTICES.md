# Android package third-party notices

The Android APK combines CanopyOS/Fern with the following components:

- **sherpa-onnx Android runtime 1.13.8**, downloaded from the official `k2-fsa/sherpa-onnx` GitHub release by `download-android-deps.sh`. It contains ONNX Runtime and the eSpeak-NG phonemizer. The statically linked Android runtime includes GPL-3.0-covered components, so the combined APK is distributed under GPL-3.0. The corresponding CanopyOS/Fern source is this repository; the upstream runtime source and release are at https://github.com/k2-fsa/sherpa-onnx/tree/v1.13.8.
- **Kokoro English v0.19 INT8 voice model**, downloaded on-device from the official sherpa-onnx model release. The model weights are Apache-2.0; model and runtime provenance is documented at https://k2-fsa.github.io/sherpa/onnx/tts/all/English/kokoro-en-v0_19.html. It is not bundled in the APK.
- **Apache Commons Compress 1.27.1**, used only to unpack the on-device voice model; Apache-2.0.
- **AndroidX WebKit**, Apache-2.0.

Full GPL-3.0-only and Apache-2.0 license texts are included in `android/LICENSES/`. This repository's root `LICENSE` remains the license for the original CanopyOS source tree; the combined Android binary carries the GPL-3.0 obligations described above.
