# Architecture: 테일즈토피아 RPG (그랜드체이스 PvE 코어 기능의 오리지널 재구성)

> replica-architect 산출물. 웹 앱용 템플릿(DB·API·결제)을 **게임**에 맞게 바꿔 적었다.
> 서버가 없는 오프라인 싱글이므로 "스키마"는 **게임 데이터 파일 + 세이브 파일 구조**, "API"는 **게임 내부 시스템 간 인터페이스**다.
> 근거: `recon.md`, `features.csv`, `demo-plan.md`

## 1. Stack

| layer | choice | why |
| --- | --- | --- |
| 엔진 | **Godot 4.7.x (stable)**, MIT 라이선스 | 완전 무료·로열티 없음. 2D 픽셀에 강하고 하나의 프로젝트로 Android·Windows·macOS·Linux·iOS 내보내기 |
| 언어 | **GDScript (정적 타입 표기 사용)** | 엔진 내장, 빌드 단계 없음, 모바일 내보내기 가장 단순. 무거운 계산이 생기면 그 부분만 C++(GDExtension) |
| 렌더러 | **Compatibility (OpenGL ES 3)** | 저가 안드로이드까지 지원, 2D 픽셀에 충분 |
| 화면 | 480×270 뷰포트, stretch=viewport, scale=**integer**, aspect=expand | 픽셀 깨짐 없음, 폰 비율 차이는 좌우 시야 확장으로 흡수 |
| 물리 | 내장 2D 물리 + CharacterBody2D, **60틱 고정** | 단방향 발판(아래 점프) 기본 지원. 로직을 틱 단위로 돌려 프레임과 분리 |
| 게임 데이터 | `game/data/*.json` | 수치 조정 = 데이터 수정. 나중에 서버로 그대로 이관 가능 |
| 세이브 | `user://save/slot0.json` (버전 필드 + 원자적 쓰기 + 백업 1개) | 오프라인 우선 |
| 폰트 | **갈무리(Galmuri) 픽셀 폰트**, SIL OFL | 무료·상업 사용 가능 한글 픽셀 폰트 |
| 픽셀 아트 도구 | **LibreSprite**(무료) 또는 Aseprite(유료, 선택) → PNG 스프라이트시트 | 무료 원칙 유지 |
| 테스트 | **GUT** (Godot Unit Test, MIT) | 데미지 공식·세이브·데이터 검증 자동화 |
| 빌드 | Godot 헤드리스 내보내기 → Android APK(테스트)/AAB(스토어). 이 클라우드 환경에서 빌드 가능 확인(Android SDK 35·JDK 있음) | 매 단계 APK를 바로 폰에 설치해 확인 |
| CI (후순위) | GitHub Actions에서 같은 헤드리스 내보내기 | 무료 범위 내 |
| 온라인 (후순위) | 후보: **Nakama**(오픈소스 게임 서버, 자가 호스팅 무료) 또는 Supabase | 지금 결정하지 않음. 대신 아래 4장의 "온라인 대비" 규칙을 지금부터 지킨다 |

광고·결제·분석 SDK: 데모에는 넣지 않는다.

## 2. 폴더 구조

```
LooinRepository/
├─ replica/                 기획·분석 문서 (게임에 포함 안 됨)
└─ game/                    Godot 프로젝트 루트
   ├─ project.godot
   ├─ export_presets.cfg    Android / Windows / iOS 프리셋 (키스토어 비밀번호는 커밋 금지)
   ├─ data/                 classes / skills / attacks / items / monsters / dungeons / missions .json
   ├─ assets/               sprites / tiles / fx / ui / audio / fonts
   ├─ src/
   │  ├─ core/              GameState·DataDB·SaveService·SceneRouter (Autoload)
   │  ├─ input/             InputRouter, TouchControls (가상 패드·버튼), 버튼 배치 저장
   │  ├─ combat/            Fighter(상태 머신), Hitbox/Hurtbox, DamageCalc, MPGauge, HitStop, CombatRNG
   │  ├─ actors/            player/, enemy/, boss/, pet/
   │  ├─ ai/                몬스터 행동 트리(간단한 상태 기반)
   │  ├─ dungeon/           DungeonRun, StageLoader, WaveSpawner, Portal, RankScore
   │  ├─ meta/              Inventory, Equipment, Enhance, Shop, SkillTree, Missions
   │  └─ ui/                hud/, menus/, dialogs/
   ├─ scenes/               town / world_map / stage_*.tscn / ui 씬
   └─ tests/                GUT 테스트
```

