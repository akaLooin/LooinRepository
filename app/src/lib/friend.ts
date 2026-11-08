// Pure helpers for the friends features (no device imports, so tests can load them).
import { fromRow } from "../data/rows";
import type { DB } from "../data/types";

export type FollowState = "pending" | "accepted" | null;
export type Person = {
  id: string; nickname: string; handle?: string; bio: string; avatarUri?: string; statusEmoji?: string;
  iFollow: FollowState; followsMe: FollowState; blockedByMe: boolean; followers?: number; following?: number;
};
export type Reaction = { kind: "emoji" | "sticker"; value: string; mine?: boolean; nickname?: string };
/** A friend's month as the app uses it: their visible things in the same shape as mine, plus reactions per to-do. */
export type FriendView = { person: Person; db: DB; reactions: Record<string, Reaction[]>; diaryReactions: Record<string, Reaction[]> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;
const st = (v: unknown): FollowState => (v === "pending" || v === "accepted" ? v : null);

export function toPerson(r: R): Person {
  return {
    id: String(r.id), nickname: String(r.nickname ?? ""), handle: r.handle ?? undefined, bio: r.bio ?? "",
    avatarUri: r.avatar_path ?? undefined, statusEmoji: r.status_emoji ?? undefined,
    iFollow: st(r.i_follow), followsMe: st(r.follows_me), blockedByMe: !!r.blocked_by_me,
    followers: r.followers == null ? undefined : Number(r.followers), following: r.following == null ? undefined : Number(r.following),
  };
}

const reactionList = (v: unknown): Reaction[] =>
  Array.isArray(v) ? v.filter((x) => x && typeof x.value === "string").map((x) => ({ kind: x.kind === "sticker" ? "sticker" : "emoji", value: x.value, mine: !!x.mine })) : [];

/** friend_range's answer → FriendView. null when the person is gone or blocked. */
export function toFriendView(raw: R): FriendView | null {
  if (!raw || !raw.person) return null;
  const person = toPerson(raw.person);
  const todos: R[] = raw.todos ?? [];
  const diaries: R[] = raw.diaries ?? [];
  const db: DB = {
    profile: { id: person.id, nickname: person.nickname, bio: person.bio, avatarUri: person.avatarUri, statusEmoji: person.statusEmoji, handle: person.handle },
    categories: (raw.categories ?? []).map((c: R) => fromRow.categories({ ...c, visibility: "public" })),
    todos: todos.map((t) => fromRow.todos(t)),
    routines: (raw.routines ?? []).map((r: R) => fromRow.routines(r)),
    diaries: diaries.map((d) => fromRow.diaries({ ...d, visibility: "public" })),
    ddays: [], reminders: [],
  };
  return {
    person, db,
    reactions: Object.fromEntries(todos.map((t) => [String(t.id), reactionList(t.reactions)])),
    diaryReactions: Object.fromEntries(diaries.map((d) => [String(d.id), reactionList(d.reactions)])),
  };
}

/** Picking the emoji you already gave takes it back; anything else replaces it (one reaction per person). */
export function nextReaction(list: Reaction[], pick: Reaction): { list: Reaction[]; action: "set" | "clear" } {
  const mine = list.find((r) => r.mine);
  const others = list.filter((r) => !r.mine);
  if (mine && mine.value === pick.value) return { list: others, action: "clear" };
  return { list: [...others, { ...pick, mine: true }], action: "set" };
}

/** reactions_on_mine's answer → reactions per to-do id and per diary id. */
export function groupReactions(rows: R[]): { todos: Record<string, Reaction[]>; diaries: Record<string, Reaction[]> } {
  const out = { todos: {} as Record<string, Reaction[]>, diaries: {} as Record<string, Reaction[]> };
  for (const r of rows ?? []) {
    if (typeof r?.value !== "string") continue;
    const into = r.todo_id ? (out.todos[r.todo_id] ??= []) : r.diary_id ? (out.diaries[r.diary_id] ??= []) : null;
    into?.push({ kind: r.kind === "sticker" ? "sticker" : "emoji", value: r.value, nickname: r.nickname ?? undefined });
  }
  return out;
}

export type NoticeLike = { type: string; actor: { nickname: string }; value?: string; todoTitle?: string };
export function noticeText(n: NoticeLike): string {
  const who = `${n.actor.nickname}님`;
  if (n.type === "follow_request") return `${who}이 팔로우를 요청했어요`;
  if (n.type === "follow") return `${who}이 나를 팔로우해요`;
  if (n.type === "follow_accepted") return `${who}이 팔로우 요청을 수락했어요`;
  const what = n.value?.startsWith("clover.") ? "스티커로" : (n.value ?? "");
  return n.todoTitle ? `${who}이 '${n.todoTitle}'에 ${what} 반응했어요` : `${who}이 ${what} 반응했어요`;
}

export function timeAgo(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (s < 60) return "방금";
  if (s < 3600) return `${Math.floor(s / 60)}분 전`;
  if (s < 86400) return `${Math.floor(s / 3600)}시간 전`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}일 전`;
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}


/** One entry of the friend feed: a finished to-do or a diary of someone I follow. */
export type FeedItem = {
  kind: "todo" | "diary"; id: string; at: string; person: Person; reactions: Reaction[]; date: string;
  title?: string; memo?: string; photoUri?: string; category?: { title: string; color: string };
  emoji?: string; body?: string; imagePaths?: string[]; backgroundColor?: string;
};

export function toFeedItem(r: R): FeedItem | null {
  if (!r || (r.kind !== "todo" && r.kind !== "diary") || !r.id || !r.person) return null;
  return {
    kind: r.kind, id: String(r.id), at: String(r.at), person: toPerson(r.person), reactions: reactionList(r.reactions), date: String(r.date ?? ""),
    title: r.title ?? undefined, memo: r.memo ?? undefined, photoUri: r.photo_path ?? undefined,
    category: r.category?.title ? { title: String(r.category.title), color: String(r.category.color ?? "#FFFFFF") } : undefined,
    emoji: r.emoji ?? undefined, body: r.body ?? undefined, imagePaths: Array.isArray(r.image_paths) ? r.image_paths.map(String) : undefined,
    backgroundColor: r.background_color ?? undefined,
  };
}
