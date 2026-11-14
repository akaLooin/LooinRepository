# iOS 앱 (루인 가계부)

화면·계산·저장은 모두 Kotlin 공용 모듈이 담당합니다(`:ui` → `LooinUi.framework`). 이 폴더는 그 화면을 띄우는 Swift 껍데기와 앱 설정입니다.

| 파일 | 내용 |
|---|---|
| `project.yml` | Xcode 프로젝트 정의(XcodeGen). 번들 ID `com.looin.finance`, iOS 16 이상, iPhone 세로 화면 |
| `LooinBudget/LooinBudgetApp.swift` | 진입점: `MainViewController()`(Kotlin)를 전체 화면으로 띄움 |
| `LooinBudget/Info.plist` | 앱 이름 "루인 가계부", Face ID 사용 문구, 수출 규정(암호화 없음) |
| `LooinBudget/PrivacyInfo.xcprivacy` | 개인정보 매니페스트: 추적·수집 없음, UserDefaults·파일 시각 API 사용 이유 |
| `LooinBudget/Assets.xcassets` | 앱 아이콘 1024(`scripts/make_icons.py` 의 `ios_icon()`이 생성) |

## Mac 에서 열기

```bash
brew install xcodegen          # 처음 한 번
cd iosApp && xcodegen generate # LooinBudget.xcodeproj 생성(저장소에는 넣지 않음)
open LooinBudget.xcodeproj
```

- 빌드하면 먼저 `./gradlew :ui:embedAndSignAppleFrameworkForXcode` 가 Kotlin 화면을 프레임워크로 만듭니다(첫 빌드는 수 분).
- 실제 iPhone 에 설치하려면 Xcode → Signing & Capabilities 에서 Apple 계정 팀을 고르세요(무료 계정도 7일짜리 개인 설치 가능).
- Linux·Windows 에서는 iOS 앱을 빌드할 수 없습니다. 대신 Kotlin 코드 검사는 가능합니다: `./gradlew :ui:compileKotlinIosSimulatorArm64`.

## CI (`.github/workflows/ios-app.yml`)

macOS 러너에서 시뮬레이터용 빌드 → 시뮬레이터 실행·화면 캡처(라이트·다크, 아티팩트 `ios-screens`) → 기기용 Release 빌드(서명 없음)를 합니다.

## iOS 에서 아직 다른 점

- 예정 거래 알림: 아직 없음(설정에 항목이 보이지 않음). iOS 로컬 알림으로 추가 예정
- 뒤로 가기: 화면 왼쪽 위 ← 버튼(가장자리 밀기 제스처는 추가 예정)
- 백업·CSV 저장: '파일' 앱의 내보내기 화면에서 위치를 고릅니다(취소해도 "저장했습니다"가 보이는 점은 개선 예정)

## App Store 제출 전 준비(사용자)

1. Apple Developer Program 가입(연회비), 번들 ID `com.looin.finance` 등록 — 출시 후 바꿀 수 없음
2. 배포 인증서·프로비저닝 프로파일 → GitHub Secrets 로 CI 서명·TestFlight 업로드 연결
3. App Store Connect: 앱 만들기, 개인정보 라벨 "데이터 수집 안 함", 스크린샷(6.9인치 iPhone 필수)
