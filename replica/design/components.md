# Components: 다크룸 디자인 시스템

컨셉: **현상실(Darkroom).** 검은 벽(`bg`), 인화지 크림색 글자(`text`), 안전등 앰버(`accent`)를 씁니다. 장식은 최소로 줄이고 뷰파인더가 주인공입니다. 숫자 정보(컷 수, EV, 필름 코드)는 모두 모노 글꼴로 표시해서 "기계 다이얼" 느낌을 냅니다.

원본에서 가져오지 않은 것: 앱 이름, 로고, 카메라 바디 일러스트, 아이콘, 문구, 브랜드 색, 화면 배치. 원본 스크린샷을 보지 않고 기능 목록만으로 새로 설계했습니다.

- 글꼴: Pretendard(UI), IBM Plex Mono(숫자). 둘 다 OFL이라 `res/font`에 넣어서 배포할 수 있습니다.
- 아이콘: Material Symbols Rounded (Apache 2.0). 선택된 상태는 fill 1로 표시합니다.
- 필름 카드의 색 견본: 우리가 만든 LUT를 같은 기준 그라데이션 이미지에 적용해서 **빌드할 때 자동 생성**합니다(`tools/lutgen`). 사진이나 일러스트를 따로 쓰지 않습니다.
- 바디/렌즈 그림: v1은 그림 없이 아이콘과 스펙 텍스트로 표시합니다. 일러스트는 나중에 직접 그리거나 생성합니다.

공통 규칙:
- 터치 영역은 최소 48dp입니다(`size.touch-min`).
- 아이콘만 있는 버튼에는 모두 `contentDescription`(한국어)을 붙입니다.
- 포커스 링은 2dp `accent`입니다(키보드나 D-pad로 조작할 때).
- 시스템의 "애니메이션 줄이기"가 켜져 있으면 `motion.advance`(감기 애니메이션)를 `fast` 페이드로 바꿉니다.
- 색은 `FilmColors.*`만 씁니다. 컴포넌트 안에 hex 값을 직접 넣지 않습니다.

---

## 화면 배치 (S02 카메라)

```
┌──────────────────────────────┐
│ ⚡  ⏱3  ▦        ⟲   ⚙(레버) │  TopBar 56dp: 플래시 · 타이머 · 그리드 · 전후면 · 설정
├──────────────────────────────┤
│▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌│  필름 가장자리 띠 (스프로킷 구멍 패턴, 장식 4dp)
│                              │
│         Viewfinder 3:4       │  탭 = 초점/노출, 길게 = AE/AF 잠금
│                              │
│ 12/36           WARM 400 ±0.3│  FrameCounter(mono) · FilmTag · EV
│▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌▌│
├──────────────────────────────┤
│ ─┼─┼─┼─┼─●─┼─┼─┼─┼─  EV      │  ExposureDial (가로 눈금자)
│                              │
│  [▣]        (◉)        [◐]  │  GalleryThumb · ShutterButton · GearButton
└──────────────────────────────┘  ControlDeck 196dp
```

S04와 S05(바디, 렌즈)는 **하나의 GearSheet에 탭으로 합쳤습니다.** 그래서 F03 해피 패스가 4클릭에서 3클릭으로 줄어듭니다. 필름 선반(S03)도 같은 바텀시트 패턴을 씁니다.

---

## Viewfinder
```
  variants  photo (v1), movie (v2)
  states    live, focusing(포커스 링 애니메이션), locked(AE/AF 잠금 배지), dimmed(절전: 70% 검은 막 + "탭해서 깨우기"),
            paused(카메라 해제: 마지막 프레임 정지 + 아이콘), error(카메라를 열 수 없음 + 다시 시도), no-permission(→ S01)
  tokens    frame viewfinder-frame, 글자 on-viewfinder, 그리드 선 on-viewfinder 30%
  behavior  탭 → focusAt, 길게 누름(500ms) → lockAeAf (배지 "AE/AF 잠금"), 핀치 → 줌(렌즈 화각 범위 안)
  a11y      contentDescription "뷰파인더, 현재 필름 {이름}". 탭 초점은 TalkBack에서 끄고 셔터만 남김
  used on   S02
```

## ShutterButton
```
  size      76dp, 바깥 링 4dp text, 안쪽 원 text
  states    idle, pressed(안쪽 원 0.9배 + 햅틱), capturing(비활성), timer(링에 accent 진행 + 숫자),
            advancing(롤 교체 중 비활성, 링 회전), disabled(카메라 없음)
  tokens    링 text, 눌림 accent, 타이머 진행 accent
  input     볼륨 키(설정이 켜졌을 때)도 같은 onShoot를 호출
  a11y      Role.Button, "셔터, 남은 컷 {n}장". 타이머 중에는 "타이머 {n}초, 다시 누르면 취소"
  used on   S02
```

