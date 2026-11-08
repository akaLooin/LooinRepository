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