## 3. 데이터 구조 ("스키마")

웹 앱의 테이블 대신 **정적 데이터(읽기 전용 JSON)** 와 **세이브(플레이어 소유 데이터)** 두 종류.
모든 정적 데이터는 문자열 `id`(예: `"cls_page_knight"`)를 키로 쓰고, 다른 파일은 이 id로만 참조한다. 게임 시작 시 DataDB가 전부 읽고 **참조 무결성 검사**(없는 id 참조 시 즉시 에러)를 한다.

정적 데이터 파일: 9개 — `classes`, `skills`, `attacks`, `items`, `monsters`, `pets`, `dungeons`, `stages`, `missions`.

```jsonc
// classes.json — 캐릭터(직업 계열)
{ "id": "cls_tbd_01", "name_key": "CLS_TBD_01", "job_tier": 1, "next_jobs": ["cls_tbd_01_2a"],
  "base": { "hp": 1200, "atk": 100, "def": 60, "crit": 0.05 },
  "growth_per_lv": { "hp": 60, "atk": 6, "def": 3 },
  "move": { "run": 120, "jump": 300, "air_jumps": 1, "dash": 260, "dash_frames": 14 },
  "combo": ["atk_tbd_01_g1", "atk_tbd_01_g2", "atk_tbd_01_g3", "atk_tbd_01_g4"],
  "dash_attack": "atk_tbd_01_dash", "air_attack": "atk_tbd_01_air", "down_attack": "atk_tbd_01_down",
  "mp_skills": ["sk_tbd_01_mp1", "sk_tbd_01_mp2", "sk_tbd_01_mp3"], "skill_tree": "tree_tbd_01" }

// attacks.json — 프레임 데이터 (손맛의 핵심)
{ "id": "atk_tbd_01_g1", "anim": "g1", "startup": 4, "active": 3, "recovery": 10, "cancel_from": 9,
  "hitbox": { "x": 14, "y": -20, "w": 26, "h": 18 }, "dmg_mul": 1.0, "hitstop": 3,
  "hitstun": 18, "knockback": [60, 0], "launch": false, "mp_gain": 0.04 }

// skills.json — MP 필살기 / 패시브
{ "id": "sk_tbd_01_mp1", "kind": "mp", "mp_cost": 1, "attacks": ["atk_tbd_01_mp1_a"],
  "cutin": false, "invuln_frames": 20, "tree_node": { "tree": "tree_tbd_01", "req": [], "max_lv": 3 } }

// items.json
{ "id": "itm_wpn_0001", "slot": "weapon", "grade": "common", "class_req": ["cls_tbd_01"],
  "lv_req": 1, "stats": { "atk": 12 }, "price": 300, "enhance_max": 5 }

// monsters.json
{ "id": "mon_0001", "hp": 300, "atk": 40, "def": 10, "ai": "ai_melee_basic", "exp": 12,
  "drop": [{ "item": "itm_mat_0001", "rate": 0.3 }], "boss": false, "phases": [] }

// dungeons.json / stages.json
{ "id": "dgn_01", "region": "book_01", "difficulties": ["normal", "hard"], "rec_lv": [1, 5],
  "first_stage": "stg_01_1", "reward_cards": "rc_dgn_01" }
{ "id": "stg_01_2", "scene": "res://scenes/stages/stg_01_2.tscn",
  "waves": [{ "spawns": [{ "mon": "mon_0001", "at": "sp_a", "n": 3 }] }],
  "next": ["stg_01_3a", "stg_01_3b"] }   // 2개 이상이면 분기 포탈
```

세이브 파일 (`user://save/slot0.json`):

