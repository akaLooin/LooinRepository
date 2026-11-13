# iOS · PC 출시 로드맵

## 현재 상태

| 계층 | Android | PC (Windows·macOS) | iOS |
|---|---|---|---|
| 재정 계산 `:core` | ✅ | ✅ (JVM 타깃 그대로 사용) | ✅ 컴파일 대상 선언, macOS CI 로 빌드·테스트 |
| 저장 (Room) | ✅ Android 전용 설정 | ❌ | ❌ |
| 화면 (Jetpack Compose) | ✅ | ❌ | ❌ |
| 백업 파일 입출력 | ✅ Android 저장소 접근 | ❌ | ❌ |

`:core` 는 Kotlin Multiplatform 모듈입니다.
- `commonMain`(공용 코드)은 JVM 전용 API 없이 컴파일된다는 것을 확인했습니다.
- iOS 타깃(`iosArm64`, `iosSimulatorArm64`, `iosX64`)은 macOS 에서만 빌드됩니다. `.github/workflows/ios-core.yml` 이 macOS 러너에서 iOS 시뮬레이터 테스트와 프레임워크 링크를 실행합니다.

## 단계

### 1단계: 공용 데이터 계층 (예상 1~2주)
- Kotlin 2.1+, Room 2.7+(KMP 지원)과 번들 SQLite 드라이버로 올립니다. 또는 SQLDelight 를 씁니다.
- `data/` 를 공용 모듈 `:shared` 로 옮기고, DB 파일 위치만 플랫폼별(expect/actual)로 둡니다.
- 백업 JSON 은 `org.json`(Android 전용) 대신 `kotlinx.serialization` 으로 바꿉니다. 형식(`formatVersion 1`)은 그대로 유지해 기존 백업 파일과 호환합니다.
- 기존 Android 사용자 DB 는 같은 스키마(v2)를 그대로 읽어야 합니다. `MigrationTest` 로 검증합니다.

### 2단계: 공용 화면 (예상 2~3주)
- Jetpack Compose → **Compose Multiplatform**. 지금 화면 코드는 Material3·Compose 기본 요소만 써서 대부분 그대로 옮겨집니다.
- 플랫폼별로 바꿔야 할 것:
  - Navigation: Compose Multiplatform 용 navigation-compose
  - ViewModel: lifecycle-viewmodel KMP
  - 글꼴: Pretendard 를 Compose 리소스로 이전
  - 화면 설정: SharedPreferences → DataStore KMP 또는 설정 테이블
  - 날짜 선택: Material3 DatePicker 는 공용으로 사용 가능
  - 파일 저장·열기: Android 는 저장소 접근 프레임워크, PC 는 파일 대화상자, iOS 는 UIDocumentPicker (expect/actual)
- Robolectric 화면 테스트는 Compose 공용 UI 테스트로 옮깁니다.

### 3단계: PC 출시 (2단계 이후 약 1주)
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
2. PC 플랫폼 범위: Windows 만 / Windows + macOS
3. 1단계 저장 방식: Room KMP(현재 코드와 연속성) 권장 / SQLDelight
4. iOS 빌드용 Mac 확보 방법: 실제 Mac 또는 클라우드 Mac
