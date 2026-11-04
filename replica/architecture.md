# Architecture: (가칭) 필름 카메라. 롤리즈 핵심 기능을 개인 사용용 Android 앱으로 다시 만들기

전제: Android 전용, 개인 사용, 과금 없음, Play 스토어 출시 없음(APK 직접 설치), 서버와 계정 없음.
그래서 웹 스택(Next.js, Postgres, 인증, Stripe, 이메일, 호스팅)은 전부 **해당 없음**입니다. 앱 하나와 로컬 DB만 있습니다.

## Stack

| layer | choice | why |
| --- | --- | --- |
| 언어 / UI | Kotlin + Jetpack Compose (Material 3 기반 커스텀 테마) | Android 표준. 카메라 UI처럼 커스텀이 많은 화면도 Compose로 충분히 만들 수 있음 |
| 카메라 | CameraX (Preview + ImageCapture) | 기기 파편화(방향, 해상도, 플래시, 초점)를 대신 처리해 줌. Camera2를 직접 쓰는 것보다 코드가 1/5 수준 |
| 실시간 필터 | OpenGL ES 3.0 + GLSL 셰이더, `GLSurfaceView`에 카메라 OES 텍스처를 입력 | LUT, 그레인, 빛샘, 비네팅, 왜곡을 한 번의 패스로 30fps 처리. 미리보기와 현상에 **같은 셰이더 코드**를 씀 |
| 현상 (고해상도 렌더) | 오프스크린 EGL(PBuffer) + 같은 셰이더 → Bitmap → JPEG | 프리뷰에서 보던 결과가 최종 사진과 똑같이 나와야 하니까 |
| 로컬 DB | Room (SQLite) + KSP | 롤과 사진 메타데이터. 테이블 2개 |
| 설정 / 장착 장비 | DataStore (Preferences) | key-value면 충분함 |
| 카탈로그 | `assets/catalog.json` + `assets/luts/*.png` (kotlinx.serialization) | 필름/바디/렌즈는 앱에 묶인 정적 데이터. DB에 넣을 이유가 없음 |
| 백그라운드 작업 | WorkManager | 현상 지연("1시간 뒤 현상")을 걸어 두고 앱을 꺼도 완료되게 |
| 이미지 로딩 | Coil | 갤러리 썸네일 |
| DI | 수동 (Application의 `AppContainer`) | 화면 10개 남짓이라 Hilt는 과함 |
| 빌드 / 배포 | Gradle (AGP) + GitHub Actions에서 debug/release APK 빌드 → 폰에 직접 설치 | 스토어가 없으니 서명한 APK를 받아서 설치하면 끝 |
| minSdk / target | minSdk 29 (Android 10), target 최신 | MediaStore에 권한 없이 저장할 수 있고 Photo Picker를 쓸 수 있음. 개인 폰이면 문제없음 |

## 앱 구조 (단일 모듈, 패키지로 나눔)

```
app/src/main/java/.../
  camera/      CameraController: CameraX 바인딩, 초점/노출, 플래시, 전후면, 절전
  gl/          FilmRenderer(프리뷰), OffscreenRenderer(현상), shaders/*.glsl, LutTexture
  film/        Catalog(film, body, lens) 로딩, FilmLook = 세 가지를 합친 셰이더 파라미터
  roll/        RollRepository: 롤 시작/컷 추가/마감, ShootUseCase
  develop/     DevelopWorker(WorkManager), DateStamp, ExifWriter
  gallery/     GalleryRepository, MediaStoreExporter
  settings/    SettingsStore(DataStore)
  ui/          screens(S01~S11), components, theme
assets/
  catalog.json
  luts/        필름별 3D LUT (33³을 2D로 펼친 PNG)
  overlays/    빛샘 텍스처, 바디별 프레임/비네팅 마스크
tools/
  lutgen/      LUT 제작 스크립트 (Python: 파라미터 커브 → .cube → PNG)
```

### 이미지 파이프라인 (핵심)

```
CameraX Preview ──► SurfaceTexture(OES) ──► FilmRenderer ──► GLSurfaceView (1080p, 30fps)
                                             │  셰이더 한 패스:
                                             │  1 렌즈 왜곡 / 색수차 (lens)
                                             │  2 노출 보정 (EV)
                                             │  3 3D LUT 색 변환 (film)
                                             │  4 바디 색 틀어짐 + 비네팅 (body)
                                             │  5 그레인 (procedural noise, seed)
                                             │  6 빛샘 오버레이 (screen blend, seed)
                                             ▼
셔터 ─► ImageCapture ─► raw JPEG 저장 (filesDir) ─► photos 행 insert (developed_path = NULL)
                                             ▼
                              현상 (즉시 또는 WorkManager 지연)
               raw JPEG → OffscreenRenderer(같은 셰이더, 같은 seed, 풀해상도)
               → 날짜 스탬프(Canvas) → JPEG + EXIF → developed_path 기록
               → (설정에 따라) MediaStore Pictures/<앱이름>/ 에 자동 내보내기
```

