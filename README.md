# Looin Studio

개인용 안드로이드 사진·영상 편집 앱. 필터, 레트로/글리치/필름/빛/아트/왜곡 효과, 조정, 자르기,
영상 트림·속도 — 전부 휴대폰 GPU에서 처리하고, 네트워크·계정·구독이 없습니다.

## 설치

1. GitHub → Actions → **Build APK** → 최신 실행 → `LooinStudio-apk` 다운로드 (또는 직접 빌드)
2. 휴대폰에서 APK를 열고 "출처를 알 수 없는 앱 설치"를 허용

직접 빌드: `./gradlew assembleRelease` → `app/build/outputs/apk/release/app-release.apk`
(Android 10 이상, JDK 17+)

## 구조

- `app/src/main/java/com/looin/studio/gl` — GLSL 셰이더와 공용 렌더 체인 (미리보기·내보내기·영상이 같은 코드를 씀)
- `.../video` — Media3 효과 연결, 영상 내보내기
- `.../ui` — Compose 화면
- `replica/` — 기능 조사(recon), 아키텍처, 디자인 토큰, 빌드 로그

서명 키는 저장소에 넣지 않습니다. `app/keystore.properties`(storeFile, storePassword, keyAlias, keyPassword)가
있으면 그 키로, 없으면 디버그 키로 서명됩니다. 업데이트를 덮어 설치하려면 항상 같은 키로 빌드하세요.
