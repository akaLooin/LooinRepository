// Friends: talks to the database functions in supabase/migrations/20261108000000_friends.sql.
// In demo mode (no account) it runs on two sample people kept in memory, so the screens can be tried and tested.
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";
import { addDays, today, type Day } from "../lib/dates";
import { groupReactions, toFeedItem, toFriendView, toPerson, type FeedItem, type FriendView, type Person, type Reaction } from "../lib/friend";
import { getDB, sessionUserId } from "./store";

export type { FeedItem, FriendView, Person, Reaction } from "../lib/friend";
export type Notice = {
  id: string; type: "follow_request" | "follow" | "follow_accepted" | "reaction"; actor: Person; value?: string; todoTitle?: string;
  readAt?: string; createdAt: string;
};
type ListKind = "following" | "followers" | "requests";

// ───────── the server ─────────
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("서버가 설정되지 않았어요");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(friendlyError(error.message));
  return data as T;
}
function friendlyError(m: string) {
  if (/could not find the function|does not exist/i.test(m)) return "서버에 친구 기능 SQL을 먼저 실행해 주세요 (backend.md 10번)";
  if (/not allowed/i.test(m)) return "할 수 없는 동작이에요";
  if (/fetch|network/i.test(m)) return "인터넷 연결을 확인해 주세요";
  return m;
}

// ───────── demo: sample people ─────────
const DEMO_ME = "demo-me";
type DemoPerson = { id: string; nickname: string; handle: string; bio: string; follow: "pending" | "accepted" | null; followsMe: boolean; approval: boolean };
const demo = {
  people: [
    { id: "demo-rabbit", nickname: "토끼", handle: "rabbit", bio: "매일 조금씩", follow: "accepted", followsMe: true, approval: false },
    { id: "demo-squirrel", nickname: "다람쥐", handle: "squirrel_01", bio: "도토리 모으는 중", follow: null, followsMe: false, approval: false },
    { id: "demo-owl", nickname: "부엉이", handle: "owl.night", bio: "밤에 공부해요", follow: null, followsMe: false, approval: true },
  ] as DemoPerson[],
  blocked: new Set<string>(),
  reactions: new Map<string, Reaction>(), // todo id → my reaction
  notices: [] as Notice[],
};
const demoPersonJson = (p: DemoPerson) => ({
  id: p.id, nickname: p.nickname, handle: p.handle, bio: p.bio, i_follow: p.follow, follows_me: p.followsMe ? "accepted" : null,
  blocked_by_me: demo.blocked.has(p.id), followers: (p.follow === "accepted" ? 1 : 0) + 3, following: 2,
});
function demoRange(id: string, from: Day, to: Day) {
  const p = demo.people.find((x) => x.id === id);
  if (!p) return null;
  const t0 = today();
  const cat = `${id}-cat`;
  const todos = [-3, -2, -1, 0, 0, 1, 2].map((off, i) => {
    const date = addDays(t0, off);
    const tid = `${id}-t${i}`;
    const mine = demo.reactions.get(tid);
    return {
      id: tid, category_id: cat, title: ["아침 산책", "책 30쪽", "물 2L", "운동하기", "일기 쓰기", "장보기", "청소"][i], date, sort_order: i,
      is_done: off < 0 || i === 3, memo: i === 3 ? "스쿼트 50개" : "", created_at: date,
      reactions: [...(i === 0 ? [{ kind: "emoji", value: "👏", mine: false }] : []), ...(mine ? [{ kind: mine.kind, value: mine.value, mine: true }] : [])],
    };
  }).filter((t) => t.date >= from && t.date <= to);
  return {
    person: demoPersonJson(p),
    categories: p.follow === "accepted" || !p.approval ? [{ id: cat, title: "To Do", color: "#7FB2FF", sort_order: 1 }] : [],
    todos: p.follow === "accepted" || !p.approval ? todos : [],
    routines: [],
    // a diary today, shared with followers
    diaries: p.follow === "accepted" && t0 >= from && t0 <= to ? [{
      id: `${id}-d0`, date: t0, emoji: "😊", body: `${p.nickname}의 하루: 오늘은 산책을 오래 했다.\n날씨가 좋아서 기분도 좋았다.`, background_color: null, image_paths: [],
      reactions: demo.reactions.has(`${id}-d0`) ? [{ kind: demo.reactions.get(`${id}-d0`)!.kind, value: demo.reactions.get(`${id}-d0`)!.value, mine: true }] : [],
    }] : [],
  };
}

