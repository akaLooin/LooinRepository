# 루인 가계부 (Looin Finance) — Phase 1

현재 잔고, 예정 지출, 월간 예산, 실제로 쓸 수 있는 여유 금액을 함께 관리하는 Android 가계부 앱입니다.
설계 결정과 계산 규칙, 확인이 필요한 항목은 [docs/PHASE1_PLAN.md](docs/PHASE1_PLAN.md)에 있습니다.

디자인은 투두메이트 프로젝트(`claude/replica-skill-install-ll9jb4` 브랜치)의 디자인 시스템을 모티브로 합니다.
검정 배경, 알약 섹션, 날짜 위 동전 마커, 바텀 시트 메뉴, Pretendard 글꼴을 쓰고, 라이트·다크 모드를 모두 지원합니다.

| 홈 | 캘린더 | 돈 관리 |
|---|---|---|
| ![홈](docs/screenshots/dark_04_home.png) | ![캘린더](docs/screenshots/dark_06_calendar.png) | ![돈 관리](docs/screenshots/dark_05_plan.png) |
| **자산** | **분석** | **거래 입력 (라이트)** |
| ![자산](docs/screenshots/dark_07_assets.png) | ![분석](docs/screenshots/dark_08_analysis.png) | ![거래 입력](docs/screenshots/light_03_transaction_edit.png) |

## 구조

```
core/   순수 Kotlin 재정 계산 모듈 (Android 의존성 없음 → 향후 iOS·PC 재사용)
  model/       계좌·거래·카테고리·예산·설정 모델
  period/      달력/월급일 이중 회계 기간 (시작 포함·종료 미포함 구간)
  calc/        잔고·순자산·예상 잔고·예산·사용 가능 금액·통계 계산 + 계산 근거(Breakdown)
  validation/  거래 검증(오류/경고), 계좌 보관·잔고 조정 규칙
app/    Android 앱 (Jetpack Compose + Room)
  data/        Room 엔티티·DAO, FinanceRepository(저장 전 검증, 트랜잭션 처리)
  ui/          홈·캘린더·돈 관리·자산·분석·거래 입력·설정 화면
```

화면 코드는 원본 데이터만 받고, 모든 금액은 `core`의 계산기로 계산합니다.

## 실행 및 빌드

필요: JDK 17 이상, Android SDK(platform 35, build-tools 35.0.0). `local.properties`에 `sdk.dir=...` 지정.

```bash
./gradlew test                    # 전체 테스트 (core 단위 테스트 + 앱 Robolectric 테스트)
./gradlew :core:test              # 재정 계산 단위 테스트만
./gradlew :app:assembleDebug      # 디버그 APK → app/build/outputs/apk/debug/app-debug.apk
./gradlew :app:installDebug       # 연결된 기기/에뮬레이터에 설치
./gradlew :app:assembleRelease    # 릴리스 APK (현재는 디버그 키로 서명 — 배포 전 서명 설정 필요)
```

Android Studio에서는 저장소 루트를 열고 `app` 구성을 실행하면 됩니다.
UI 흐름 테스트(`AppFlowTest`·`AppFlowDarkTest`)는 실행할 때 라이트·다크 화면 캡처를 `app/build/screenshots/`에 저장합니다.
글꼴 라이선스는 [docs/licenses/FONTS.md](docs/licenses/FONTS.md)에 있습니다.
