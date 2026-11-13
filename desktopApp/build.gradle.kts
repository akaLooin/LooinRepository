plugins {
    alias(libs.plugins.kotlin.jvm)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.compose.multiplatform)
}

// PC(Windows 우선, macOS) 앱 진입점과 설치 파일 설정.
kotlin {
    compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) }
}
java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

dependencies {
    implementation(project(":ui"))
    implementation(compose.desktop.currentOs)
    testImplementation(compose.desktop.uiTestJUnit4)
    testImplementation(libs.junit)
    testImplementation(libs.kotlinx.coroutines.test)
}

/** PC 앱 버전. MSI 는 MAJOR.MINOR.BUILD(MAJOR ≥ 1) 형식이며, 업데이트마다 올려야 기존 설치를 덮어쓴다. */
val desktopVersion = "1.0.0"

compose.desktop {
    application {
        mainClass = "com.looin.finance.desktop.MainKt"

        nativeDistributions {
            targetFormats(
                org.jetbrains.compose.desktop.application.dsl.TargetFormat.Msi, // Windows 설치 파일
                org.jetbrains.compose.desktop.application.dsl.TargetFormat.Exe, // Windows 실행형 설치 파일
                org.jetbrains.compose.desktop.application.dsl.TargetFormat.Dmg, // macOS
            )
            packageName = "LooinFinance"
            packageVersion = desktopVersion
            // Windows 설치 도구(WiX)는 설명·저작권의 비ASCII 문자(한글, ©)에서 실패한다 → 영문으로 둔다.
            // 앱 안의 이름(창 제목·화면)은 그대로 한국어.
            description = "Looin Finance - balance, planned spending and budget"
            vendor = "Looin"
            copyright = "Copyright (c) Looin"
            // jlink 로 필요한 JDK 모듈만 포함(./gradlew :desktopApp:suggestRuntimeModules 결과)
            modules("java.instrument", "java.prefs", "jdk.unsupported")

            windows {
                iconFile.set(project.file("icons/icon.ico"))
                menuGroup = "Looin"
                shortcut = true          // 바탕화면 바로가기
                menu = true              // 시작 메뉴
                dirChooser = true        // 설치 위치 선택
                perUserInstall = true    // 관리자 권한 없이 사용자 폴더에 설치
                // ⚠️ 절대 바꾸지 말 것: 바꾸면 Windows 가 새 버전을 다른 앱으로 보고 업데이트(덮어쓰기)가 되지 않는다.
                upgradeUuid = "633b0725-8a6b-49e5-bc2d-35fb66df7e6d"
            }
            macOS {
                iconFile.set(project.file("icons/icon.icns"))
                bundleID = "com.looin.finance.desktop"
                dockName = "루인 가계부"
            }
            linux {
                iconFile.set(project.file("icons/icon.png"))
            }
        }
    }
}
