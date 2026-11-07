# Phase 2: friends (plan, 2026-11-07)

What the recon knows (replica/recon.md): S19 친구 홈 from the chip row on home, S15 둘러보기 (compass tab), S16 알림 (bell tab),
S17 보내기 (paper-plane tab), reactions (emoji, and stickers per the user), follow with optional approval
(설정 → 개인정보 보호), visibility per category and per diary. **Every screen above is a guess**: recordings of the original are
needed before building the screens (list at the end).

## From the recordings (2026-11-08, user's two screen recordings of the original)

Seen: 둘러보기 = search field "계정 또는 크루" + interest chips + crews + a feed of posts. Searching an account → a row → a tall
profile sheet: big cover picture, ✕ left, 팔로우 and ⋯ right, the name below with a home button and a paper plane.
Following → green clovers pop all over the sheet. Home: the chip row gets the friend (name cut with …); their chip shows
their home (profile, calendar with clovers, categories, to-dos) with an outline heart at the right end of each to-do.
The heart opens a panel: sticker packs and emoji groups as icons along the bottom (recent, stickers, hearts/medals first,
faces, hands, nature, food, activities, objects, flags). After a pick the heart is red and the sticker sits under the
to-do. 보내기 = 대화 (DM list) → a chat with "함께라서 특별해", text, stickers and photos. 마이 = 팔로잉 n · 팔로워 n,
스티커샵 (paid sticker packs).