// ───────── what the screens call ─────────
const isDemo = () => sessionUserId() === null;
export const socialAvailable = () => isDemo() || !!supabase;

export async function searchPeople(q: string): Promise<Person[]> {
  if (!q.trim()) return [];
  if (isDemo()) {
    const k = q.trim().toLowerCase();
    return demo.people.filter((p) => !demo.blocked.has(p.id) && (p.handle.startsWith(k) || p.nickname.includes(q.trim()))).map((p) => toPerson(demoPersonJson(p)));
  }
  return (await rpc<unknown[]>("search_people", { q })).map(toPerson);
}

export async function getPerson(id: string): Promise<Person | null> {
  if (isDemo()) {
    const p = demo.people.find((x) => x.id === id);
    return p ? toPerson(demoPersonJson(p)) : null;
  }
  const r = await rpc<unknown>("person", { uid: id });
  return r ? toPerson(r) : null;
}

export async function friendMonth(id: string, from: Day, to: Day): Promise<FriendView | null> {
  if (isDemo()) return toFriendView(demoRange(id, from, to));
  return toFriendView(await rpc<unknown>("friend_range", { uid: id, from_day: from, to_day: to }));
}

export async function followList(kind: ListKind, id = sessionUserId() ?? DEMO_ME): Promise<Person[]> {
  if (isDemo()) {
    const list = kind === "following" ? demo.people.filter((p) => p.follow === "accepted")
      : kind === "followers" ? demo.people.filter((p) => p.followsMe) : [];
    return list.filter((p) => !demo.blocked.has(p.id)).map((p) => toPerson(demoPersonJson(p)));
  }
  return (await rpc<unknown[]>("follow_list", { uid: id, which: kind })).map(toPerson);
}

/** Follow: "accepted" at once, or "pending" when they approve followers first. */
export async function follow(id: string): Promise<"pending" | "accepted"> {
  let res: "pending" | "accepted";
  if (isDemo()) {
    const p = demo.people.find((x) => x.id === id)!;
    p.follow = p.approval ? "pending" : "accepted";
    res = p.follow;
  } else {
    res = await rpc<"pending" | "accepted">("follow", { target: id });
  }
  refreshFollowing();
  return res;
}
export async function unfollow(id: string) {
  if (isDemo()) { const p = demo.people.find((x) => x.id === id); if (p) p.follow = null; }
  else await rpc("unfollow", { target: id });
  refreshFollowing();
}
export async function respondFollow(id: string, accept: boolean) {
  if (!isDemo()) await rpc("respond_follow", { requester: id, accept });
  demo.notices = demo.notices.filter((n) => !(n.type === "follow_request" && n.actor.id === id));
}
export async function removeFollower(id: string) {
  if (isDemo()) { const p = demo.people.find((x) => x.id === id); if (p) p.followsMe = false; }
  else await rpc("remove_follower", { follower: id });
}
export async function block(id: string) {
  if (isDemo()) { demo.blocked.add(id); const p = demo.people.find((x) => x.id === id); if (p) { p.follow = null; p.followsMe = false; } }
  else await rpc("block", { target: id });
  refreshFollowing();
}
export async function unblock(id: string) {
  if (isDemo()) demo.blocked.delete(id);
  else await rpc("unblock", { target: id });
}
export async function myBlocks(): Promise<Person[]> {
  if (isDemo()) return demo.people.filter((p) => demo.blocked.has(p.id)).map((p) => toPerson(demoPersonJson(p)));
  return (await rpc<unknown[]>("my_blocks")).map(toPerson);
}

