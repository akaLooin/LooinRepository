# iOS · PC 출시 로드맵

## 현재 상태

| 계층 | Android | PC (Windows·macOS) | iOS |
|---|---|---|---|
| 재정 계산 `:core` | ✅ | ✅ (JVM 타깃 그대로 사용) | ✅ macOS CI 로 빌드·테스트 |
| 저장·백업 `:shared` (Room KMP) | ✅ OS 내장 SQLite, 기존 DB 그대로 | ✅ 번들 SQLite, 파일 DB 테스트 통과 | ✅ 번들 SQLite, macOS CI 로 빌드·테스트 |
| 화면 `:ui` (Compose Multiplatform) | ✅ | ✅ `:desktopApp` (창 실행·화면 테스트 확인) | ❌ (4단계) |
| 백업 파일 선택 화면(파일 대화상자) | ✅ Android 저장소 접근 | ❌ (2단계) | ❌ (2단계) |

`:core` 는 Kotlin Multiplatform 모듈입니다.
- `commonMain`(공용 코드)은 JVM 전용 API 없이 컴파일된다는 것을 확인했습니다.
- iOS 타깃(`iosArm64`, `iosSimulatorArm64`, `iosX64`)은 macOS 에서만 빌드됩니다. `.github/workflows/ios-core.yml` 이 macOS 러너에서 iOS 시뮬레이터 테스트와 프레임워크 링크를 실행합니다.

## 단계

> **CI 확인 (2026-11-13)**: macOS 러너에서 `:core:iosSimulatorArm64Test`(iOS 시뮬레이터 테스트)와 `:core:linkReleaseFrameworkIosArm64`(기기용 프레임워크)가 통과했습니다.
> 다만 러너의 Xcode 26.6 은 현재 Kotlin 2.0.21 이 공식 검증한 버전(최대 16.0)보다 새로워 경고가 나옵니다. iOS 앱 작업 전에 Kotlin 을 최신 안정판으로 올려야 합니다(1단계에 포함).

### 1단계: 공용 데이터 계층 — ✅ 완료 (2026-11-13)
- Kotlin 2.3.21, KSP 2.3.13, Room 2.8.5(KMP), AGP 8.13.2 로 올림.
  - Kotlin 2.4 는 AGP 8.13 에 들어 있는 lint(Kotlin 2.2 분석기)가 읽지 못해 lint 가 일부 검사를 놓쳤다. 그래서 한 단계 아래인 2.3 을 쓴다. AGP 9 이전 때 2.4 이상으로 올린다.
- 데이터 계층 `:shared`(android·jvm·iOS)로 이동했다. Android 는 OS 내장 SQLite, PC·iOS 는 번들 SQLite 를 쓴다(Android APK 에는 네이티브 라이브러리 추가 없음).
- 트랜잭션은 Android 전용 `withTransaction` 대신 공용 `useWriterConnection` + `immediateTransaction` 을 쓴다. 중첩·롤백을 테스트로 확인했다.
- 백업 JSON 은 `kotlinx.serialization` 으로 옮겼다. 1.0.0(org.json) 형식 파일을 읽는 호환 테스트가 있다.
- 공용 저장소 테스트(`shared/src/sqliteTest`)는 PC(JVM)에서 실행해 통과했고, iOS 시뮬레이터에서는 CI 로 실행한다.
- Room 스키마(v1, v2)는 바뀌지 않았다. 기존 Android 사용자 DB 의 마이그레이션 테스트도 통과했다.

<details><summary>계획 당시 메모</summary>


- `data/` 를 공용 모듈 `:shared` 로 옮기고, DB 파일 위치만 플랫폼별(expect/actual)로 둡니다.
- 백업 JSON 은 `org.json`(Android 전용) 대신 `kotlinx.serialization` 으로 바꿉니다. 형식(`formatVersion 1`)은 그대로 유지해 기존 백업 파일과 호환합니다.
- 기존 Android 사용자 DB 는 같은 스키마(v2)를 그대로 읽어야 합니다. `MigrationTest` 로 검증합니다.

</details>

