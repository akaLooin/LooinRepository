package com.looin.finance.ui

/**
 * 화면에 보이는 앱 이름(가칭). 확정되면 여기와 아래 플랫폼 설정만 바꾼다.
 *  - Android: app/src/main/res/values/strings.xml (app_name, app_name_preview)
 *  - iOS: iosApp/LooinBudget/Info.plist (CFBundleDisplayName)
 *  - PC: desktopApp/build.gradle.kts (설치 이름·macOS Dock 이름)
 * 패키지 ID(com.looin.finance)·데이터 폴더는 이름과 무관하게 그대로 둔다(기존 데이터 유지).
 */
const val APP_NAME = "페즈뱅크"
