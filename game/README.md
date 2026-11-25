# 테일즈토피아 RPG (프로토타입 v0.1)

Godot 4.7.2 · GDScript · 480×270 픽셀 · Android 우선

## 실행
- 에디터: Godot 4.7.2 로 `game/project.godot` 열기 → F5
- 조작(PC): ←→ 이동 · ↓+X 아래 발판으로 · Z 공격 · X 점프(2단) · C 대시 · A/S/D 필살기(MP 1/2/3) · Q 포션 · Esc 일시정지 · 피격 중 C = 반격(MP 1)
- 조작(모바일): 왼쪽 절반 아무 곳 = 이동 패드, 오른쪽 버튼

## 자동 검증
```
godot --headless --path game -s res://tests/run_tests.gd        # 단위 테스트
godot --headless --path game -- --autotest [--god]              # 봇이 던전 1장을 끝까지 플레이
xvfb-run godot --path game -- --autotest --god --shots <dir>    # 화면 캡처
```

## 빌드
```
godot --headless --path game --export-debug "Android" build/talestopia-debug.apk
godot --headless --path game --export-debug "Windows" build/windows/TalestopiaRPG.exe
```
Android 는 **Gradle 빌드**를 씁니다(간이 내보내기는 매니페스트 provider 식별자가 겹쳐 설치가 "충돌"로 거부됨). 처음 한 번 `android_source.zip`(내보내기 템플릿에 포함)을 `game/android/build/`에 풀고 `game/android/.build_version`에 `4.7.2.stable`을 적어야 합니다(에디터: 프로젝트 → Android 빌드 템플릿 설치). 또 에디터 설정에 SDK·JDK·디버그 키스토어 경로가 필요합니다. 키스토어는 저장소에 커밋하지 않습니다.

## 구조
- `data/*.json` 캐릭터·공격 프레임·스킬·몬스터·던전 수치 (코드 수정 없이 조정)
- `src/combat` 전투 (Fighter 상태 머신, 플레이어, 몬스터, 보스, 데미지/랭크 계산)
- `src/dungeon` 던전 진행·배경·연출
- `src/ui` HUD·터치 버튼·메뉴, `src/ui/tokens.gd` 색 토큰
- 폰트: Galmuri11 (SIL OFL 1.1, `assets/fonts/Galmuri-OFL.md`)
