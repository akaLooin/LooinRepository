# Components — Talestopia Tycoon

기준: 원작 녹화 화면(`replica/screens/`)에서 **배치와 역할**을 측정했고, 색·그림·문구는 우리 것이다.
모든 값은 `tokens.json`의 역할 이름으로만 쓴다 (`var(--c-surface)` 등, 직접 hex 금지).
픽셀 규칙: 모서리는 둥글리지 않고 **계단식으로 깎는다**(`clip-path`), 그림자는 흐림 없는 2px, 아이콘은 16×16 스프라이트를 정수 배율(×2, ×3)로만 확대.
구현: `app/src/styles/ui.css`, 견본 페이지 `app/design.html`.

```
TopBar (A)                                         S01 전체
  layout    높이 44, 왼쪽: 금화 아이콘(×2) + 금화(lg, gold) / 초당(xs, muted) 2줄
            가운데: 전설·별사탕·이야기 조각 요약 (아이콘 ×1 + xs 숫자)
            오른쪽: 설정 버튼(NavButton sm)
  tokens    bg frame, 아래 테두리 frame-trim 2px
  states    숫자 증가 시 깜빡임 없음 (텍스트만 갱신)
  a11y      금화 영역 aria-live="off" (매 틱 갱신이라 읽지 않음), 설정 버튼 aria-label

ManaBar (B)
  layout    높이 18, 가득 찬 막대 + 가운데 "영감 현재/최대 · +회복/초" (xs), 오른쪽 ⓘ 버튼
  tokens    틀 surface, 채움 mana-fill, 글자 text
  states    가득 참, 회복 중
  a11y      role="progressbar" aria-valuenow/max

SpellButton (C, 가로 줄에 최대 9개)
  layout    40×40 아이콘 칸 + 아래 남은 시간 알약(높이 12)
  tokens    칸 surface-2 + frame-trim 테두리, 알약 mana-fill/text
  states    시전 가능 / 마나 부족(disabled: 어둡게) / 발동 중(남은 초, 위에서 아래로 차오르는 덮개) / 자동 시전(은·금 테두리)
  a11y      <button>, aria-label "주문 이름, 마나 비용, 상태"

AutocastButton (D, 지도 왼쪽 세로 3개)
  layout    36×36 원형 버튼
  tokens    bg frame, 테두리 frame-trim
  states    꺼짐(회색) / 은 / 금, 누르면 순환
  a11y      aria-pressed, 라벨 "자동 시전: 꺼짐|은|금"

RealmCanvas (E)
  layout    남은 높이 전부(최소 220), 아이소메트릭 32×16 타일, 건물 스프라이트가 보유 수에 따라 등장
  states    탭 → Floater, 진영 코인 발견 → 코인 Floater(다른 색)
  a11y      canvas 위에 투명 <button aria-label="영토 두드리기">

MapButton (F, 지도 양쪽 아래)
  layout    48×48 원형, 아이콘 ×2 + 아래 라벨(xs)
  variants  scry(수정구), shop(주머니)

PanelRibbon (F, 가운데)
  layout    높이 28, 폭 60%, 양 끝이 V자로 갈라진 리본
  tokens    bg accent, 글자 on-accent, sm
  extra     건물 탭일 때 오른쪽에 '모두 구매' 작은 버튼(ActionButton accent sm)

BuildingCard (G, 3열 × 4행)
  layout    아이콘(×2) 왼쪽 위, 업그레이드 %(xs) 옆, 보유 수(lg), 가격 "×1 금화"(xs, gold), 이름(xs)
  variants  common / bright / dark / legend → bg card-*
  states    잠김(숨김) / 살 수 없음(가격 danger) / 살 수 있음(card-affordable-ring 2px) / 누름(1px 아래로)
  a11y      <button>, aria-label "이름, 보유 n, 가격"

ActionButton
  variants  primary(퇴위: primary/on-primary), special(환생: special/on-special), accent(모두 구매·구매), danger(초기화)
  sizes     sm 24, md 32, lg 40
  states    default / active(1px 아래, 그림자 0) / focus-visible(2px card-affordable-ring) / disabled(disabled-bg/disabled-text)
  a11y      <button>, disabled 속성

FactionCoinColumn (업그레이드 패널 왼쪽 세로줄)
  layout    폭 52, 줄마다 코인 아이콘(×1) + 수량(xs)
  states    0개는 흐리게(text-dim)

UpgradeGridSection
  layout    머리(제목 sm + 접기 ▲/▼) + 7열 아이콘 격자
  variants  미구매 / 구매함
  states    펼침, 접힘, 비어 있음("살 수 있는 개선이 없어요")

UpgradeSlot
  layout    40×40, 아이콘 ×2
  states    살 수 있음(ring) / 살 수 없음(어둡게) / 구매함(작은 체크)
  extra     길게 누르기·호버 → Tooltip(이름, 효과, 가격, 해금 조건)

NavButton (H, 하단 7개)
  layout    44×44 원형, 아이콘 ×2, 알림 숫자 배지(accent)
  states    기본 / 선택(frame-trim 굵은 테두리 + 밝게) / 배지
  a11y      role="tab", aria-selected

Modal (왕실 교환 S09, 상점 S16, 점술 S17, 옵션 S15, 오프라인 S14)
  layout    화면 폭 - 32, 가운데, 제목(lg) + 본문 + 버튼 줄, 오른쪽 위 닫기 ✕
  tokens    surface, frame-trim 3px, 뒤 배경 rgba(0,0,0,.6)
  a11y      role="dialog" aria-modal, 열리면 첫 버튼에 포커스, Esc로 닫힘

DataTable (왕실 교환, 연구)
  layout    머리 xs muted, 행마다 이름 / 보너스 / 비용 / 구매 버튼

Toast
  layout    화면 아래 패널 위에 뜨는 한 줄, 2.4초
  tokens    frame + text

Floater
  layout    탭 지점에서 위로 40px 떠오르며 사라짐 (steps 애니메이션)
  variants  금화(gold) / 이야기 조각(카드 색) / 치명(크게)

Checkbox / Radio (옵션)
  layout    12×12 픽셀 상자, 체크는 ✕ 픽셀
  a11y      실제 <input>, 라벨 연결
```
