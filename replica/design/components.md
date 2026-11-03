# 컴포넌트 명세: todo mate 클론

토큰: `tokens.json`(다크), `tokens.light.json`(라이트). 앱에서는 `app/src/theme/tokens.ts`로 옮겨 쓴다.
크기 단위: dp (React Native의 숫자 단위와 같음). 화면 ID는 `replica/recon.md` 기준.

## 공통 규칙

- **색은 토큰 이름으로만** 쓴다. 컴포넌트 안에 `#` 색상 코드를 직접 쓰지 않는다. 예외는 사용자가 정한 카테고리 색 하나뿐이다.
- **카테고리 색은 사용자가 입력한 값**이라 토큰이 아니다. 그 색 위에 올라가는 글자나 체크는 `onColor(색)` 함수로 정한다. 흰색이 3:1 이상이면 흰색, 아니면 검정이다. 원본의 기본 초록 `#00ff7f`은 흰색과의 대비가 1.4:1이라 검정 체크·숫자가 된다.
- **배경과 거의 같은 카테고리 색**(라이트 테마의 흰색 등)은 클로버를 칠할 때 `text` 색으로 대신한다(`visibleOn`).
- **라이트 테마의 카테고리 이름 글자**는 카테고리 색을 그대로 쓰되, 배경과의 대비가 4.5:1보다 낮으면 같은 색조를 대비가 맞을 때까지 어둡게 한다(`readableOn(색, 배경)`).
- **누를 수 있는 곳은 최소 44×44dp.** 클로버(24dp)처럼 작은 것은 터치 영역을 넓힌다(`hitSlop`).
- **화면 읽기 프로그램**: 모든 버튼에 `accessibilityRole`과 `accessibilityLabel`을 단다. 체크박스는 `accessibilityState={{ checked }}`를 쓴다.
- **아이콘**은 Lucide(오픈소스)를 쓰고, 클로버·로고 같은 고유 모양은 직접 SVG로 그린다. 원본 이미지나 아이콘 파일은 쓰지 않는다.
- **문구**는 기능 이름(카테고리 관리, 루틴, 확인, 삭제 등)은 그대로 둔다. 안내 문구와 빈 화면 문구는 새로 쓴다(replica-brand 단계에서 확정).

## 기본 요소

