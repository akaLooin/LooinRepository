# Recon map: 그랜드체이스 (PC 원작 / Classic) → 모바일 픽셀 리디자인 (Android 우선)

Scope: 원작의 **싱글 PvE 코어 루프** — 캐릭터 선택 → 마을 → 던전 횡스크롤 전투 → 결과 보상 → 성장(장비·스킬·레벨).
온라인(파티·PvP·길드)은 범위 밖. 기본 기능이 원작 수준에 이르면 그때 도입.
For: 사용자 본인의 오리지널 IP 모바일 액션 RPG. 기능·조작감은 원작 수준, 외형(이름·캐릭터·세계관·아트·UI·사운드)은 전부 새로 만듦.
Date: 2026-11-25

> 클린룸 원칙: 원작은 **무엇을 하는지(기능·흐름)** 만 참고한다. 원작의 코드·리소스·스프라이트·사운드·텍스트·캐릭터 이름/디자인은 쓰지 않는다.
> `replica/screens/` 의 참고 스크린샷은 레이아웃 비교용이며 빌드에 절대 포함하지 않는다.

## Sources

| # | source | URL | notes |
| --- | --- | --- | --- |
| 1 | Steam 스토어 (Classic) | https://store.steampowered.com/app/985810/GrandChase | 장르·모드(아이템전/팀전/개인전, 일반/데스매치)·전직 스킬트리 |
| 2 | Epic 스토어 | https://store.epicgames.com/p/grandchase-c03eb2 | 3vs3 아레나, 레벨업 스킬포인트, 캐릭터 수 |
| 3 | 퍼블리셔 페이지 | https://koggames.com/game/grandchaseclassic | 던전 종류(일반/영웅/이벤트), 레이드 |
| 4 | Wikipedia | https://wikipedia.com/wiki/Grand_Chase | 분기형 던전 구조, 서비스 연혁 |
| 5 | SteamDB | https://steamdb.info/app/985810 | 2021-07-28 재출시, 무료, 평가 63% |
| 6 | TV Tropes | https://www.tvtropes.org/pmwiki/pmwiki.php/VideoGame/GrandChase | 게임 시스템 전반 요약 |
| 7 | 공개 플레이 영상 | (사용자 제공 예정) | 전투 템포·콤보·UI 흐름 확인용 |

## Core loop

던전에 들어가 다층 발판 위에서 콤보·MP 필살기로 몬스터를 쓸고, 보스를 잡고, 보상으로 캐릭터를 키워 더 어려운 던전에 다시 들어간다.

## Screens

| ID | screen | 진입 | purpose | key components | states seen |
| --- | --- | --- | --- | --- | --- |
| S01 | 타이틀 | 앱 실행 | 시작/옵션 | 로고, 시작 버튼 | loading, filled |
| S02 | 캐릭터 선택 | S01 | 플레이할 캐릭터 선택 | 캐릭터 카드, 잠금 표시, 레벨 | locked, filled |
| S03 | 마을(허브) | S02 | 모든 메뉴의 중심 | 하단 메뉴바, NPC, 재화 표시 | filled, 알림 뱃지 |
| S04 | 월드맵 / 지역 | S03 | 던전 고르기 | 노드형 맵, 잠금 던전 | locked, cleared |
| S05 | 던전 정보 / 난이도 | S04 | 입장 전 확인 | 난이도 탭, 추천 레벨, 보상 미리보기 | locked, filled |
| S06 | 로딩 / 스테이지 인트로 | S05 | 스테이지 이름, 팁 | 진행 바 | loading |
| S07 | 전투 (인게임) | S06 | 핵심 플레이 | HP/MP 바, 가상 패드, 스킬 버튼, 퀵슬롯, 콤보 카운터, 미니 진행도 | 일반, 보스, 피격, 사망 |
| S08 | 일시정지 | S07 | 중단/포기/옵션 | 모달 | - |
| S09 | 부활 / 실패 | S07 | 부활 아이템 사용 여부 | 카운트다운 | 아이템 있음/없음 |
| S10 | 던전 결과 | S07 | 랭크·경험치·골드 | 랭크 등급, 획득 목록 | 레벨업, 첫 클리어 |
| S11 | 보상 카드 선택 | S10 | 추가 보상 1장 뒤집기 | 카드 4장 | 선택 전/후 |
| S12 | 캐릭터 정보 / 장비 | S03 | 장착·능력치 | 장비 슬롯, 능력치 표, 캐릭터 미리보기 | empty slot, filled |
| S13 | 인벤토리 | S03, S12 | 아이템 관리 | 탭(장비/소모/재료), 그리드 | empty, full |
| S14 | 스킬 트리 | S03 | 포인트 투자 | 트리 노드, 리셋 | locked, learned |
| S15 | 강화 | S03 | 장비 강화 | 확률, 재료, 결과 연출 | 성공/실패 |
| S16 | 상점 | S03 | 골드로 구매/판매 | 상품 목록, 수량 | 골드 부족 |
| S17 | 펫 | S03 | 펫 장착 | 펫 카드 | empty, filled |
| S18 | 미션 | S03 | 목표·보상 수령 | 미션 리스트 | 진행 중/완료/수령 |
| S19 | 옵션 | S01, S03, S08 | 사운드·진동·버튼 배치 | 슬라이더, 버튼 배치 편집기 | - |
| S20 | 전직 (2차 이후) | S03 | 전직 퀘스트·직업 변경 | 직업 트리 | 데모: 예고만 |
| S21 | 대화 / 컷신 | S03, S07 | 스토리 | 초상화 + 대사 박스 | - |
| S22 | PvP 로비 | S03 | 대전 | 방 목록 | 범위 밖(온라인) |
| S23 | 파티 / 방 | S04 | 협동 | 슬롯 4칸 | 범위 밖(온라인) |
| S24 | 길드 / 친구 / 채팅 | S03 | 소셜 | - | 범위 밖(온라인) |