```jsonc
{ "version": 1, "saved_at": "2026-11-25T03:00:00Z",
  "account": { "gold": 0, "inventory": [ { "uid": "i_000001", "item": "itm_wpn_0001", "enh": 0, "opts": {} } ],
               "unlocked_classes": ["cls_tbd_01"], "pets": ["pet_01"] },
  "characters": [ { "class": "cls_tbd_01", "lv": 1, "exp": 0, "sp": 0, "skills": {"sk_tbd_01_mp1": 1},
                    "equip": { "weapon": "i_000001" }, "pet": "pet_01" } ],
  "progress": { "cleared": { "dgn_01:normal": { "best_rank": "A", "best_time": 312.4 } },
                "missions": { "msn_main_01": "claimed" } },
  "settings": { "bgm": 0.8, "sfx": 1.0, "vibration": true, "layout": { "attack": [420, 220, 1.0] } } }
```

규칙
- 인벤토리는 **계정 공유**, 장착은 **캐릭터별**(원작과 동일). 장착 중인 아이템은 한 캐릭터만 참조 가능 — SaveService가 저장 전 검사.
- `version`이 오르면 `migrate_v1_to_v2()` 같은 마이그레이션 함수를 반드시 추가.
- 쓰기는 `slot0.tmp` → 성공 시 rename, 직전본은 `slot0.bak` 로 보존 (앱 강제 종료 대비).

## 4. 시스템 인터페이스 ("API")

서버 호출은 없다. 대신 Autoload 서비스의 공개 함수와 시그널을 흐름별로 고정한다. 온라인 단계에서 이 함수들 뒤쪽만 서버 호출로 바꾼다.

| 함수 / 시그널 | 하는 일 | 호출자 | 흐름 |
| --- | --- | --- | --- |
| `SceneRouter.go(screen_id, args)` | 화면 전환 + 로딩 | 모든 UI | 전체 |
| `GameState.select_character(class_id)` | 현재 캐릭터 지정 | S02 | F01, F05 |
| `DungeonRun.start(dungeon_id, difficulty)` | 런 생성(시드 포함), 첫 스테이지 로드 | S05 | F01, F02 |
| `DungeonRun.advance(next_stage_id)` | 스테이지 이동/분기 | Portal | F01 |
| `signal DungeonRun.finished(result)` | 랭크·EXP·골드·드롭 계산 결과 | S10 | F01, F02 |
| `Rewards.apply(result) -> Receipt` | 보상을 세이브에 반영 (런 id로 **중복 반영 방지**) | S10/S11 | F02 |
| `Inventory.equip(char, uid)` / `unequip` | 장착 | S12 | F02 |
| `Enhance.try(uid) -> {ok, new_enh}` | 강화 (CombatRNG 아닌 MetaRNG 사용) | S15 | F03 |
| `Shop.buy(item_id, n)` / `sell(uid)` | 골드 거래 | S16 | — |
| `SkillTree.learn(char, skill_id)` / `reset` | SP 투자 | S14 | F02 |
| `Revive.use(char) -> bool` | 부활 아이템 소모 | S09 | F04 |
| `SaveService.save()` / `load()` | 저장(던전 종료·메뉴 변경·앱 일시정지 시) | 시스템 | 전체 |
| `InputRouter.layout_set(button, pos, scale)` | 버튼 배치 저장 | S19 | F06 |

전투 내부: `Fighter.receive_input(InputFrame)` → 60틱마다 상태 머신 갱신 → `Hitbox`가 겹침 감지 → `DamageCalc.resolve(attacker, defender, attack) -> HitResult` (순수 함수, 테스트 대상) → `HitStop`/`MPGauge`/데미지 텍스트로 전파.

**온라인 대비 규칙 (지금부터)**
1. 전투 로직은 `InputFrame`(틱별 입력)만 받는다. 터치 UI가 Fighter를 직접 건드리지 않는다.
2. 랜덤은 `CombatRNG(seed)` 하나로. `randf()` 직접 호출 금지.
3. 보상 계산은 `Rewards` 한 곳에서만. 나중에 서버 검증으로 옮긴다.

## 5. 까다로운 부분 (The parts that bite)