```
Clover (클로버)
  모양      원 4개가 겹친 네잎. 원 지름 = 전체 크기의 0.6, 중심은 사방으로 0.2씩 이동 (직접 그린 SVG)
  크기      calendar 24, todo 25, info 48 (S05b 큰 클로버)
  상태      empty      clover-empty 채움, 안에 아무것도 없음 (할 일 없는 날)
            count      clover-empty 채움, 안에 남은 수 (type.date, text)
            done       카테고리 색 채움, 안에 체크 (onColor)
            partial    카테고리 색과 clover-empty로 나눠 칠함. 완료 비율만큼 색칠, 체크 표시 (S03 3일)
            doneCount  카테고리 색 채움, 안에 남은 수 (S03 1일: 다른 카테고리에 남은 할 일)
            todoOpen   할 일 줄 미완료: 흰색(다크) / clover-empty(라이트) 채움
            todoDone   할 일 줄 완료: 카테고리 색 채움과 체크
            fill       색만 채움 (캘린더 카테고리 거르기 버튼)
  눌림      0.9배로 줄었다가 돌아옴 (motion.fast)
  a11y      checkbox 역할, "운동하기: 어깨, 완료됨" 식으로 읽음. 터치 영역 44
  사용      S03, S05b, S13

Pill (알약)
  변형      chip         높이 42, 배경 surface, 좌우 여백 8~16, 사진 34 + 이름 (S03 사람 칩)
            chipSelected 배경 selected-bg, 글자 on-selected
            chipIcon     지름 42 원, 아이콘만 (보관함, 친구)
            category     높이 38, 배경 surface, [공개 아이콘 16][이름 type.category, 카테고리 색][+ 원 30, 배경 bg]
            button       높이 34, 테두리 1 surface-strong, 글자 type.body ("주"/"월")
            iconButton   지름 34, 테두리 1 surface-strong, 아이콘 ‹ ›
            dropdown     높이 34, 클로버 아이콘 + ▼ (캘린더 카테고리 거르기)
            add          높이 38, 배경 surface-strong, "+ 추가하기" (S06, S21, S22)
  모서리    radius.pill
  상태      기본, 눌림(배경 한 단계 밝게), 비활성(글자 text-muted)
  사용      S03, S06, S07, S21, S22

ListRow (목록 줄)
  변형      settings     아이콘 24 + 글자 type.body-lg, 높이 56, 배경 없음 (S12)
            value        글자 + 오른쪽 값(type.body, text) + 꺾쇠 › (text-muted) (S12d 아래쪽, S07b, S06b)
            toggle       글자 + 오른쪽 Toggle (S12d 위쪽)
            sheetMenu    색 원 아이콘 30(menu-* 색, 흰 아이콘) + 글자 type.body-lg, 높이 66 (S05)
            radio        라디오 + 글자, 배경 surface-row, 줄 사이 1dp bg 색 선 (S07c, S21b 타입)
            routine      "진행 중"(info) | 이모지 이름 / 둘째 줄 기간과 규칙(type.small, text-secondary) / 꺾쇠 (S07)
            pillRow      배경 surface-input, radius.pill, 높이 52, 왼쪽 이름, 오른쪽 D-n(dday) 또는 "편집" (S21, S06)
  구분선    settings 목록은 divider 1dp
  상태      기본, 눌림(배경 surface-row), 비활성
  a11y      줄 전체가 하나의 버튼. value 줄은 "반복, 매일" 식으로 읽음
  사용      S05, S06, S06b, S07, S07b, S07c, S12, S12d, S21, S21b

FieldGroup (편집 칸 묶음)
  모양      배경 surface-input, radius.lg(20), 줄 높이 64, 좌우 여백 20
            시작 날짜 / 종료 날짜처럼 붙은 칸은 한 덩어리로 묶고 사이에 1dp bg 색 선 (S07b)
  사용      S06b, S07b, S21b

TitleInput (제목 입력)
  모양      위아래 여백 16, 글자 type.body-lg, 아래 2dp 밑줄
  밑줄색    카테고리 색 (S06b, S07b), 디데이는 text (S21b)
  상태      비어 있음(placeholder), 입력 중, 오류(밑줄 danger + 아래 helper 글자)
  사용      S04, S06b, S07b, S21b

Toggle (토글)
  크기      54×30, 손잡이 26
  상태      켜짐: 트랙 toggle-on, 손잡이 오른쪽, 트랙 안 왼쪽에 "ON"(type.toggle-label)
            꺼짐: 트랙 toggle-off, 손잡이 왼쪽, 트랙 안 오른쪽에 "OFF"
            비활성: 전체 투명도 0.4
  움직임    motion.base
  a11y      switch 역할, 켜짐 상태를 읽음
  사용      S05a, S07b, S12d, S21b

Radio (라디오)
  크기      22 원
  상태      꺼짐: 검은 원(bg), 켜짐: 흰 원(text)  — 원본 그대로
            시트 안 큰 선택(S06c): 꺼짐 = 28 원 테두리 2 surface-strong, 켜짐 = 흰 원 + 검은 체크
  사용      S06c, S07c, S21b

Button (버튼)
  변형      sheetPrimary  배경 surface-strong, 높이 54, radius.pill, 글자 type.body-lg 700 ("확인") (S06c)
            sheetBlock    배경 surface-strong, 높이 54, radius.sm, 글자 type.body ("완료") (S07d, S22b)
            tile          배경 surface-button, 높이 96, radius.md, 아이콘 28 + 글자 (수정하기, 삭제하기) (S05)
            danger        배경 surface-input, 높이 56, radius.sm, 글자 danger ("삭제") (S07b, S06b)
            plain         배경 surface-row, 높이 50, radius.sm ("종료하기") (S06b)
            text          헤더 오른쪽 "확인"/"완료", 글자 type.body-lg
            play          배경 surface-input 알약 64, 왼쪽 검은 원 56 + 파란 재생 삼각형(play), "시작하기" (S08)
  상태      기본, 눌림, 비활성(투명도 0.4), 저장 중(글자 유지 + 작은 로딩)
  사용      S05, S06b, S06c, S07b, S07d, S08, S22b

TimeGrid (시간 선택)
  모양      "시" 라벨, 0~23 원(time-cell 50) 6열, "분" 라벨, 00~55(5분 단위) 6열
  상태      기본: surface-row 원, 흰 숫자 / 선택: 흰 원, 검은 숫자
  a11y      각 원은 radio. "23시", "55분"으로 읽음
  사용      S07d, S22b, (할 일 시간 알림)

ColorCodeInput (색상 코드 입력)  ← 원본과 다른 부분 (사용자 요청)
  모양      미리보기 클로버 48 + "#" 붙은 입력칸(대문자 6자리) + 자주 쓰는 색 8개 원
  규칙      #RRGGBB만 허용, 3자리(#0F8)는 6자리로 늘려 줌, 소문자 입력은 대문자로 표시
  상태      올바름(미리보기 갱신), 올바르지 않음(밑줄 danger, "6자리 색상 코드를 입력해 주세요"),
            어두운 배경에서 잘 안 보이는 색(경고만 표시하고 저장은 허용)
  사용      S06d
```