## Flows

```
F01 처음 실행해서 첫 던전 클리어
    S01 -> S02 -> S21(인트로 대화) -> S03 -> S04 -> S05 -> S06 -> S07 -> S10 -> S11 -> S03
    happy path 탭 수: 7 (목표: 5 이하 — 첫 실행은 튜토리얼 던전으로 자동 진입)
    edge: 앱이 백그라운드로 감(자동 일시정지), 전투 중 사망, 저장 실패

F02 던전 반복 + 성장
    S03 -> S04 -> S05 -> S07 -> S10 -> S11 -> S03 -> S12(장착) -> S14(스킬)
    edge: 인벤토리 가득 참, 레벨 상한 도달

F03 장비 강화
    S03 -> S15 -> 장비 선택 -> 강화 -> 결과
    edge: 골드/재료 부족, 실패 시 등급 유지(데모는 파괴 없음)

F04 사망과 부활
    S07(HP 0) -> S09 -> (부활) S07 | (포기) S10 실패 결과
    edge: 보스전 중 부활, 부활 아이템 0개

F05 캐릭터 교체
    S03 -> S02 -> 다른 캐릭터 -> S03 (인벤토리 공유, 장비는 캐릭터별)

F06 버튼 배치 바꾸기
    S03 -> S19 -> 배치 편집 -> 저장 -> S07에서 반영
```

## Components

| component | variants | states | used on |
| --- | --- | --- | --- |
| 가상 이동 패드 | 고정형, 플로팅형 | idle, pressed, 방향 | S07 |
| 액션 버튼 | 공격, 점프, 대시, 스킬1/2/3, 펫 | ready, pressed, cooldown, MP 부족 | S07 |
| 게이지 | HP, MP(3칸 분할), EXP, 보스 HP(다중 줄) | 감소 애니, 위험 | S07, S03 |
| 데미지 텍스트 | 일반, 크리티컬, 백어택, 회복 | - | S07 |
| 콤보 카운터 | - | 증가, 끊김 | S07 |
| 아이템 슬롯 | 장비, 소모, 재료 | empty, filled, 등급 테두리, 강화 수치, 잠금 | S12, S13, S16 |
| 툴팁 / 아이템 상세 | 비교 표시 | - | S12, S13, S16 |
| 모달 | 확인, 경고, 보상 | - | 전체 |
| 탭 바 | 상단 탭 | 선택, 뱃지 | S05, S13, S18 |
| 하단 메뉴바 | - | 알림 뱃지 | S03 |
| 토스트 | 획득, 오류 | - | 전체 |
| 대사 박스 | 좌/우 초상화 | 타이핑, 스킵 | S21 |
| 보상 카드 | 뒤면/앞면 | 뒤집기 애니 | S11 |

## Inferred data model

```
Character   id, class_id, name, level, exp, job_tier, skill_points, equipped{slot:item_id}, pet_id
            evidence: Steam "전직으로 스킬 확장", Epic "레벨업 스킬 포인트"; confidence: high
Class       id, base_stats, move_params(jump2, dash_speed), combo_table, skill_tree_id
            evidence: 캐릭터별 조작 차이(영상); confidence: high
Skill       id, class_id, job_tier, mp_cost(1|2|3), type(active|passive|combo), prereq_ids, max_level
            evidence: 스킬트리 / MP 3단 필살기; confidence: high
ItemDef     id, kind(weapon|helm|top|bottom|glove|shoe|cape|consumable|material), grade, class_req, level_req, stats, price
ItemInst    id, def_id, owner_account, enhance_level, options(json), equipped_by
            evidence: 장비창·강화; confidence: high (옵션 구조는 guess)
Dungeon     id, region_id, name, stages[], difficulties[], rec_level, rewards_table
Stage       id, dungeon_id, map_id, spawn_waves[], next_stage_ids[] (분기)
            evidence: Wikipedia "branching levels, boss at the end"; confidence: high
Monster     id, stats, ai_profile, drop_table, is_boss, phases[]
Pet         id, stats_bonus, pet_skill, evolve_to
Mission     id, kind(main|daily), condition, reward, state
Save        account{gold, inventory[], characters[], cleared[{dungeon,difficulty,best_rank}], missions[], settings}
```

Relationships: Account 1-n Character, Account 1-n ItemInst (공유 인벤토리), Character n-1 Class, Class 1-1 SkillTree 1-n Skill, Region 1-n Dungeon 1-n Stage n-n Monster.

## Feature matrix

See `features.csv`. Must 26, should 15, could 9, skip(IP/온라인/BM) 은 `clone=skip` 행 참고. 데모 포함 항목은 notes 에 `[DEMO]`.

## Out of scope (cannot or should not be cloned)

- 원작 캐릭터 이름·외형·대사·세계관, 지명, 로고, UI 그래픽, 사운드/BGM → 전부 오리지널로 대체
- 원작 서버, 유저 커뮤니티, 계정/랭킹 데이터
- 캐시샵·가챠 등 BM → 온라인 단계에서 별도 설계
- 파티·PvP·길드·채팅 → 온라인 단계

## Size

전체 원작 수준: 화면 24, 흐름 6+, 엔티티 11, 캐릭터 20+ → **XL (재범위 필요)**.
데모 범위(1지역·3던전·캐릭터 2명): **M (몇 주 단위)**.
Hard parts: ① 손맛(히트스톱·캔슬·판정 프레임) ② 모바일 터치로 콤보/필살기 조작 ③ 픽셀 캐릭터 애니메이션 물량 ④ 보스 AI 패턴.