원본을 남겨 두고 나중에 렌더하는 방식이라 좋은 점이 두 가지 있습니다. 현상 대기가 그냥 "렌더 시점을 늦추는 것"으로 끝나고, 같은 코드로 "기존 사진에 필름 효과 입히기"(should)도 만들 수 있습니다.

## Schema

테이블 2개(`rolls`, `photos`). 전체 SQL은 `replica/schema.sql`에 있습니다.
접근 규칙: **해당 없음.** 단일 사용자이고 Android 앱 샌드박스(앱 전용 `filesDir`, DB)가 접근을 막아 줍니다. 그래서 owner 컬럼도 두지 않습니다.

스킬 기본값과 다르게 정한 것:
- `id`는 UUID 대신 `INTEGER AUTOINCREMENT`를 씁니다. 로컬 단일 기기라 동기화할 일이 없습니다.
- 시간은 `timestamptz` 대신 `INTEGER` UTC millis를 씁니다. SQLite에는 시간 타입이 없습니다.
- 카탈로그(필름/바디/렌즈)는 DB 밖에 둡니다. 그래서 `film_id` 등은 FK를 걸지 않고, 앱 시작 시 카탈로그에 없는 id가 있는지 검사합니다(필름을 삭제·이름 변경할 때 대비).

DB에서 지키는 제약:
- **촬영 중인 롤은 하나만**: `rolls(status) WHERE status='shooting'`에 부분 unique 인덱스. Room `@Index`가 WHERE를 지원하지 않으므로 `RoomDatabase.Callback.onCreate`와 마이그레이션에서 직접 실행합니다.
- **셔터를 연타해도 37번째 컷이나 같은 컷 번호가 생기지 않음**: `photos(roll_id, frame_no)` unique 인덱스 + `shot_count <= capacity` CHECK. 컷 추가는 한 트랜잭션 안에서 처리합니다.

## "API" (앱 내부 Repository / UseCase)

서버가 없으니 HTTP 라우트도 없습니다. 대신 화면이 호출하는 내부 함수 목록을 플로우별로 정리했습니다.

| 함수 | 하는 일 | input | output | flow |
| --- | --- | --- | --- | --- |
| `CameraController.bind(lifecycle, surface)` | Preview + ImageCapture 바인딩 | 전/후면 | 상태 Flow | F01 |
| `CameraController.focusAt(x,y)` / `lockAeAf()` | 탭 초점·노출, 길게 눌러 잠금 | 좌표 | — | F01 |
| `CameraController.setExposure(ev)` | 노출 보정 | -2..+2 | — | F01 |
| `ShootUseCase.shoot()` | 캡처 → raw 저장 → 트랜잭션(컷 번호 발급, shot_count+1) → 마지막 컷이면 롤 마감 | — | `Photo`, `rollFinished` | F01, F04 |
| `RollRepository.currentRoll()` | 촬영 중인 롤(없으면 장착 장비로 새로 시작) | — | `Flow<Roll>` | F01, F04 |
| `RollRepository.finishRoll(id)` | status=developing, develop_at 계산, DevelopWorker 예약 | rollId | — | F04 |
| `RollRepository.startNewRoll(gear)` | 새 롤 장착 | film, body, lens | `Roll` | F04 |
| `GearStore.equip(film\|body\|lens)` | 장착 장비 변경 (DataStore). 프리뷰는 바로 반영, 롤 처리는 아래 참고 | id | — | F02, F03 |
| `Catalog.films(category)` / `bodies()` / `lenses()` | 카탈로그 조회 | — | List | F02, F03 |
| `DevelopWorker` | 롤의 사진을 전부 풀해상도로 렌더 → developed_path, 롤을 developed로, 알림 | rollId | — | F04 |
| `GalleryRepository.rolls()` / `photos(rollId)` | 갤러리 목록 | — | Flow | F05 |
| `MediaStoreExporter.export(photo)` | 기기 사진첩에 저장 (`Pictures/<앱>`), EXIF 포함 | photoId | content URI | F05 |
| `GalleryRepository.delete(photoIds)` | 행 + 파일 삭제 (+내보낸 사본은 묻고 삭제) | ids | — | F05 |
| `ShareSheet.share(photo)` | FileProvider URI로 공유 | photoId | — | F05 |
| `SettingsStore.*` | 타이머, 셔터음, 볼륨 셔터, 고해상도, 위치, 현상 지연, 자동 내보내기, 날짜 스탬프, 그리드 | — | Flow | F06 |
| `ImportUseCase.apply(uri, gear)` (should) | Photo Picker로 고른 사진 → 같은 렌더러 → MediaStore 저장 | uri | content URI | 차별점 |

결정한 것: **롤 중간에 필름을 바꾸면** "현재 롤을 여기서 마감하고 새 필름을 넣을까요?"라고 묻습니다. 진짜 필름처럼 롤 = 필름 1종을 유지하기 위해서입니다. 바디와 렌즈는 롤 중간에도 자유롭게 바꿀 수 있고, 컷마다 기록합니다.
→ 그래서 `photos`에도 `body_id`, `lens_id` 컬럼이 있습니다 (schema.sql에 반영함).

