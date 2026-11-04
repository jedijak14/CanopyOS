import org.gradle.api.tasks.Sync

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

val repoRoot = rootProject.projectDir.parentFile
val generatedWebAssets = layout.buildDirectory.dir("generated/canopyWebAssets")

android {
    namespace = "com.canopyos.fern"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.canopyos.fern"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"
        ndk { abiFilters += listOf("arm64-v8a", "armeabi-v7a", "x86_64") }
    }

    sourceSets["main"].assets.srcDir(generatedWebAssets)
    packaging {
        jniLibs.useLegacyPackaging = true
        resources.excludes += setOf("META-INF/DEPENDENCIES", "META-INF/INDEX.LIST")
    }
    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

val syncCanopyAssets by tasks.registering(Sync::class) {
    from(repoRoot.resolve("index.html"))
    from(repoRoot.resolve("macOS Ventura 13.0 'Hello' Intro Screen - Macintosh Weekly (1080p, h264).mp4"))
    from(repoRoot.resolve("vendor")) { into("vendor") }
    from(repoRoot.resolve("locales")) { into("locales") }
    from(repoRoot.resolve("apps")) { into("apps") }
    from(repoRoot.resolve("assets")) { into("assets") }
    from(rootProject.projectDir.resolve("LICENSES")) { into("licenses") }
    from(rootProject.projectDir.resolve("THIRD_PARTY_NOTICES.md"))
    into(generatedWebAssets)
}
tasks.named("preBuild").configure { dependsOn(syncCanopyAssets) }

dependencies {
    implementation(files("libs/sherpa-onnx-static-link-onnxruntime-1.13.8.aar"))
    implementation("androidx.webkit:webkit:1.12.1")
    implementation("org.apache.commons:commons-compress:1.27.1")
    implementation("commons-io:commons-io:2.18.0")
}