Built (2026-11-08): search → profile sheet (follow / request / unfollow, 차단, home button, clovers), friend chips on home,
friend home (read only, month calendar), heart → emoji panel (one reaction per person; the same pick takes it back),
reactions shown under my own to-dos, 알림 tab (requests with 수락/거절, follows, reactions), 친구 screen (팔로잉/팔로워/요청)
from the people button and 마이's counts. Demo mode has three sample people.
Guessed (not recorded): 알림 and 친구 list layouts. Not built: crews, the 둘러보기 feed, reacting to a routine day nobody has touched yet.
Added later the same day: 대화, stickers, and on the friend home the 주 (week) view and their diary of the day (card under
the list → read-only sheet in the diary's colour, with a heart for a sticker/emoji reaction; our layout, not recorded).

## 스티커: 클로버 친구들 (built 2026-11-08)

Our own sticker pack, drawn in code (`app/src/components/Sticker.tsx`, colours in `replica/design/tokens.json` → `sticker`):
18 round four-leaf clovers with faces and one prop each (좋아해, 최고, 화이팅, 축하해, 불타오르네, 반짝반짝, 웃겨, 슬퍼, 놀랐어,
머쓱, 졸려, 100점, 다 했다, 고마워, 커피 한잔, 공부 중, 운동 중, 궁금해). Stored as ids (`clover.best`). The reaction panel opens
on the sticker tab (as in the original); reactions show the sticker under the to-do; 대화 sends them as `sticker` messages;
설정 → 내 스티커 shows the pack. Not yet: stickers on diaries (need the original's diary-sticker screen first).

## Push notifications (prepared 2026-11-08)

Server: `20261108000300_push.sql` (push_tokens, notify_chat/likes/following on user_settings) + Edge Function
`supabase/functions/push` called by Database Webhooks on new `messages` and `notifications` rows; it respects 설정 → 알림,
sends through Expo's push service and forgets phones that are gone. App (`lib/push.ts`): saves this phone's address after
sign-in, removes it on 로그아웃, tapping a push opens the chat or 알림, a chat open on screen stays quiet, 설정 → 알림 shows
whether this phone gets pushes and why not. Turning it on needs Firebase + EAS + deploy steps on a PC (backend.md 13).

## 대화 (built 2026-11-08)

보내기 tab = 대화 list (name, last message, time, unread count; a red dot on the tab). A conversation opens from the list
or from a profile's paper plane: back / name / their picture, their picture and name at the top, day labels, my
messages on the right with 전송됨 → 읽음 beside the last one, photos, emoji alone drawn large, an emoji panel (stickers
later). New messages are fetched every 3 s while a conversation is open and every 10–30 s elsewhere (no push yet).
Server: `20261108000200_chat.sql` (send only through `send_message`: blocks and 대화 수신 허용 apply; the same message id
twice is stored once). Not built: push notifications for messages, deleting messages or conversations.

## Server first (no screens needed): done 2026-11-08

`supabase/migrations/20261108000000_friends.sql`, tested by `supabase/tests/run.sh`. Other people's rows are never readable from
the tables; everything about someone else comes from these functions (all `security definer`, signed-in only):

| function | for |
| --- | --- |
| `search_people(q)` | 검색: ID prefix or name; skips 검색 허용 off, blocks, me |
| `person(uid)` | a profile + follower/following counts + my relation (null when blocked) |
| `friend_range(uid, from, to)` | friend home: visible categories, to-dos (private memo blank, no alarm), routines, diaries, reaction counts |
| `follow_list(uid, 'following' / 'followers' / 'requests')` | 팔로잉/팔로워 lists; requests are mine only |
| `my_notifications(before, max)` | 알림 tab, with the actor |
| `my_blocks()` | 차단 관리 |
| `follow`, `unfollow`, `respond_follow`, `remove_follower`, `block`, `unblock` | writes (follow returns `pending` or `accepted`) |
| `react(type, id, kind, value)`, `unreact`, `reactions_of` | reactions: one per person per to-do/diary, 좋아요 허용 respected |

Partial visibility: `category_viewers` / `diary_viewers`, written by the owner directly. Friends' photos: a storage policy lets a
signed-in user read a to-do or diary photo only while they can see that to-do or diary.

Original plan:

New tables (migration `2026111x_friends.sql`), all with row level security:

| table | columns | who can read / write |
| --- | --- | --- |
| follows | follower_id, followee_id, status (`pending` / `accepted`), created_at | both people read; the follower creates or deletes; the followee accepts, refuses or removes |
| blocks | blocker_id, blocked_id | the blocker only |
| reactions | id, todo_id or diary_id, user_id, kind (`emoji` / `sticker`), value, created_at | the owner of the to-do/diary and the reactor read; the reactor writes, only on things they can see |
| notifications | id, user_id (to), actor_id, type (`follow_request` / `follow` / `reaction` / …), ref ids, read_at | the receiver only; rows made by triggers, not by apps |

Privacy settings move from the device to `user_settings` (follow_approval, likes_todo, likes_diary, chat_from, searchable)
because other people's apps must respect them.

Who sees what (enforced in the database, not in the app):
- profiles: anyone signed in can see name, ID, photo, bio of a searchable account; blocked people see nothing.
- categories and their to-dos: `public` → everyone, `followers` → accepted followers, `private` → only me,
  `partial` → chosen people (needs a small `category_viewers` table).
- diaries: the same by the diary's own visibility.
- A friend's routine occurrences are computed on their device today; for viewing, the server returns their routines too
  (visibility of the routine's category) and the app computes the occurrences the same way.

Read paths: one RPC per screen (`friend_day(user, day)`, `friend_month(user, month)`, `feed(since)`, `search_people(q)`),
each a `security definer` function that applies the rules above, so the app never sees rows it should not.

## App

- People chip row on home: me + people I follow; tapping a friend shows their home (calendar + visible to-dos, read only).
- Reactions on a friend's to-do or diary (emoji first; stickers when we have our own artwork).
- 알림 tab: follow requests (accept / refuse), new followers, reactions.
- 둘러보기 / 보내기 tabs: as the recordings show.
- Push notifications to other phones need a server sender (Expo push + an Edge Function); first version shows them in the
  알림 tab only.

## Testing

Needs two accounts: a second e-mail (any address you can open) signed in on the web build or a second phone.
Database rules get the same local Postgres test as phase 1 (a third account must see nothing private).

## Recordings needed from the original

1. Home: tap a friend's chip (or the right-end people button) → the friend's home, scroll it, tap a to-do of theirs.
2. Reacting to a friend's to-do (and diary): what can be picked, how it looks afterwards on both sides.
3. Finding and following someone (search, profile, follow button, request when approval is on).
4. 알림 tab with a few notifications; accepting a follow request.
5. 둘러보기 (compass) tab and 보내기 (paper-plane) tab.
6. 마이 → 팔로잉 / 팔로워 lists.