Webhooks in/out: 없음.
Jobs: ~~`DevelopWorker`~~ **현상 지연은 사용자 결정으로 제외(2026-11-04). 찍자마자 현상한다.** 원래 계획:. 현상 지연 설정에 따라 즉시 / 1시간 / 다음 날 아침 9시에 실행하는 OneTime 작업이고, 롤 id를 고유 작업 이름으로 씁니다.

## The parts that bite

- **발열 / 배터리 (원본 리뷰 불만 1위):** 프리뷰 해상도는 1080p 이하로, 프레임은 30fps로 제한합니다. 60초 동안 조작이 없으면 화면을 어둡게 하고 GL 렌더를 멈추고, 120초가 지나면 카메라를 unbind합니다. `ON_STOP`에서 즉시 해제합니다. **발열 상태에 따라 화질을 자동으로 낮추는 기능은 넣지 않습니다** (사용자 결정). 발열 상태는 로그만 남깁니다.
- **미리보기와 결과가 같아야 함:** 셰이더는 하나만 두고, 그레인과 빛샘은 seed로 재현합니다. 그레인 크기는 출력 해상도에 비례하도록 정규화합니다. 안 그러면 풀해상도에서 그레인이 너무 작아집니다.
- **방향:** `OrientationEventListener`로 `ImageCapture.targetRotation`을 갱신하고, 현상할 때 회전을 픽셀에 굽습니다. 그래야 가로 사진이 가로로 저장됩니다(원본 불만).
- **셔터 연타 / 레이스:** 촬영 중에는 셔터를 막고, DB unique 인덱스로 한 번 더 막습니다. 마지막 컷과 롤 교체 사이에는 애니메이션을 넣어 입력을 잠급니다.
- **멱등성:** WorkManager는 작업을 재시도할 수 있습니다. DevelopWorker는 `developed_path IS NULL`인 사진만 렌더하므로 두 번 돌아도 안전합니다.
- **메모리:** 50MP 사진을 풀해상도 Bitmap 하나로 렌더하면 OOM이 납니다. GL 최대 텍스처 크기를 확인하고, 넘으면 타일로 렌더하거나 기본값을 12MP로 다운스케일합니다. 고해상도 옵션을 켤 때만 원본 크기를 씁니다.
- **셔터음 정책:** 한국·일본 기기는 소리를 강제합니다. `MediaActionSound.mustPlayShutterSound()`(API 33+)를 확인해서, 강제되는 기기에서는 설정 토글을 비활성화하고 안내합니다.
- **권한:** 카메라는 필수입니다. 사진 저장은 MediaStore insert라서 API 29+에서 권한이 필요 없습니다. 위치는 선택이고, EXIF에 넣으려면 `ACCESS_MEDIA_LOCATION`과 위치 권한이 필요합니다.
- **기기 파편화:** CameraX가 대부분 처리해 주지만, 전면 카메라 미러링과 일부 기기의 OES 텍스처 행렬은 `SurfaceTexture.getTransformMatrix`를 꼭 적용해야 합니다.
- **해당 없음:** 시간대(UTC로 저장하고 표시만 로컬로), 결제, 이메일, 멀티테넌시, 실시간, 검색, GDPR(데이터가 기기 밖으로 나가지 않음).

## Build order

1. **Vertical slice: 찍으면 필름 사진이 나온다** (못생겨도 됨)
   - 화면: S02(뷰파인더 + 셔터만), S09(사진 하나 보기)
   - 코드: CameraX → FilmRenderer(LUT 하나 하드코딩 + 그레인) → ImageCapture → 즉시 현상 → MediaStore 저장
   - 테이블: rolls, photos
   - 끝났다는 기준: 폰에 APK를 설치해서 찍은 사진이 사진첩에 필름 느낌으로 들어감. GitHub Actions에서 APK 빌드까지.
2. **Must-haves**
   - 장비: catalog.json, 필름 10종으로 시작, 바디 3, 렌즈 3, S03/S04/S05, 프리뷰 즉시 반영
   - 롤: 36컷 카운터, 마지막 컷이면 S06 → 새 롤 자동 장착
   - 갤러리: S07 → S08 → S09, 저장/공유/삭제
   - 카메라: 전후면, 가로 방향, 절전/발열 대응
   - 권한: S01, S11
3. **Should-haves**
   - 탭 초점 + AE/AF 잠금, 노출 다이얼, 플래시, 셀프 타이머, 볼륨 셔터, 셔터음 토글, 그리드
   - 현상 지연 (DevelopWorker + 알림), 날짜 스탬프
   - 뷰어 확대, 기존 사진에 필름 효과 입히기
   - 필름을 30종까지 늘리기 (`tools/lutgen`)
4. **Could-haves:** 고해상도, 위치 태그, 빠른 설정 타일, 무비 모드
5. **Fixes from replica-entrepreneur:** 개인 사용용이라 생략해도 됨. 원본 리뷰 불만(발열, 그리드, 가로 사진, 기존 사진 편집)은 이미 위에 넣었습니다.
