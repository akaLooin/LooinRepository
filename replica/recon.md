# Recon map: 롤리즈(ROLLIE'S) 스타일 필름 카메라 앱 (Android 우선, 이후 iOS)

범위: 핵심 루프. 바디·렌즈·필름을 골라 장비를 꾸리고, 실시간 뷰파인더로 찍고, 36컷 롤을 채우고, 현상한 뒤 갤러리에서 보고 저장·공유하는 흐름. 무비 모드와 뽑기는 v2로 미룸.
대상: Looin 개인 사용용 (Android 전용, 과금 없음, Play 스토어 출시 안 함)
날짜: 2026-11-04

> 원칙: 기능과 UX 패턴만 참고합니다. 원본의 이름, 로고, UI 그래픽, 필름 이름, LUT 데이터는 가져오지 않습니다. 화면 구성은 레퍼런스로만 쓰고, 디자인은 `/replica-design`에서 새로 만듭니다.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Google Play (Android, 이번 대상) | https://play.google.com/store/apps/details?id=com.mayacrew.rolliescam | 서버에서는 본문을 읽지 못함. 검색 요약 기준으로 캡슐 뽑기, 롤 팩, 'Tasting Box' 구매가 있음 |
| 2 | App Store JP (iOS판) | https://apps.apple.com/jp/app/rollies-%E3%83%95%E3%82%A3%E3%83%AB%E3%83%A0%E3%82%AB%E3%83%A1%E3%83%A9/id6805318319 | 기능 설명, 업데이트 기록(1.0.14~1.0.25), 리뷰 불만이 가장 풍부한 소스 |
| 3 | 같은 회사의 다른 앱 (ROLLIE'S 35mm) | https://play.google.com/store/apps/details?id=com.mayacrew.rollies | 이전 앱으로 보임. 참고만 함 |
| 4 | 사용자 본인 기기에서 직접 써보기 | (본인 폰) | **아직 안 함.** 화면 상태(빈 갤러리, 권한 거부, 현상 중)를 캡처해서 `screens/`에 두면 정확도가 크게 올라감 |

## Core loop

장비(바디+렌즈+필름)를 고르면 뷰파인더에 그 느낌이 실시간으로 보이고, 셔터를 누를 때마다 롤이 한 컷씩 줄어들고, 현상된 사진을 갤러리에서 꺼내 보는 "진짜 필름 카메라를 쓰는 느낌".

## Screens

| ID | screen | route / how to reach | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | 첫 실행 / 권한 요청 | 처음 실행할 때 | 카메라 권한(필수), 사진 권한, 위치 권한(선택) 받기 | 안내 카드, 권한 버튼 | 허용, 거부, 영구 거부(설정으로 이동) |
| S02 | 카메라 (메인) | 앱 실행 | 실시간 필터 프리뷰로 촬영 | 뷰파인더, 셔터, 남은 컷 카운터, 노출 다이얼, 전후면 전환, 플래시, 필름 레버(설정 진입), 장비 버튼, 갤러리 썸네일 | 프리뷰 중, 절전으로 어두워짐, AE/AF 잠금, 타이머 카운트다운, 롤 교체 애니메이션, 카메라 오류 |
| S03 | 필름 선반 | S02의 필름 버튼 | 필름을 고르고 탭해서 바로 미리보기 | 카테고리 탭(파스텔/골드/그린/흑백…), 필름 카드 그리드 | 선택됨, 잠김(유료/뽑기), 새로 얻음 |
| S04 | 바디 선택 | S02의 장비 버튼 | 카메라 바디 고르기 | 가로 캐러셀, 바디 일러스트 | 선택됨, 잠김 |
| S05 | 렌즈 선택 | S02의 장비 버튼 | 렌즈 고르기 (처음엔 28mm) | 가로 캐러셀 | 선택됨, 잠김 |
| S06 | 롤 다 씀 / 현상 중 | 36컷째를 찍은 직후 | 롤을 마무리하고 현상하기, 새 롤 장착 | 진행 표시, 애니메이션 | 현상 중, 현상 완료 |
| S07 | 갤러리 (롤 목록) | S02의 썸네일 | 롤별로 묶어서 보기 | 롤 카드(필름명, 날짜, 컷 수) | 비어 있음, 채워짐, 현상 대기 중인 롤 |
| S08 | 롤 상세 (그리드) | S07에서 롤 탭 | 한 롤의 사진 그리드 | 사진 그리드, 다중 선택 | 채워짐, 선택 모드 |
| S09 | 사진 뷰어 | S08에서 사진 탭 | 크게 보기, 저장, 공유, 삭제 | 핀치/더블탭 확대, 스와이프 넘기기, 하단 액션 바 | 저장 완료 토스트, 삭제 확인 |
| S10 | 설정 | S02의 필름 레버 | 촬영 옵션 바꾸기 | 토글, 세그먼트(타이머 off/3/10) | 셔터음 변경 불가 기기 안내 |
| S11 | 사진 권한 꺼짐 안내 | 저장 실패 시 | 설정 앱으로 바로 가기 | 다이얼로그 | — |
| S12 | 스토어 / 필름 팩 (should) | S03에서 잠긴 필름 탭 | 유료 팩 구매 | 팩 카드, 구매 버튼 | 로딩, 구매 완료, 실패, 복원 |
| S13 | 캡슐 뽑기 (could) | S03 배너 | 매일 무료로 필름 하나 얻기 | 뽑기 애니메이션 | 오늘 가능, 이미 뽑음 |

## Flows

```
F01 처음 쓰는 사람이 첫 사진 찍기
    S01 -> S02 -> (셔터)
    해피 패스 클릭 수: 2 (권한 허용, 셔터)
    edge: 카메라 권한 거부 / 영구 거부, 카메라를 쓸 수 없는 기기, 다른 앱이 카메라를 쓰는 중

F02 필름 바꿔서 찍기
    S02 -> S03 -> (필름 탭하면 프리뷰가 바로 바뀜) -> S02 -> 셔터
    해피 패스 클릭 수: 3
    edge: 잠긴 필름 탭(S12로 이동), 롤 중간에 필름 바꾸기 (원본 동작 확인 필요. 롤 = 필름 1종이 자연스러움)

F03 장비 꾸리기 (바디 + 렌즈)
    S02 -> S04 -> S05 -> S02
    해피 패스 클릭 수: 4

F04 롤 다 쓰고 현상하기
    S02 (36번째 셔터) -> S06 -> 새 롤 자동 장착 -> S02
    edge: 현상 중에 앱 종료하기 (현상 상태가 저장돼야 함)

F05 사진 보고 저장 / 공유하기
    S02 -> S07 -> S08 -> S09 -> 저장 또는 공유
    해피 패스 클릭 수: 4
    edge: 사진 권한 꺼짐(S11), 저장 공간 부족, 가로 사진 방향

F06 설정 바꾸기
    S02 -> S10 (타이머 / 셔터음 / 볼륨 셔터 / 고해상도 / 위치)

F07 필름 팩 사기 (should)
    S03 -> S12 -> Play 결제 -> S03 (해금됨)
    edge: 결제 취소, 기기 바꾼 뒤 구매 복원
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| Viewfinder | photo, (movie) | live, dimmed, locked, error | S02 |
| ShutterButton | photo, timer | idle, pressed, disabled (롤 교체 중) | S02 |
| ExposureDial | — | 드래그 중, 0 | S02 |
| FrameCounter | — | n/36, 마지막 컷 | S02 |
| FilmCard | normal, locked, new | selected, pressed | S03 |
| GearCarousel | body, lens | selected, locked | S04, S05 |
| RollCard | developing, ready | — | S07 |
| PhotoGrid | — | normal, select mode | S08 |
| ZoomableImage | — | fit, zoomed | S09 |
| ActionBar | — | — | S09 |
| SettingsRow | toggle, segmented, link | on, off, disabled | S10 |
| PermissionCard / Dialog | camera, photos, location | — | S01, S11 |
| Toast | success, error | — | 전체 |
| PackCard | — | loading, owned, buy | S12 |

## Inferred data model

로컬 전용 앱입니다. 계정과 서버가 없고 사진은 기기에만 저장합니다(원본도 같음). Room/SQLite에 저장합니다.

```
Film      id, name, category (pastel|gold|green|mono|…), lut_asset, grain, halation,
          light_leak, vignette, date_stamp_style, is_free, pack_id?
          evidence: S03 카테고리, 스토어 설명 "100종 필름"   confidence: high (구조) / guess (파라미터)

Body      id, name, vignette, frame_overlay, color_shift, is_free
Lens      id, name, focal_mm, distortion, blur, chromatic_aberration, is_free
          evidence: 스토어 설명 "바디, 렌즈, 필름 조합", "처음엔 28mm"   confidence: high

Roll      id, film_id, body_id, lens_id, capacity(36), shot_count,
          status (loading|shooting|developing|developed), started_at, developed_at
          evidence: "36컷", "자동으로 새 롤 장착", "현상"   confidence: high (필드는 guess)

Photo     id, roll_id, file_uri, width, height, orientation, taken_at,
          exposure_ev, lat?, lng?, saved_to_gallery(bool)
          evidence: S09, 위치 태그 옵션   confidence: medium

Settings  timer(0|3|10), shutter_sound, volume_shutter, high_res, location_tag, develop_delay
          evidence: 1.0.22 업데이트 기록   confidence: high

Entitlement  pack_id, purchase_token, acquired_at, source (purchase|capsule)
          evidence: Play 설명의 롤 팩 / Tasting Box / 캡슐   confidence: medium
```

관계: Roll n-1 Film, Roll n-1 Body, Roll n-1 Lens, Roll 1-n Photo, Pack 1-n Film, Entitlement n-1 Pack

## Feature matrix

`features.csv`를 보세요. must: 15, should: 10, could: 4, skip: 5 (개인 사용용이라 과금 기능 2개를 skip으로 옮김)

## Out of scope (cannot or should not be cloned)

- 원본의 앱 이름, 로고, 카메라 바디 일러스트, UI 그래픽, 필름 이름: 원본 회사 소유. 새 이름과 디자인은 `/replica-brand`, `/replica-design`에서 만듭니다.
- 원본의 LUT와 필터 데이터: 원본 회사의 자산이고 앱을 뜯어서 꺼내면 안 됩니다. 직접 색 보정해서 만듭니다(무료 LUT 중 라이선스가 맞는 것은 출발점으로 쓸 수 있음).
- 실제 필름 브랜드명(Portra, Superia 등): 상표권 때문에 쓰지 않습니다. 직접 지은 이름(예: "Warm 400")을 씁니다.
- 무비 모드: 기술적으로는 가능하지만 범위가 커서 v2로 미룹니다.

## Size

화면 11개(+스토어/뽑기 2개), 플로우 7개, 엔티티 7개.

어려운 부분:
1. **실시간 GPU 필터 파이프라인.** CameraX → OpenGL ES/AGSL 셰이더로 LUT + 그레인 + 빛샘 + 비네팅 + 렌즈 왜곡을 30fps로 처리하고, 촬영한 원본 해상도에도 같은 결과를 내야 합니다.
2. **발열과 배터리.** 원본 리뷰 불만 1위입니다. 프리뷰 해상도 낮추기, 절전 모드, 백그라운드에서 카메라 해제를 처음부터 넣어야 합니다.
3. **필름 룩 제작.** 코드가 아니라 색 보정 작업입니다. 필름 20~30종을 직접 만들어야 하고, 앱의 품질이 여기서 결정됩니다.
4. 기기 파편화: 안드로이드 카메라 방향, 셔터음 정책, Play Billing.

크기: **M** (몇 주). 필름 30종, 바디 3개, 렌즈 3개로 v1을 출시하는 기준입니다. 무비 모드를 넣으면 L.

권장 스택(아키텍트 단계에서 확정): Kotlin + Jetpack Compose + CameraX + OpenGL ES 셰이더 + Room. 크로스플랫폼을 원하면 Flutter + 네이티브 카메라 플러그인도 가능하지만, 실시간 셰이더 파이프라인은 네이티브가 훨씬 수월합니다.
