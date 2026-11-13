import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.library)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

// 공용 화면 (Compose Multiplatform): Android 앱과 PC(데스크톱) 앱이 같은 화면 코드를 쓴다. iOS 는 4단계에서 추가.
kotlin {
    androidTarget {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }
    jvm {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }

    sourceSets {
        commonMain.dependencies {
            api(project(":shared"))
            api(compose.runtime)
            api(compose.foundation)
            api(compose.ui)
            api(compose.material3)
            implementation(compose.materialIconsExtended)
            api(libs.cmp.lifecycle.viewmodel.compose)
            api(libs.cmp.lifecycle.runtime.compose)
            implementation(libs.cmp.navigation.compose)
        }
        androidMain.dependencies {
            implementation(libs.androidx.activity.compose)
        }
        jvmMain.dependencies {
            implementation(compose.desktop.common)
            implementation(libs.kotlinx.coroutines.swing)
        }
        jvmTest.dependencies {
            implementation(compose.desktop.currentOs)
            @OptIn(org.jetbrains.compose.ExperimentalComposeLibrary::class)
            implementation(compose.uiTest)
            implementation(libs.kotlin.test)
            implementation(libs.junit)
        }
    }
}

// 글꼴(Pretendard)은 Android 리소스 폴더 하나만 두고, PC 는 같은 폴더를 클래스패스 리소스로 쓴다(파일 중복 없음).
kotlin.sourceSets.getByName("jvmMain").resources.srcDir("src/androidMain/res")

android {
    namespace = "com.looin.finance.ui"
    compileSdk = 36
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

tasks.matching { it.name == "test" }.configureEach { dependsOn("jvmTest") }