## FrameCounter
```
  format    "12/36". 마지막 3컷은 숫자가 warning 색, 마지막 컷은 "36/36 · 마지막"
  tokens    type counter(mono 22), on-viewfinder
  motion    셔터를 누를 때 숫자가 위로 밀려 올라감 (fast)
  a11y      liveRegion polite: "남은 컷 {n}장"
  used on   S02
```

## ExposureDial
```
  shape     가로 눈금자, -2.0 ~ +2.0, 1/3 스텝, 중앙에 accent 바늘
  states    idle(0이면 muted), dragging(값이 크게 표시됨), nonzero(뷰파인더에 EV 표시), locked(AE 잠금 시 비활성)
  behavior  드래그하면 스텝마다 햅틱. 더블탭하면 0으로 리셋
  a11y      Slider semantics, "노출 {+0.3}", 볼륨 키가 아닌 스와이프 업/다운으로 조절
  used on   S02
```

## TopBarIconButton
```
  variants  toggle(플래시 off/on/auto, 그리드), cycle(타이머 0/3/10), action(전후면, 설정)
  states    default(text-muted), active(text + fill 1), disabled(전면 카메라에 플래시 없음 → 40% + 안내 토스트)
  size      48dp 터치, 24dp 아이콘
  a11y      "플래시: 자동" 처럼 현재 값까지 읽음
  used on   S02
```

## GalleryThumb
```
  states    empty(빈 롤 아이콘), developing(필름 통 아이콘 + accent 점), ready(마지막 현상 사진 썸네일)
  size      48dp, radius sm, border 1dp border
  a11y      "갤러리", developing일 때 "갤러리, 현상 중 1롤"
  used on   S02
```

## GearButton
```
  content   현재 필름 색 견본 원 + 아래에 렌즈 화각 "28"(caption)
  behavior  탭 → GearSheet(바디/렌즈 탭), 필름 띠(FilmTag)를 탭 → FilmShelfSheet
  a11y      "장비 바꾸기, 바디 {이름}, 렌즈 {mm}mm"
  used on   S02
```

## BottomSheet (FilmShelfSheet, GearSheet 공통)
```
  surface   surface, 위쪽 radius lg, 손잡이 32x4dp border
  states    half(뷰파인더가 위에 보임: 고르면 프리뷰가 바로 바뀜), expanded, dismissing
  behavior  바깥을 탭하거나 아래로 스와이프하거나 뒤로가기를 누르면 닫힘. 열려 있어도 프리뷰는 계속 렌더
  a11y      열리면 제목("필름 고르기")으로 포커스 이동, 닫히면 연 버튼으로 돌아감
  used on   S03, S04/S05
```

## CategoryChips
```
  variants  필름: 전체 · 컬러 · 따뜻함 · 차가움 · 파스텔 · 흑백 · 특수
  states    default(surface-raised, text-muted), selected(accent 바탕, on-accent), pressed
  size      높이 32dp(터치 48dp), radius pill
  a11y      선택 상태를 읽음 ("따뜻함, 선택됨")
  used on   S03
```

## FilmCard
```
  layout    색 견본(자동 생성 정사각형) + 이름(sm/600) + 코드(caption mono, 예: "W400")
  states    default, selected(accent 2dp 테두리 + 체크), pressed, new(최근 추가 · accent 점)
            locked 없음: 개인 사용용이라 전부 해금
  tokens    surface-raised, radius md
  behavior  탭하면 프리뷰에 바로 적용. 롤 도중이면 RollSwapDialog
  a11y      "{이름}, {카테고리}", 선택됨
  used on   S03
```

## GearCard (바디/렌즈)
```
  layout    아이콘 + 이름 + 특성 2줄 (바디: "따뜻한 색 · 강한 비네팅" / 렌즈: "28mm · 약한 왜곡")
  states    default, selected, pressed
  a11y      "{이름}, {특성}"
  used on   S04/S05 (GearSheet)
```

## Dialog (RollSwapDialog, DeleteConfirm, PermissionRationale)
```
  surface   surface-raised, radius lg, 가로 최대 320dp
  buttons   오른쪽 정렬: 취소(ghost) · 확인(primary). 위험한 작업이면 확인을 danger로
  copy      RollSwapDialog: "필름을 바꾸면 지금 롤({n}/36)을 여기서 마감하고 현상해요." [계속 찍기] [바꾸기]
            DeleteConfirm: "사진 {n}장을 지울까요? 사진첩에 저장한 사본은 그대로 남아요." [취소] [지우기]
  a11y      열리면 제목에 포커스, 뒤로가기 = 취소
  used on   S02, S03, S08, S09, S11
```

