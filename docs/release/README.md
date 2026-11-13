# 출시 준비 (Google Play · App Store · PC)

목표: **Android(Google Play) → PC(Windows·macOS) → iOS(App Store)** 순서로 정식 출시.
Android 앱은 지금 바로 비공개 테스트에 올릴 수 있는 상태이고, iOS·PC는 공용 계산 모듈(KMP)까지 준비되어 있습니다.

| 문서 | 내용 |
|---|---|
| [ANDROID_RELEASE.md](ANDROID_RELEASE.md) | 업로드 키 만들기, 서명 빌드, GitHub Actions 비밀값, Play Console 단계 |
| [PLAY_LISTING_ko.md](PLAY_LISTING_ko.md) | 스토어 등록 문구(제목·짧은 설명·자세한 설명·새 기능), 그래픽 목록 |
| [DATA_SAFETY.md](DATA_SAFETY.md) | Play 데이터 보안 양식·App Store 개인정보 라벨 답변, 기타 콘텐츠 선언 |
| [PRIVACY_POLICY_ko.md](PRIVACY_POLICY_ko.md) | 개인정보처리방침 (공개 URL 필요 → `docs/privacy/index.html`) |
| [MULTIPLATFORM_ROADMAP.md](MULTIPLATFORM_ROADMAP.md) | iOS·PC 출시까지의 기술 단계와 일정 |
| `store/` | Play 아이콘 512, 대표 그래픽 1024×500, 휴대폰 스크린샷 6장(1080×1920) |

## ✋ 사용자가 결정·준비해야 하는 것

| # | 항목 | 제안 | 비고 |
|---|---|---|---|
| 1 | **앱 이름** | 루인 가계부 (영문: Looin Budget) | 상표 검색(KIPRIS) 권장. 스토어 제목 30자 이내 |
| 2 | **패키지 / 번들 ID** | `com.looin.finance` (현재 값) | **출시 후 바꿀 수 없음.** 도메인을 갖고 있다면 그 역순(예: `com.<도메인>.finance`) 권장 |
| 3 | **가격** | 무료, 광고·인앱결제 없음 | 유료·인앱결제를 하면 통신판매업 신고, 결제 정책 검토 필요 |
| 4 | **지원 이메일** | 앱 전용 주소 새로 만들기 권장 | 스토어에 공개됨 |
| 5 | **개인정보처리방침 URL** | GitHub Pages(`docs/privacy/`)로 공개 | 저장소 설정 → Pages → `docs` 폴더 |
| 6 | **개발자 계정** | Google Play(일회성 등록비), Apple Developer Program(연회비) | 비용·본인 확인 절차는 각 콘솔에서 최신 정보 확인 |
| 7 | **PC 배포 경로** | Windows: Microsoft Store + 설치 파일(MSI), macOS: 공증된 DMG | Mac App Store 는 2차 |
| 8 | **iOS 빌드 환경** | GitHub Actions macOS 러너(이미 설정) + 실제 Mac 1대(서명·심사 제출) | Xcode 는 macOS 에서만 동작 |
| 9 | **계산 규칙 확인 항목** | `docs/PHASE1_PLAN.md` 3장 8개, `docs/PHASE2_NOTES.md` 4개 | 출시 전에 확정 권장 |

## 출시 체크리스트 (Android 1.0.0)

- [x] targetSdk 36(Android 16), minSdk 26, 64비트·16KB 페이지 정렬 확인 — Play 대상 API 기준은 매년 8월 말 올라가므로 매년 확인
- [x] R8 축소 릴리스 빌드, AAB 생성, 서명 설정(환경변수/로컬 파일), 디버그 키 업로드 방지
- [x] 런처 아이콘(적응형·테마 아이콘), Play 아이콘 512, 대표 그래픽, 스크린샷 6장
- [x] 데이터 전송 없음, 권한 없음, 자동 백업 규칙 명시
- [x] 자동 테스트: 계산 · 저장소 · 마이그레이션 · 반복 거래 · 백업 · 라이트/다크 UI 흐름
- [x] CI: 테스트·lint·빌드, 태그 푸시 시 서명된 AAB
- [ ] 업로드 키 생성 후 GitHub Secrets 등록 (사용자)
- [ ] 개인정보처리방침 공개 URL, 지원 이메일 (사용자)
- [ ] **실기기 테스트**: R8 적용 릴리스 빌드를 내부 테스트 트랙으로 받아 주요 흐름 확인
- [ ] Play Console: 앱 만들기 → 콘텐츠 선언 → 비공개 테스트(신규 개인 계정은 테스터 수·기간 요건 있음) → 프로덕션
