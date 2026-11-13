# Android 출시 절차

## 1. 업로드 키 만들기 (한 번만, 사용자 PC에서)

```bash
keytool -genkeypair -v -keystore looin-upload.jks -alias upload \
  -keyalg RSA -keysize 4096 -validity 10000
```

- 이 파일과 비밀번호는 **저장소에 절대 올리지 않습니다**(`.gitignore`에 `*.jks`, `keystore.properties` 등록됨).
- 비밀번호 관리자와 오프라인 매체 두 곳에 보관하세요.
- Play 앱 서명(Play App Signing)을 쓰므로, 이 키는 "업로드 키"입니다. 잃어버리면 Play Console에서 재설정을 요청할 수 있습니다.

## 2. 로컬에서 서명된 빌드 만들기

저장소 루트에 `keystore.properties`를 만듭니다(커밋되지 않음).

```properties
storeFile=/절대/경로/looin-upload.jks
storePassword=********
keyAlias=upload
keyPassword=********
```

```bash
./gradlew test :app:lintRelease          # 테스트·lint
./gradlew :app:bundleRelease             # → app/build/outputs/bundle/release/app-release.aab (Play 업로드용)
./gradlew :app:assembleRelease           # → app-release.apk (기기에 직접 설치해 확인용)
```

서명 정보가 없으면 release 빌드는 **서명되지 않은 상태**로 만들어집니다(실수로 디버그 키 빌드를 올리는 일 방지).
`versionName`은 `app/build.gradle.kts`의 `appVersionName`, `versionCode`는 환경변수 `LOOIN_VERSION_CODE`로 올립니다(기본값 3). Play는 업로드마다 더 큰 versionCode를 요구합니다.

## 3. GitHub Actions로 만들기 (권장)

저장소 Settings → Secrets and variables → Actions 에 등록합니다.

| 이름 | 값 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 looin-upload.jks` 결과 |
| `ANDROID_KEYSTORE_PASSWORD` | 키스토어 비밀번호 |
| `ANDROID_KEY_ALIAS` | `upload` |
| `ANDROID_KEY_PASSWORD` | 키 비밀번호 |

`v1.0.0`처럼 `v`로 시작하는 태그를 푸시하면 `.github/workflows/android.yml`이 다음을 실행합니다.
1. 테스트
2. 서명된 AAB 생성(versionCode = 100 + 실행 번호)
3. AAB와 `mapping.txt`(충돌 분석용)를 아티팩트로 올림

평소 푸시·PR에서는 테스트, 릴리스 lint, 디버그 빌드만 실행하고, UI 캡처를 아티팩트로 남깁니다.

## 4. Play Console 단계

1. **앱 만들기**: 기본 언어 한국어, 앱 이름, 앱/게임 = 앱, 무료.
2. **Play 앱 서명** 사용(기본). 첫 AAB를 올릴 때 업로드 키가 등록됩니다.
3. **앱 콘텐츠** 선언 (답변 초안은 `DATA_SAFETY.md`)
   - 개인정보처리방침 URL
   - 앱 액세스 권한: 로그인 없음, 모든 기능 사용 가능
   - 광고: 없음
   - 콘텐츠 등급 설문: 금융 정보 입력만 있음, 폭력·도박 없음 → 전체 이용가 예상
   - 타겟층: 성인(만 18세 이상) 권장(금융 관리 앱)
   - 데이터 보안: 수집·공유 없음
   - 금융 기능 선언: 개인 예산·지출 관리만 해당. 대출·투자·결제·송금 기능 없음
   - 정부 앱 아님, 뉴스 앱 아님
4. **스토어 등록정보**: `PLAY_LISTING_ko.md` 문구, `store/` 그래픽
5. **테스트 트랙**
   - 내부 테스트(최대 100명, 심사 빠름)로 실기기 확인
   - 비공개 테스트: 신규 개인 개발자 계정은 프로덕션 신청 전에 정해진 인원·기간 동안 비공개 테스트를 해야 합니다(요건은 콘솔에서 확인)
6. **프로덕션** 출시: 단계적 출시(예: 20% → 100%) 권장

## 5. 출시 후

- 충돌·ANR은 Play Console의 Android vitals에서 봅니다(앱 안에 분석 SDK는 넣지 않았습니다).
- 충돌 스택은 `mapping.txt`를 Play Console에 올려 해독합니다(CI 아티팩트에 포함).
- DB 스키마를 바꿀 때는 반드시 Room 마이그레이션을 추가하고 `MigrationTest`에 시나리오를 더합니다. 파괴적 마이그레이션은 금지입니다.
