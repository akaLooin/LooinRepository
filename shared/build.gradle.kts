import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.library)
    alias(libs.plugins.ksp)
    alias(libs.plugins.room)
    alias(libs.plugins.kotlin.serialization)
}

// 공용 데이터 계층 (Room KMP): 엔티티·DAO·저장소·백업.
//  - android: OS 내장 SQLite (기존 사용자 DB 그대로, 네이티브 라이브러리 추가 없음)
//  - jvm(PC)·iOS: 번들 SQLite 드라이버
kotlin {
    // 아래 sqliteTest 처럼 dependsOn 을 직접 쓰면 기본 계층(iosMain·iosTest 묶음)이 자동 적용되지 않아
    // iosMain/iosTest 가 어떤 타깃에도 연결되지 않는다. 명시적으로 적용한다.
    applyDefaultHierarchyTemplate()
    androidTarget {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }
    jvm {
        compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
    }
    listOf(iosX64(), iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework { baseName = "LooinShared"; isStatic = true }
    }

    sourceSets {
        commonMain.dependencies {
            api(project(":core"))
            api(libs.room.runtime)
            implementation(libs.kotlinx.serialization.json)
            api(libs.kotlinx.coroutines.core)
        }
        // 번들 SQLite 는 PC·iOS 에만 (Android 는 OS 내장 SQLite → APK 에 네이티브 라이브러리 추가 없음)
        jvmMain.dependencies { implementation(libs.sqlite.bundled) }
        iosMain.dependencies { implementation(libs.sqlite.bundled) }
        // 실제 SQLite 로 저장소를 검사하는 테스트: PC(JVM)와 iOS 에서 실행. Android 는 app 모듈의 Robolectric 테스트가 담당.
        val sqliteTest by creating {
            dependsOn(commonTest.get())
            dependencies {
                implementation(libs.kotlin.test)
                implementation(libs.kotlinx.coroutines.test)
            }
        }
        jvmTest.get().dependsOn(sqliteTest)
        iosTest.get().dependsOn(sqliteTest)
    }
}

android {
    namespace = "com.looin.finance.shared"
    compileSdk = 36
    defaultConfig { minSdk = 26 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

room {
    schemaDirectory("$projectDir/schemas")
}

dependencies {
    listOf("kspAndroid", "kspJvm", "kspIosX64", "kspIosArm64", "kspIosSimulatorArm64").forEach { add(it, libs.room.compiler) }
}

// `./gradlew test` 에 PC(JVM) 저장소 테스트 포함
tasks.matching { it.name == "test" }.configureEach { dependsOn("jvmTest") }
