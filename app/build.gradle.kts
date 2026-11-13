import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.ksp)
}

/**
 * 출시 서명 정보. 저장소에는 절대 넣지 않는다.
 *  - 로컬: 저장소 루트의 keystore.properties (gitignore 됨, docs/release/ANDROID_RELEASE.md 참고)
 *  - CI: 환경변수 LOOIN_KEYSTORE_PATH / LOOIN_KEYSTORE_PASSWORD / LOOIN_KEY_ALIAS / LOOIN_KEY_PASSWORD
 * 둘 다 없으면 release 빌드는 서명되지 않은 상태로 만들어진다(스토어 업로드 불가 → 실수로 디버그 키 업로드 방지).
 */
val keystoreProps = Properties().apply {
    rootProject.file("keystore.properties").takeIf { it.exists() }?.inputStream()?.use { load(it) }
}
fun releaseSecret(key: String, env: String): String? = keystoreProps.getProperty(key) ?: System.getenv(env)
val releaseStoreFile = releaseSecret("storeFile", "LOOIN_KEYSTORE_PATH")

/** 버전: versionName 은 여기서, versionCode 는 CI 가 LOOIN_VERSION_CODE 로 올릴 수 있다(스토어는 매 업로드마다 증가 필요). */
val appVersionName = "1.0.0"
val appVersionCode = System.getenv("LOOIN_VERSION_CODE")?.toIntOrNull() ?: 3

android {
    namespace = "com.looin.finance"
    compileSdk = 35
    buildToolsVersion = "35.0.0"

    defaultConfig {
        applicationId = "com.looin.finance"
        minSdk = 26
        targetSdk = 35
        versionCode = appVersionCode
        versionName = appVersionName
    }

    signingConfigs {
        create("release") {
            if (releaseStoreFile != null) {
                storeFile = file(releaseStoreFile)
                storePassword = releaseSecret("storePassword", "LOOIN_KEYSTORE_PASSWORD")
                keyAlias = releaseSecret("keyAlias", "LOOIN_KEY_ALIAS")
                keyPassword = releaseSecret("keyPassword", "LOOIN_KEY_PASSWORD")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (releaseStoreFile != null) signingConfigs.getByName("release") else null
            ndk { debugSymbolLevel = "NONE" } // 네이티브 코드 없음
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures {
        compose = true
        buildConfig = true
    }
    // 마이그레이션 테스트(Robolectric)가 내보낸 스키마를 읽도록 debug assets 에만 포함(릴리스 제외)
    sourceSets.getByName("debug").assets.srcDir("$projectDir/schemas")
    testOptions {
        unitTests.isIncludeAndroidResources = true
        // Compose UI 테스트(ui-test-manifest)와 마이그레이션 테스트(스키마 assets)는 debug 전용이라 debug 변형에서만 실행
        unitTests.all { test ->
            if (test.name.contains("Release")) test.exclude("**/ui/**", "**/MigrationTest*")
        }
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

ksp {
    arg("room.schemaLocation", "$projectDir/schemas")
}

dependencies {
    implementation(project(":core"))

    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(libs.androidx.lifecycle.runtime.compose)
    implementation(libs.androidx.lifecycle.viewmodel.compose)
    implementation(libs.androidx.navigation.compose)

    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons)
    debugImplementation(libs.compose.ui.tooling)

    implementation(libs.room.runtime)
    implementation(libs.room.ktx)
    ksp(libs.room.compiler)

    testImplementation(libs.junit)
    testImplementation(libs.robolectric)
    testImplementation(libs.androidx.test.core)
    testImplementation(libs.kotlinx.coroutines.test)
    testImplementation(libs.room.testing)
    testImplementation(platform(libs.compose.bom))
    testImplementation(libs.compose.ui.test.junit4)
    debugImplementation(libs.compose.ui.test.manifest)
}
