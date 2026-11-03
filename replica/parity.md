# Parity report

Date: 2026-11-03 · Reference: 27 screenshots of the user's own account (`replica/screens/`) · Clone: web export in demo mode, captured with `app/e2e/capture-for-diff.js`

## Scores

| | score | note |
| --- | --- | --- |
| **Overall** (parity.py, features weighted with layout) | **62.5 / 100** | |
| Features | **69.5** | must-haves 23 of 30 done (the 31st, hex colour input, is ours, not the original's) |
| Layout (edge-map, 23 screens) | **34.6** (was 30.7 before this pass) | read the caveat below |

**Verdict: not shippable** by the replica rule (7 must-haves are partial). For the user's purpose (personal use), the gaps that matter are photos, Google sign-in and the rest of the settings screen.

### Why the layout score is low, and what the eye says

The layout tool compares edge positions on a grid. The pairs never show the same content:
- the original shows ads (top chip, a row in the to-do sheet, a bottom banner)
- the user's real to-dos and a profile photo
- longer guidance text that wraps to two lines
- the phone's own Google Photos picker inside the to-do info screen

A few pixels of vertical shift then fail whole rows of cells. Side-by-side review of all 23 pairs (composite images were made during the pass) shows that **structure and order match on every screen**. What was really different was **size**, and that is what this pass fixed.

## What this pass changed (measured, not estimated)

Sizes were compared on a common 411dp-wide canvas: the reference cropped of the status bar (96px) and nav bar (144px), the clone at 411×799.

| what | original : clone (before) | change |
| --- | --- | --- |
| body text (rows, fields, buttons) | 0.89–0.91 | 17 → 15.5 |
| body (bio, values) / helper | ~0.9 / ~0.85 | 15 → 14 / 14 → 13 |
| titles (month, name, sheet) | 0.94–0.97 | 20 → 19, 17 → 16.5, 18 → 17.5 |
| dates / weekdays | ~0.88 | 15 → 13.5, 13 → 12.5 |
| edit fields (category, routine, D-day) | 49–52 vs 58–64 | 64 → 52, gaps per screen (7 / 16) |
| list rows: settings toggles, pill rows, routine rows, to-do sheet rows | 54/60, ~0.92, 68/74, 59/66 | 60 → 54, 52 → 48, 74 → 68, 66 → 59 |
| sheet tiles, buttons | 85/96, 43/46 | 96 → 85, 46 → 43 |
| home category pill | 43 vs 38 (original **bigger**) | 38 → 43 |
| memo box | 98 vs 134 | 140 → 98 |
| timer | colons spaced, button higher | `00 : 00 : 00`, button raised |
| clover | rounder, smaller notches | lobe radius 0.32 → 0.34 |

The reference phone is **360dp wide**: its status bar is 96px and its nav bar 144px, which means density 3. So on the user's phone the app is also scaled by 360/411 at runtime (`app/src/theme/scale.tsx`). Both fixes together should match the original's pixels on that phone. This still needs checking on the phone.

Per-screen layout scores: `replica/diffs/*.json`; diff images: `replica/diffs/*.png`.

## Behaviour differences

| flow | original | clone | fix or keep |
| --- | --- | --- | --- |
| sign in | social and email (not seen) | email + password | keep (user's choice); Google later |
| category colour | fixed palette | hex code input + 8 presets | keep (user request) |
| to-do info (S05b) | bottom sheet over home | full screen | fix later (low) |
| bottom sheets | drag down to close | tap outside or back to close | fix with a gesture library |
| photo proof, profile photo, diary photos | yes | not yet | build next (needs phone) |
| diary entry point | not seen | row under the day's to-dos | keep until the user shows the original's |
| ads | yes | none | keep |
| calendar category filter (▼), 리스트 메뉴, 보관함 | yes | button shows "not yet" | build next |
| settings → 화면 | 18 options | 7 work, 11 shown as "준비 중" | build the useful ones |
| reorder | drag | hold 0.3 s and drag, plus screen-reader move actions | keep; check the feel on the phone |

## Top five to build next

1. **Calendar category filter (▼) and 리스트 메뉴** on home (no device needed)
2. **Settings → 화면 options** that change the home screen: 카테고리 접기 펼치기, 할 일을 상단에서 입력, 할 일 캘린더에서 표시할 카테고리
3. **Photos**: proof photo, profile photo, diary photo (needs the phone for upload)
4. **APK build** so the app runs without the PC
5. **Bottom sheet drag-to-close** and the to-do info screen as a sheet
