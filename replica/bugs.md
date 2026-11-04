# Bugs

Found by `/replica-test` on 2026-11-04. Only reproduced bugs are listed. Severity: S1 data loss/security/core blocked · S2 feature broken, no workaround · S3 broken with a workaround or visibly wrong · S4 cosmetic.

| ID | sev | steps | expected | actual | evidence | status |
| --- | --- | --- | --- | --- | --- | --- |
| B1 | S3 | Rename a category to 30 characters, open home | the pill shortens with "…" and its + stays on screen | the pill pushed + off the right edge (x 522 on a 411 screen); no way to add to that category from home | edge.js F02-E3 | fixed in 33c47c8 |
| B2 | S3 | Open an edit screen directly (refresh on /ddays/new, or a link), press 완료 | saves and returns to the list | saved but stayed on the edit screen (no history to go back to) | edge.js F07-E2 | fixed (goBack falls back to the list) |
| B3 | S3 | Screen reader on the web, focus a to-do's clover | hears checked / not checked | role checkbox without aria-checked (axe aria-required-attr) | edge.js axe on / and /inbox | fixed (aria-checked) |
| B4 | S4 | Diary without a profile photo | placeholder announced as an image | aria-label on a plain div (axe aria-prohibited-attr) | edge.js axe on /diary | fixed (role img) |
| B5 | S2 | Drag a bottom sheet down, then drag it again after it sprang back | second drag closes it too | second drag did nothing on the web (gesture reused the first drag's start point) | sheets.js | fixed before release of the feature (claim on touch) |
| B6 | S3 | On the web, pick a photo, reload | photo still shows | photo broken (blob URL gone after reload) | photos.js | fixed (data URL on web; native files unaffected) |
| B7 | S2 | Phone (Expo Go): set a reminder or a to-do alarm | permission asked, alarm rings | "setNotificationChannelAsync has been rejected … NullPointerException"; the error stopped the permission request and all scheduling, so nothing rang | user's screenshot 2026-11-05 | fixed: channel error ignored (the channel is created before the failing reply), plan re-runs once permission is granted. Ringing still to confirm on the phone |
| B8 | S1 | Phone: add a proof photo, wait for sync | the photo file in Storage `todo-photos` | a 14-byte file that shows nothing (fetch of a file:// URI read a few bytes, not the photo) | user's Supabase screenshot | fixed: read with expo-file-system; files under 1 KB are never uploaded. Photos already uploaded as 14 bytes are lost: add them again |
| B9 | S3 | Phone: add a proof photo | photo stays | shows, then turns into a grey box after the sync (it switched to the broken upload) | user's screenshot | fixed with B8; the uploading phone also keeps showing its own copy |

## To check (not confirmed as bugs)

- axe **label-content-name-mismatch** (home 30, categories 2, routine edit 4, display 3): read-aloud labels such as "11월 3일" differ from the visible "3" plus the clover count. Low impact; revisit with a real screen reader (TalkBack).
- axe **color-contrast** on 설정 → 화면: the dimmed "준비 중" rows are intentionally inactive.
- Native photo files live in the cache folder until uploaded; in demo mode (no account) the OS could clear them. expo-file-system is now installed, so they could be copied to the document folder.
- Not confirmed on the phone yet: notifications ringing, upload fix, real two-device sync.
