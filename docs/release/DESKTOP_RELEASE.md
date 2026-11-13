# PC 출시 (Windows 우선 → macOS)

PC 앱은 Android 와 **같은 화면·같은 계산·같은 DB 구조**를 쓴다(Compose Multiplatform + Room KMP). Java 를 따로 설치할 필요 없이 런타임이 설치 파일에 들어간다.

## 만들기

| 대상 | 명령 | 실행 환경 | 결과 |
|---|---|---|---|
| Windows 설치 파일 | `./gradlew :desktopApp:packageMsi` (`packageExe`) | **Windows** | `desktopApp/build/compose/binaries/main/msi/LooinFinance-1.0.0.msi` |
| macOS 디스크 이미지 | `./gradlew :desktopApp:packageDmg` | **macOS** | `.../dmg/LooinFinance-1.0.0.dmg` |
| 개발 실행 | `./gradlew :desktopApp:run` | 아무 OS | 창으로 실행 |
| 설치 없이 실행 폴더 | `./gradlew :desktopApp:createDistributable` | 아무 OS(그 OS 용) | `.../app/LooinFinance/` |

설치 파일은 그 OS 에서만 만들 수 있으므로 GitHub Actions(`.github/workflows/desktop.yml`)가 푸시할 때마다 Windows 러너에서 MSI·EXE, macOS 러너에서 DMG 를 만들어 **Artifacts** 로 올린다.

## 설치·데이터 위치
- Windows: 사용자 폴더에 설치(관리자 권한 불필요), 시작 메뉴 "Looin" 그룹 + 바탕화면 바로가기
- 데이터(DB): Windows `%APPDATA%\LooinFinance\looin_finance.db`, macOS `~/Library/Application Support/LooinFinance/`, Linux `~/.local/share/looin-finance/`
- 화면 테마 설정: OS 사용자 설정(Windows 레지스트리 HKCU, macOS plist)
- 앱을 지워도 데이터 폴더는 남는다(재설치 시 그대로 이어짐). 백업은 설정 → 데이터 → 백업 파일 만들기(Android 와 같은 형식이라 서로 옮길 수 있음)

## 버전 올리기
`desktopApp/build.gradle.kts` 의 `desktopVersion`(MSI 규칙: `MAJOR.MINOR.BUILD`, MAJOR ≥ 1)을 올린다.
`upgradeUuid` 는 **절대 바꾸지 않는다**(바꾸면 새 버전이 기존 설치를 덮어쓰지 못하고 별개 앱으로 설치됨).

## 서명 (출시 전 필수)
| OS | 서명 없을 때 | 정식 출시 방법 |
|---|---|---|
| Windows | SmartScreen "알 수 없는 게시자" 경고 | ① 코드 서명 인증서(OV/EV)로 MSI 서명 ② **Microsoft Store** 에 등록(스토어 배포는 경고 없음). 스토어 제출 요건은 Partner Center 에서 확인 |
| macOS | Gatekeeper 가 실행 차단 | Apple Developer Program → Developer ID 인증서로 서명 + 공증(notarization). Compose 설정 `macOS { signing { ... }; notarization { ... } }` 로 자동화 가능 |

인증서·비밀번호는 저장소에 넣지 않고 GitHub Secrets 로만 넘긴다(Android 와 같은 방식).

## 검증 상태 (2026-11-13)
- PC 화면 테스트(`DesktopAppTest`, 창 없는 환경): 첫 계좌 등록 → 지출 입력 → 모든 탭 이동 통과
- 실제 PC 앱 창 실행(Linux 가상 디스플레이) 및 최소 런타임으로 묶은 앱 이미지 실행 확인
- Windows MSI·macOS DMG: CI 에서 생성(실제 Windows·Mac 에 설치해 보는 확인은 사용자 PC 에서 필요)

## 남은 PC 작업 (로드맵 3단계 — 모바일 기능 완성 후 진행)
- **PC 창에 맞는 디자인**: 넓은 창 여러 칸 배치(캘린더 + 거래 목록 + 상세), 키보드 단축키(새 거래 Ctrl+N, 검색 Ctrl+F), 우클릭 메뉴
- 창 크기·위치 기억, 다크 모드 시스템 연동 확인(Windows 설정)
- 서명·Microsoft Store 등록
