# 데이터 보안 · 개인정보 라벨 답변 초안

코드 기준 사실(1.0.0):
- **인터넷 권한 없음**. 서버·분석·광고·충돌 보고 SDK 없음
- 권한(릴리스 APK 확인, 1.0.0):
  - `POST_NOTIFICATIONS` — 예정 거래 알림. 기본 꺼짐, 사용자가 설정에서 켤 때만 요청
  - `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `ACCESS_NETWORK_STATE` — WorkManager(하루 한 번 알림 작업 예약·재부팅 후 복원)가 쓰는 일반 권한. 네트워크 통신은 하지 않음
  - WorkManager 의 포그라운드 서비스와 `FOREGROUND_SERVICE` 권한은 매니페스트에서 제거(사용 안 함 → 포그라운드 서비스 신고 불필요)
  - AndroidX 내부 전용 서명 권한 `DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION`
- 모든 데이터는 기기 안의 앱 전용 DB(Room/SQLite)와 화면 설정(SharedPreferences)에만 저장
- 사용자가 직접 고른 위치에 백업 파일(JSON)을 저장하고 불러오는 기능 있음(Android 저장소 접근 프레임워크, 권한 불필요)
- Android 자동 백업·기기 이전에 DB와 설정을 포함(`data_extraction_rules.xml`). 이 백업은 사용자의 Google 계정으로 OS가 처리하며, 개발자는 접근할 수 없음

## Google Play 데이터 보안 양식

| 질문 | 답 |
|---|---|
| 앱이 사용자 데이터를 수집하거나 공유하나요? | **아니요** (기기 밖으로 개발자에게 전송되는 데이터 없음) |
| 전송 중 데이터 암호화 | 해당 없음(전송 없음) |
| 데이터 삭제 요청 방법 | 앱 삭제 또는 앱 데이터 삭제로 즉시 삭제(서버 보관 없음) |

> Play 정책상 기기 안에서만 처리되고 기기 밖으로 전송되지 않는 데이터는 "수집"에 해당하지 않습니다. 양식 작성 시점의 콘솔 안내 문구를 다시 확인하세요.

## App Store 개인정보 라벨 (iOS 출시 때)
- **데이터를 수집하지 않음(Data Not Collected)**
- `PrivacyInfo.xcprivacy`(개인정보 매니페스트): 추적 없음. 필요한 API 사용 사유(예: UserDefaults)를 iOS 앱 작업 때 선언
- 수출 규정: 표준 OS 암호화 외 사용 없음 → `ITSAppUsesNonExemptEncryption = NO`

## 기타 Play 콘텐츠 선언
| 항목 | 답 |
|---|---|
| 광고 포함 | 아니요 |
| 앱 액세스 | 로그인 없음, 전체 기능 이용 가능 |
| 타겟 연령 | 만 18세 이상 권장(금융 관리 앱) |
| 금융 기능 | 개인 예산·지출 관리 도구. 대출·투자·암호화폐·결제·송금 기능 없음 |
| 건강·정부·뉴스 앱 | 아니요 |
| 권한 | 알림 권한(선택, 설정에서 켤 때만). 인터넷 권한 없음 |
