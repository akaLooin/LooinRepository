import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
}

// 재정 계산 공용 모듈 (Kotlin Multiplatform).
//  - commonMain: 모든 플랫폼 공용 코드. kotlinx-datetime 외 플랫폼 API(java.*, Foundation 등) 금지
//  - jvm: Android 앱과 PC(데스크톱) 앱이 사용
//  - iOS: iosArm64(기기) / iosSimulatorArm64 / iosX64. Kotlin/Native iOS 빌드는 macOS(Xcode)에서만 가능하며,
//    다른 OS 에서는 자동으로 건너뛴다(gradle.properties 의 kotlin.native.ignoreDisabledTargets).
kotlin {
    jvm {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }
    listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework { baseName = "LooinCore" }
    }

    sourceSets {
        commonMain.dependencies {
            api(libs.kotlinx.datetime)
        }
        commonTest.dependencies {
            implementation(libs.kotlin.test)
        }
        jvmTest.dependencies {
            implementation(libs.junit)
        }
    }
}
