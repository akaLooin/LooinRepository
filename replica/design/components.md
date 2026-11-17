# UI 부품 명세 (Looin Idle)

토큰: `tokens.json` → `game/src/ui/tokens.css`(자동 생성). 부품 CSS: `game/src/ui/components.css`.
확인 페이지: `npm run dev` 후 `/design.html`. 모든 크기는 기준 단위 `--u`(화면 높이 3.7%)에 비례.
색은 역할 토큰만 씁니다. 원작의 아이콘·그림·글꼴은 쓰지 않고, 아이콘은 직접 그린 픽셀 SVG, 글꼴은 Galmuri(OFL).

참고 화면(`replica/screens/S03-town-hud.jpg`)에서 가져온 것은 **배치 규칙**뿐입니다:
화면 맨 아래 전체 폭 바, 왼쪽 요약 → 가운데 게이지 세 줄 → 오른쪽 정사각 메뉴 버튼 한 줄.

```
하단 바 (BottomBar)
  구성     요약(얼굴·이름·직업·레벨) | 게이지(HP/MP/XP) | 메뉴 버튼 8개
  크기     높이 = max(52px, 화면 높이 12.5%). 버튼은 바 높이에 맞춘 정사각형, 최소 44px
  상태     기본, 알림(버튼에 빨간 점), AUTO 켜짐(초록)
  토큰     bg surface, 윗선 border, 요약·게이지 칸 surface-inset
  접근성   버튼은 실제 <button>, aria-label에 기능 이름, 알림은 aria-label에 "새 항목 있음" 덧붙임
  쓰는 곳  S03, S04

메뉴 버튼 (MenuButton)
  변형     일반, 토글(AUTO)
  상태     기본, 눌림(1단 내려감·어두워짐), 켜짐, 알림 점, 포커스(focus 테두리)
  토큰     bg surface-raised, text, radius md, shadow bevel, 글자 xs
  내용     위 아이콘(픽셀 SVG) + 아래 라벨
  쓰는 곳  S04

버튼 (Button)
  변형     기본, primary(accent), success, danger
  크기     sm(글자 sm), md(최소 높이 44px), block(전체 폭)
  상태     기본, 눌림, 포커스, 비활성(45% 투명), 진행 중(라벨 유지 + 비활성)
  토큰     bg surface-raised / accent / success / danger, text / on-*, radius md, shadow bevel
  접근성   <button>, 비활성은 disabled 속성
  쓰는 곳  모든 창

게이지 (Bar)
  변형     hp, mp, xp, skill(기술 경험치·생산 진행)
  상태     비율 0~100%(변화는 150ms로 부드럽게), 가득
  토큰     바탕 surface-inset, 채움 bar-*, 글자 on-bar(xs)
  접근성   role="progressbar", aria-valuenow/max, 글자로 수치 표시
  쓰는 곳  S04, S06, S12, S13

창 (Window)
  구성     머리(제목 + 닫기) / 본문(스크롤) / 선택: 탭 줄
  크기     최대 폭 72vw(46em 이하), 최대 높이 82vh
  상태     열림(튀어나오는 150ms), 닫힘. 바깥 터치로 닫기(보상 창은 예외)
  토큰     bg surface, 머리 surface-raised, 제목 text-accent(lg), 테두리 border
  접근성   role="dialog", aria-labelledby=제목, 열리면 첫 버튼에 포커스, Esc로 닫기
  쓰는 곳  S05~S19

탭 (Tabs)
  상태     선택(accent), 기본(surface-inset·text-muted), 잠김(비활성 + 해금 조건 툴팁)
  접근성   role="tablist"/"tab"/"tabpanel", aria-selected, 좌우 화살표 키 이동
  쓰는 곳  S07(직업 단계), S08(세트), S11(모루 단계), S05(가방 페이지)

칸 (Slot) — 아이템·레시피·특성·카드·공격 바 공용
  크기     44px 이상 정사각
  상태     빈 칸, 아이템+수량, 선택(accent 테두리), 잠김(자물쇠·45%), 재료 부족(흑백),
           제작 가능(text-good 테두리), 희귀도 테두리(r2~r4), 재사용 대기(어둡게 + 남은 초)
  변형     사각, 원형(공격 바 스킬)
  접근성   <button>, aria-label = 이름 + 수량/레벨, 선택은 aria-selected
  쓰는 곳  S05, S07, S08, S11, S12, S14, S15, S04(공격 바)

칸 격자 (Grid)
  규칙     칸 크기 고정, 열 수는 창 폭에 맞춰 자동. 페이지가 넘치면 탭으로 나눔(스크롤보다 우선)
  쓰는 곳  S05, S11, S14

상세 (Detail)
  구성     큰 아이콘 + 이름 + 분류·조건 / 효과(text-good) / 재료 목록(보유/필요) / 행동 버튼
  상태     선택 없음("칸을 고르세요"), 조건 불충족(text-bad로 해당 줄 표시)
  쓰는 곳  S05, S11, S07, S08, S15

키-값 표 (KV)
  규칙     왼쪽 이름(text), 오른쪽 값(text-accent, 오른쪽 정렬)
  쓰는 곳  S06, S09, S10

대화 상자 (Dialog)
  구성     왼쪽 말하는 이(얼굴·이름) / 오른쪽 대사 + 요구 조건 + 보상 + 버튼
  상태     수락 전, 진행 중(진행도), 완료 가능(success 버튼), 할 일 없음
  쓰는 곳  S16

말풍선 (Bubble) — NPC 머리 위
  변형     퀘스트 있음(!), 진행 중(…), 완료 가능(? · accent)
  쓰는 곳  S03

알림 (Toast)
  규칙     화면 왼쪽, 하단 바 위에 최대 5개, 2.6초 뒤 사라짐. 아이콘 + 짧은 글
  쓰는 곳  S03

떠오르는 숫자 (FloatText) — 캔버스에서 그림
  변형     피해(흰색), 치명타(text-accent·크게·느낌표), 받은 피해(text-bad), 빗나감, 회복(text-good)
  동작     커지며 등장 160ms → 위로 20 떠오름 750ms → 사라짐

대상 표시 (TargetArrow) — 캔버스에서 그림
  규칙     지정한 몬스터·자원·포탈·NPC 위에 위아래로 흔들리는 화살표

입력 (Input)
  상태     기본(border-input), 포커스(focus 테두리), 오류(text-bad 안내 문구)
  쓰는 곳  S02, 채팅