- **손맛 / 프레임 데이터**: 히트스톱·캔슬 타이밍이 1~2틱만 어긋나도 "뭉개진" 느낌. → 공격 판정을 전부 `attacks.json`으로 빼고, 디버그용 히트박스 표시 토글 제공.
- **멀티터치**: 이동 패드를 누른 채 공격·점프 동시 입력. → `InputEventScreenTouch` index별 추적, Godot의 마우스 에뮬레이션 끔.
- **아래 점프**: 단방향 발판 통과 중 다시 착지 판정되는 버그 단골. → 통과 시 해당 발판 충돌을 N틱 동안만 꺼서 처리.
- **화면 비율·노치**: 19.5:9 ~ 4:3. → aspect=expand + UI는 Safe Area 기준 배치.
- **앱 생명주기**: 전화 수신·홈 버튼. → `NOTIFICATION_APPLICATION_PAUSED`에서 일시정지 + 저장.
- **보상 중복 반영 (멱등성)**: 결과 화면에서 앱이 죽었다 켜짐. → 런 id를 세이브에 기록, 이미 반영된 id는 무시.
- **세이브 손상**: 쓰기 중 종료. → tmp → rename + bak.
- **성능/배터리**: 60fps 유지·발열. → 파티클 수 제한, 오브젝트 풀링(데미지 텍스트·투사체), 정적 배경은 한 장으로 굽기.
- **아트 물량**: 캐릭터당 ~100프레임. → 플레이스홀더로 먼저 손맛 확정 후 아트 투입. 캐릭터 확정은 사용자와 한 명씩.
- **한글 폰트 라이선스**: OFL 폰트만 사용, 라이선스 파일 동봉.
- **원작 잔재**: 데이터 id·텍스트에 원작 이름 금지. 출시 전 `/replica-brand` 검사.
- 시간대·결제·이메일·GDPR: 오프라인 데모에는 해당 없음 (온라인 단계에서 다시 검토).

## 6. Build order

캐릭터 디자인이 정해지기 전에도 진행할 수 있도록, M0~M2는 **이름 없는 플레이스홀더 캐릭터(`cls_tbd_01`)** 로 만든다.

| 단계 | 화면 | 데이터/시스템 | 완료 기준 |
| --- | --- | --- | --- |
| **M0 기반** | 빈 테스트 씬 | project.godot, 화면 설정, Autoload 뼈대, Android 내보내기 | APK가 폰에서 실행, 480×270 정수 스케일 확인 |
| **M1 움직임 (세로 조각 시작)** | S07(임시) | classes.json(move), InputRouter, TouchControls, 발판 타일맵 | 이동·점프·2단 점프·대시·아래 점프·카메라 |
| **M2 전투 손맛** | S07 | attacks/skills.json, Fighter 상태 머신, Hitbox, DamageCalc, HitStop, MP | 허수아비 상대로 콤보·필살기·다운/기상·반격 |
| **M3 던전 한 판 (세로 조각 완성)** | S05→S07→S10→S11 | monsters/dungeons/stages.json, AI, WaveSpawner, 보스 1, RankScore, Rewards | 던전 하나 처음부터 보상까지 |
| **M4 성장** | S12–S17 | items.json, Inventory, Enhance, Shop, SkillTree, Pet, SaveService | 반복 플레이 루프 + 저장/불러오기 |
| **M5 흐름** | S01–S04, S18, S19, S21 | missions.json, 대화 시스템, 버튼 배치 편집 | 첫 실행 → 마을 → 던전 → 마을 |
| **M6 데모 완성** | 전체 | 던전 2·3, 보스 2·3, 캐릭터 2, 밸런스, 사운드 | features.csv 의 [DEMO] 전부 yes |
| 이후 | — | PC 키/패드 매핑 → iOS → 전직·캐릭터 확장 → 온라인(`/replica-backend`) | — |

## 요약

- 스택: Godot 4.7 + GDScript, Compatibility 렌더러, JSON 데이터 + 로컬 JSON 세이브, GUT 테스트, 헤드리스 APK 빌드
- 정적 데이터 파일 9종, 세이브 1종 · 시스템 인터페이스 13개
- 가장 위험한 것: ① 프레임 데이터 손맛 ② 멀티터치 조작 ③ 픽셀 애니메이션 물량
- 다음 단계: `/replica-design` (UI 토큰·컴포넌트) — 단, 사용자 요청대로 **M0 빌드를 먼저** 진행 가능