/** A reaction on a friend's to-do or diary (one per person; `clear` takes it back). */
export async function react(targetId: string, pick: Reaction, clear: boolean, target: "todo" | "diary" = "todo") {
  if (isDemo()) {
    if (clear) demo.reactions.delete(targetId); else demo.reactions.set(targetId, pick);
    return;
  }
  if (clear) await rpc("unreact", { target_type: target, target: targetId });
  else await rpc("react", { target_type: target, target: targetId, kind: pick.kind, value: pick.value });
}

export type Received = { todos: Record<string, Reaction[]>; diaries: Record<string, Reaction[]> };
/** Reactions friends left on my to-dos and diaries in a date range (my home, my diary). */
export async function reactionsOnMine(from: Day, to: Day): Promise<Received> {
  if (isDemo()) {
    // demo: 토끼 has left a sticker on each of my diaries
    const diaries = Object.fromEntries(getDB().diaries.filter((d) => d.date >= from && d.date <= to)
      .map((d) => [d.id, [{ kind: "sticker" as const, value: "clover.thanks", nickname: "토끼" }]]));
    return { todos: {}, diaries };
  }
  return groupReactions(await rpc<unknown[]>("reactions_on_mine", { from_day: from, to_day: to }));
}

/** 친구 피드: finished to-dos and diaries of people I follow, newest first; `before` = the oldest one shown (더 보기). */
export async function friendFeed(before?: string): Promise<FeedItem[]> {
  if (isDemo()) {
    const raw = demo.people.filter((p) => p.follow === "accepted" && !demo.blocked.has(p.id)).flatMap((p) => {
      const r = demoRange(p.id, addDays(today(), -14), today());
      if (!r) return [];
      const cat = r.categories[0];
      const todos = r.todos.filter((t) => t.is_done).map((t, i) => ({
        kind: "todo", id: t.id, at: new Date(Date.parse(`${t.date}T21:00:00`) - i * 60000).toISOString(), person: r.person, reactions: t.reactions,
        title: t.title, memo: t.memo, date: t.date, category: cat ? { title: cat.title, color: cat.color } : null,
      }));
      const diaries = r.diaries.map((d) => ({ kind: "diary", id: d.id, at: new Date(Date.parse(`${d.date}T08:00:00`)).toISOString(), person: r.person,
        reactions: d.reactions, emoji: d.emoji, body: d.body, date: d.date, image_paths: [] }));
      return [...todos, ...diaries];
    });
    return raw.map(toFeedItem).filter((x): x is FeedItem => !!x && (!before || x.at < before)).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 30);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await rpc<any[]>("friend_feed", { before: before ?? null, max_rows: 30 });
  return rows.map(toFeedItem).filter((x): x is FeedItem => !!x);
}

export async function myNotices(): Promise<Notice[]> {
  if (isDemo()) return demo.notices;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await rpc<any[]>("my_notifications", {});
  return rows.map((r) => ({
    id: r.id, type: r.type, actor: toPerson(r.actor), value: r.value ?? undefined, todoTitle: r.todo_title ?? undefined,
    readAt: r.read_at ?? undefined, createdAt: r.created_at,
  }));
}
export async function markNoticesRead() {
  if (isDemo() || !supabase) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
}

// ───────── people I follow (the chip row on home), shared by every screen ─────────
let following: Person[] = [];
const NONE: Person[] = [];
let loadedFor: string | null | undefined;
const listeners = new Set<() => void>();
export function refreshFollowing() {
  const who = sessionUserId();
  followList("following")
    .then((list) => { if (sessionUserId() === who) { following = list; loadedFor = who; listeners.forEach((l) => l()); } })
    .catch(() => {}); // offline: keep what we had
}
export function useFollowing(): Person[] {
  useEffect(() => { if (loadedFor !== sessionUserId()) refreshFollowing(); }, []);
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => (loadedFor === sessionUserId() ? following : NONE), () => following);
}

// ───────── whose home the home tab shows (me = null); the profile sheet's home button sets it ─────────
let shownFriend: string | null = null;
const shownListeners = new Set<() => void>();
export function showFriend(id: string | null) {
  shownFriend = id;
  shownListeners.forEach((l) => l());
}
export function useShownFriend(): string | null {
  return useSyncExternalStore((l) => { shownListeners.add(l); return () => shownListeners.delete(l); }, () => shownFriend, () => shownFriend);
}