## Button
```
  variants  primary(accent / on-accent), secondary(surface-raised / text, border 1dp border), ghost(text), danger(danger 글자, ghost)
  sizes     md 40dp(터치 48), lg 52dp
  states    default, pressed(밝기 -8%), focus(2dp accent 링), disabled(40%), loading(라벨 유지 + 작은 스피너)
  tokens    radius md, type sm/600
  used on   S01, S06, S09, S10, S11, Dialog
```

## RollAdvanceOverlay (S06)
```
  trigger   36번째 컷 직후
  content   필름 통이 감기는 애니메이션(advance 480ms) → "롤을 다 썼어요 · 현상 중" 또는 "현상까지 1시간" → 새 롤 장착 표시
  states    developing-now(진행 바), developing-later(남은 시간), done
  behavior  애니메이션 중에는 셔터를 막음. 탭하면 갤러리로 이동
  a11y      liveRegion assertive로 한 번 읽음
  used on   S06
```

## RollCard (S07)
```
  layout    가로 카드: 첫 컷 썸네일 3장 겹침 + 필름 이름 + "36컷 · 11월 4일" + 상태 배지
  states    developing(썸네일 대신 필름 통 + "현상까지 42분"), developed, shooting(현재 롤 · "12/36")
  empty     갤러리가 비었을 때: 큰 필름 통 아이콘 + "아직 현상한 롤이 없어요" + [촬영하러 가기]
  used on   S07
```

## PhotoGrid (S08)
```
  layout    3열, 간격 2dp, 정사각형 크롭
  states    normal, select mode(길게 눌러 진입, 체크 원, 상단 바에 "{n}장 선택" + 공유·저장·삭제)
  a11y      "{n}번째 컷, {날짜}", 선택 모드에서 "선택됨"
  used on   S08
```

## ZoomableImage + ActionBar (S09)
```
  behavior  핀치 확대(최대 5배), 더블탭 2.5배/원래 크기, 좌우 스와이프로 넘기기, 탭하면 UI 숨김
  actionbar 저장(이미 저장했으면 체크 표시) · 공유 · 정보(EXIF 시트) · 삭제(danger)
  tokens    배경 viewfinder-frame, 바 surface 90%
  used on   S09
```

## SettingsRow (S10)
```
  variants  toggle(Switch: accent 트랙), segmented(타이머 끔/3초/10초, 현상 지연 즉시/1시간/내일 아침), link(앱 정보, 오픈소스 라이선스)
  states    on, off, disabled + 보조 설명 (예: 셔터음 강제 기기: "이 기기는 셔터음을 끌 수 없어요")
  layout    제목 base + 설명 sm text-muted, 높이 최소 56dp
  used on   S10
```

## PermissionCard (S01) / PermissionBanner (S11)
```
  S01       전체 화면: 아이콘 + "카메라를 쓰려면 권한이 필요해요" + [허용하기](primary). 영구 거부면 [설정 열기]
  S11       저장 실패 시 다이얼로그: "사진첩에 저장할 수 없어요" + [설정 열기] [닫기]
  a11y      제목을 heading으로 표시
```

## Toast / Snackbar
```
  variants  info(surface-raised / text), success(왼쪽 아이콘 success), error(아이콘 danger)
  position  ControlDeck 바로 위, 2.5초
  a11y      liveRegion polite
  예시       "사진첩에 저장했어요" · "전면 카메라는 플래시가 없어요" · "AE/AF 잠금"
```

---

## 화면별 사용 컴포넌트

| 화면 | 컴포넌트 |
| --- | --- |
| S01 권한 | PermissionCard, Button |
| S02 카메라 | TopBarIconButton, Viewfinder, FrameCounter, ExposureDial, ShutterButton, GalleryThumb, GearButton, Toast |
| S03 필름 선반 | BottomSheet, CategoryChips, FilmCard, Dialog(RollSwap) |
| S04/S05 장비 | BottomSheet(탭 2개), GearCard |
| S06 롤 교체 | RollAdvanceOverlay |
| S07 갤러리 | RollCard(+empty) |
| S08 롤 상세 | PhotoGrid, Dialog(Delete) |
| S09 뷰어 | ZoomableImage, ActionBar, Dialog(Delete), Toast |
| S10 설정 | SettingsRow |
| S11 권한 안내 | PermissionBanner(Dialog), Button |
