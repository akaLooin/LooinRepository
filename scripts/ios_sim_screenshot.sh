#!/usr/bin/env bash
# iOS 시뮬레이터에 앱을 설치·실행하고 화면을 캡처한다(CI 용, macOS).
# 사용: scripts/ios_sim_screenshot.sh <LooinBudget.app 경로> <출력 폴더>
set -euo pipefail
APP="$1"; OUT="$2"; mkdir -p "$OUT"
BUNDLE=com.looin.finance

# 가장 최신 iOS 런타임의 iPhone 하나 고르기
UDID=$(xcrun simctl list devices available -j | python3 -c '
import json, sys
d = json.load(sys.stdin)["devices"]
rts = sorted((k for k in d if "iOS" in k), reverse=True)
for rt in rts:
    for x in d[rt]:
        if x["name"].startswith("iPhone") and "Pro" in x["name"] and "Max" not in x["name"]:
            print(x["udid"]); sys.exit()
for rt in rts:
    for x in d[rt]:
        if x["name"].startswith("iPhone"):
            print(x["udid"]); sys.exit()
')
echo "simulator: $UDID"
xcrun simctl boot "$UDID" || true
xcrun simctl bootstatus "$UDID" -b
xcrun simctl ui "$UDID" appearance light
xcrun simctl install "$UDID" "$APP"

shot() { sleep "$2"; xcrun simctl io "$UDID" screenshot "$OUT/$1.png"; }
running() { xcrun simctl spawn "$UDID" launchctl list | grep -q "$BUNDLE"; }

xcrun simctl launch "$UDID" "$BUNDLE"
shot ios-01-light 20
if ! running; then
  echo "앱이 실행 중이 아님(종료됨) — 로그:"
  xcrun simctl spawn "$UDID" log show --last 2m --style compact --predicate 'process == "LooinBudget"' | tail -80 || true
  exit 1
fi
xcrun simctl ui "$UDID" appearance dark
shot ios-02-dark 5
running || { echo "다크 전환 후 앱 종료"; exit 1; }
echo "ok"