## 큰 단위

```
BottomSheet (바텀 시트)
  모양      배경 surface-raised, 위 모서리 radius.sheet, 손잡이 40×4 grabber, 위 여백 12
            제목 type.sheet-title 가운데, 오른쪽 선택 "완료"
            뒤 화면은 sheet-scrim으로 어둡게
  닫기      아래로 끌기, 뒤 배경 누르기, 안드로이드 뒤로 가기
  a11y      열리면 제목으로 초점 이동, 닫으면 연 버튼으로 초점 복귀
  사용      S05, S05a, S05b, S06c, S07d, S22b

PopupMenu (상단 메뉴)
  모양      오른쪽 위에 붙은 카드, 배경 surface-raised, radius.popup, 안쪽 여백 16
            항목은 높이 52 알약(surface), 글자 type.body-lg 가운데, 항목 사이 8
  사용      S06m

ScreenHeader (화면 머리)
  모양      높이 56, 왼쪽 ‹ 또는 ×, 가운데 제목 type.screen-title, 오른쪽 선택 글자 버튼
  사용      S06, S06b, S07, S07b, S07c, S08, S09, S12, S12d, S21, S21b, S22

Calendar (캘린더)
  머리      [dropdown] 월 제목 type.month-title ... [button 주/월] [‹] [›]
  요일 줄   type.weekday, 일요일 sunday, 토요일 saturday, 나머지 text
  칸        7열, 줄 높이 64: 위 Clover(calendar), 아래 날짜 type.date
            오늘: 날짜를 지름 32 원(selected-bg)에 on-selected 글자
            선택한 날(오늘 아님): 날짜 아래 얇은 표시 (원본 미확인, 추정)
  모드      월: 그 달 전체 / 주: 그 주 한 줄, 제목 "2026년 11월 1주차"
  변형      picker: 클로버 없이 날짜만, 선택일 흰 원 (S21b)
  a11y      날짜마다 "11월 3일 화요일, 할 일 2개 남음"
  사용      S03, S21b

ProfileHeader (프로필 머리)
  모양      사진 67 원 + [이름 type.profile-name / 자기소개 type.body text-muted / 디데이 줄 type.body 700 + D-n(dday) + ›]
            오른쪽 끝 점선 이모지 추가 버튼 34
  빈 상태   자기소개 없음: 안내 문구(text-muted), 디데이 없음: 줄 숨김
  사용      S03

TodoRow (할 일 줄)
  모양      Clover(todo) + 간격 12 + [제목 type.body-lg / 메모 type.helper text-muted] + 아래 인증 사진 카드(radius.lg)
  상태      미완료, 완료, 입력 중(TitleInput으로 바뀜, 밑줄 카테고리 색), 눌림, 끌어서 순서 바꾸는 중
  동작      클로버 누르기 = 완료 전환, 줄 누르기 = S05 시트, 두 번 누르기 = 인라인 편집(설정 켜짐일 때)
  사용      S03

BottomNav (하단 탭)
  모양      높이 64, 아이콘 5개(26) 같은 간격: 홈, 둘러보기, 알림, 보내기, 마이
  상태      선택 text, 비선택 icon-inactive
  1단계     홈과 마이만 동작, 나머지는 "준비 중" 화면
  사용      홈 계열

Timer (타이머 화면)
  모양      제목 줄, 가는 선(divider보다 밝은 surface-strong) 사이 숫자 type.timer
  상태      멈춤: 숫자 timer-idle / 실행 중: 숫자 text, 버튼 "일시정지" (실행 중 화면은 미확인, 추정)
  사용      S08
```

## 빠진 상태 (원본 스크린샷에는 없지만 만들어야 하는 것)

- 빈 화면: 카테고리 없음(홈), 루틴 없음, 디데이 없음, 리마인더 없음(S22에서 확인), 일기 없음
- 불러오는 중: 첫 동기화 동안 홈의 캘린더와 할 일 자리에 회색 막대
- 오류: 저장 실패(서버 거부, 예: 종료된 카테고리) → 할 일 줄에 작은 경고 아이콘, 누르면 이유 표시
- 오프라인: 화면 위 얇은 알림 띠 "오프라인 · 나중에 동기화됩니다"
- 권한 없음: 알림 권한 거부, 사진 권한 거부 → 설정으로 가는 안내
