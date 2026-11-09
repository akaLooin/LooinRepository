# Talestopia Tycoon (app)

차원의 도서관 속 한 권의 책, 그 책 속 마을을 키우는 방치형 게임.

## 개발

```bash
npm install
npm run dev          # 브라우저에서 실행
npm test             # 엔진 테스트
npm run build:pages  # 게임 + 개발용 페이지(design.html, art.html, icon.html)
```

## 안드로이드

필요: JDK 21, Android SDK (platform 36, build-tools 36), `android/local.properties`에 `sdk.dir=...`

```bash
npm run android:apk     # 디버그 APK → android/app/build/outputs/apk/debug/app-debug.apk
npm run icons           # 런처 아이콘·스플래시 다시 생성 (art 코드로 그림)
npm run android:bundle  # Play 업로드용 AAB (서명 설정 필요)
```

- 앱 ID: `com.looin.talestopia`
- `android/build.gradle`은 Maven Central이 막힐 때를 대비해 Google의 Maven Central 미러를 먼저 씀.
- Play 스토어 아이콘(512): `store/icon-512.png`

## 관리자 패널 (용어·설명·수치 편집)

- 개발 중: `npm run dev` 후 `/admin.html`, 또는 게임 설정(⚙) → "관리자 패널" (개발·디버그 APK에서만 보임)
- 편집 → **저장**: 이 기기에만 적용 (게임 새로고침 시 반영)
- **JSON 내보내기** → 받은 `overrides.json`을 `src/data/overrides.json`에 덮어쓰고 커밋하면 모든 빌드에 적용
- 편집 가능: 게임 용어, 기본 수치(전설 보너스·조각 확률·오프라인 효율·건물 가격 증가율 등), 건물·성향·진영·진영 개선·주문·일반 개선·명장면·유산·혈통·유물·도전·연구 시설의 이름/설명/가격/수치
- 효과 공식 자체(예: "전체 생산 x2"의 2)는 코드에 있어요. 수치를 바꾸면 설명 문장도 함께 고쳐 주세요.
- 스토어용 빌드(`npm run android:bundle`)에는 관리자 패널이 들어가지 않아요.