### 2단계: 공용 화면 — ✅ 완료 (2026-11-13)
- 화면·테마·내비게이션을 `:ui`(Android + PC)로 이동. 플랫폼별 부분은 작은 인터페이스로 분리: 글꼴, 설정 저장소, 백업 파일 선택, 앱 정보
- Compose Multiplatform 1.10.3 (1.12 는 AGP 9.1·compileSdk 37 필요 → AGP 9 이전 때 함께 올림)
- kotlinx-datetime 0.7.1 로 이전(PC 용 Material3 가 요구, 옛 Clock 사용 시 PC 에서 저장이 실패하던 문제를 화면 테스트로 발견해 수정)

<details><summary>계획 당시 메모</summary>

- Jetpack Compose → **Compose Multiplatform**. 지금 화면 코드는 Material3·Compose 기본 요소만 써서 대부분 그대로 옮겨집니다.
- 플랫폼별로 바꿔야 할 것:
  - Navigation: Compose Multiplatform 용 navigation-compose
  - ViewModel: lifecycle-viewmodel KMP
  - 글꼴: Pretendard 를 Compose 리소스로 이전
  - 화면 설정: SharedPreferences → DataStore KMP 또는 설정 테이블
  - 날짜 선택: Material3 DatePicker 는 공용으로 사용 가능
  - 파일 저장·열기: Android 는 저장소 접근 프레임워크, PC 는 파일 대화상자, iOS 는 UIDocumentPicker (expect/actual)
- Robolectric 화면 테스트는 Compose 공용 UI 테스트로 옮깁니다.

</details>

### 3단계: PC 출시 — 진행 중 (Windows 우선, 가능하면 macOS)
> **우선순위 결정 (2026-11-13, 사용자)**: 모바일에서 기능을 먼저 모두 완성한 뒤 PC 로 확장한다. PC 는 **PC 창에 맞는 디자인**(넓은 화면 배치)이 필요하지만 지금 당장은 아니다.
> 그때까지 PC 앱은 모바일 화면을 가운데에 보여 주는 형태로 빌드만 유지한다.
- ✅ 설치 파일 설정(MSI·EXE·DMG), 아이콘, CI 빌드 → 자세한 내용 `DESKTOP_RELEASE.md`
- ⏳ (모바일 기능 완성 후) PC 창 전용 디자인: 넓은 화면 여러 칸 배치, 마우스·키보드 조작(단축키, 우클릭 메뉴), 창 크기 기억
- ⏳ 서명, Microsoft Store 등록

- Compose Desktop 기본 배포: `packageMsi`(Windows), `packageDmg`(macOS). jpackage 로 런타임을 포함하므로 사용자가 Java 를 설치할 필요가 없습니다.
- **Windows**: Microsoft Store 등록(스토어가 서명). 스토어 밖 설치 파일은 코드 서명 인증서가 없으면 SmartScreen 경고가 뜹니다.
- **macOS**: Developer ID 서명과 Apple 공증이 필요합니다(Apple Developer Program). 2차로 Mac App Store 를 검토합니다.
- PC 화면 배치: 넓은 창에서는 캘린더와 거래 목록을 두 칸으로 보여 줍니다. 키보드 단축키(새 거래, 검색)를 넣습니다.

### 4단계: iOS 출시 (2단계 이후 약 2주, Mac 필요)
- Xcode 프로젝트에서 `ComposeUIViewController` 로 공용 화면을 띄웁니다.
- App Store 준비물:
  - 번들 ID
  - 앱 아이콘 1024
  - 스크린샷: 최신 대형 iPhone 규격 필수, 나머지는 콘솔 안내에 따름
  - 개인정보 라벨 "데이터 수집 안 함"
  - `PrivacyInfo.xcprivacy`
  - 수출 규정 응답
- iOS 특화 항목:
  - 안전 영역과 키보드
  - 뒤로 가기 제스처(Android 뒤로 버튼 대체)
  - iCloud 백업 포함 여부 결정
- TestFlight 로 베타를 돌린 뒤 심사를 제출합니다.

## 지금 결정이 필요한 것
1. 출시 순서: 권장은 Android → PC → iOS(PC 는 Mac 없이도 Windows 먼저 가능)
2. ~~PC 플랫폼 범위~~ → Windows 우선, 가능하면 macOS (사용자 결정)
3. ~~1단계 저장 방식~~ → Room KMP 로 진행함(권장안). 바꾸려면 알려 주세요.
4. iOS 빌드용 Mac 확보 방법: 실제 Mac 또는 클라우드 Mac
