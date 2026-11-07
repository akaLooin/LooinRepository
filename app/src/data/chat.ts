// 대화: talks to supabase/migrations/20261108000200_chat.sql. Demo mode keeps one sample conversation in memory.
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";
import { readBytes } from "../lib/readBytes";
import { toMessage, type Message, type MessageKind } from "../lib/chat";
import { toPerson, type Person } from "../lib/friend";
import { newId, sessionUserId } from "./store";
import { getPerson } from "./social";

export type { Message } from "../lib/chat";
export type Conversation = {
  id: string; other: Person; unread: number; canSend: boolean; lastAt?: string;
  last?: { kind: MessageKind; body: string; mine: boolean; createdAt: string };
};
export type Thread = { other: Person; canSend: boolean; otherReadAt?: string; messages: Message[] };

const isDemo = () => sessionUserId() === null;
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("서버가 설정되지 않았어요");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (/could not find the function|does not exist/i.test(error.message)) throw new Error("서버에 대화 SQL을 먼저 실행해 주세요 (backend.md 12번)");
    if (/not allowed/i.test(error.message)) throw new Error("이 사람에게는 메시지를 보낼 수 없어요");
    throw new Error(/fetch|network/i.test(error.message) ? "인터넷 연결을 확인해 주세요" : error.message);
  }
  return data as T;
}

// ───────── demo ─────────
const demoThreads = new Map<string, { otherId: string; messages: Message[]; read: string }>();
function demoSeed() {
  if (demoThreads.size) return;
  const t = new Date(Date.now() - 3600_000).toISOString();
  demoThreads.set("demo-c-demo-rabbit", {
    otherId: "demo-rabbit", read: new Date(Date.now() - 7200_000).toISOString(), // not read yet
    messages: [{ id: "demo-m1", kind: "text", body: "오늘 운동 같이 할래?", mine: false, createdAt: t }],
  });
}

// ───────── what the screens call ─────────
export async function myConversations(): Promise<Conversation[]> {
  if (isDemo()) {
    demoSeed();
    const out: Conversation[] = [];
    for (const [id, th] of demoThreads) {
      const other = await getPerson(th.otherId);
      const last = th.messages[th.messages.length - 1];
      if (!other || !last) continue;
      out.push({ id, other, canSend: true, lastAt: last.createdAt, unread: th.messages.filter((m) => !m.mine && m.createdAt > th.read).length,
        last: { kind: last.kind, body: last.body, mine: last.mine, createdAt: last.createdAt } });
    }
    return out.sort((a, b) => (b.lastAt ?? "").localeCompare(a.lastAt ?? ""));
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await rpc<any[]>("my_conversations");
  return rows.map((r) => ({
    id: r.id, other: toPerson(r.other), unread: Number(r.unread ?? 0), canSend: r.can_send !== false, lastAt: r.last_message_at ?? undefined,
    last: r.last ? { kind: r.last.kind, body: r.last.body ?? "", mine: !!r.last.mine, createdAt: r.last.created_at } : undefined,
  }));
}

/** The conversation with someone (made if needed). Throws when they do not take messages from me. */
export async function openConversation(otherId: string): Promise<string> {
  if (isDemo()) {
    demoSeed();
    const id = `demo-c-${otherId}`;
    if (!demoThreads.has(id)) demoThreads.set(id, { otherId, messages: [], read: new Date().toISOString() });
    return id;
  }
  return rpc<string>("open_conversation", { other: otherId });
}

/** Messages newest last. `after` = only newer ones (polling), `before` = older ones (scrolling up). */
export async function loadThread(id: string, opts: { after?: string; before?: string } = {}): Promise<Thread | null> {
  if (isDemo()) {
    demoSeed();
    const th = demoThreads.get(id);
    const other = th && (await getPerson(th.otherId));
    if (!th || !other) return null;
    const list = th.messages.filter((m) => (!opts.after || m.createdAt > opts.after) && (!opts.before || m.createdAt < opts.before));
    return { other, canSend: !other.blockedByMe, messages: list };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = await rpc<any>("conversation_messages", { conv: id, after: opts.after ?? null, before: opts.before ?? null, max_rows: 50 });
  if (!r) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { other: toPerson(r.other), canSend: r.can_send !== false, otherReadAt: r.other_read_at ?? undefined, messages: (r.messages ?? []).map(toMessage).reverse() };
}

/** Sends one message; for a photo, `local` is the picked file on this phone. Returns the server's time. */
export async function sendMessage(conv: string, m: { id: string; kind: MessageKind; body: string; local?: string }): Promise<string> {
  if (isDemo()) {
    const th = demoThreads.get(conv);
    const at = new Date().toISOString();
    th?.messages.push({ id: m.id, kind: m.kind, body: m.body, photoUri: m.local, mine: true, createdAt: at });
    if (th) th.read = at;
    return at;
  }
  let photoPath: string | null = null;
  if (m.kind === "photo") {
    const me = sessionUserId();
    if (!supabase || !me || !m.local) throw new Error("사진을 보낼 수 없어요");
    const body = await readBytes(m.local);
    if (body.byteLength < 1024) throw new Error("사진을 읽지 못했어요");
    const path = `${me}/${m.id}.jpg`;
    const { error } = await supabase.storage.from("chat-photos").upload(path, body, { contentType: "image/jpeg", upsert: true });
    if (error) throw new Error("사진을 올리지 못했어요");
    photoPath = `chat-photos/${path}`;
  }
  const at = await rpc<string>("send_message", { conv, msg_id: m.id, kind: m.kind, body: m.body, photo_path: photoPath });
  refreshUnread();
  return at;
}

export async function markRead(conv: string) {
  if (isDemo()) { const th = demoThreads.get(conv); if (th) th.read = new Date().toISOString(); }
  else await rpc("mark_conversation_read", { conv }).catch(() => {});
  refreshUnread();
}

export const newMessageId = newId;

// ───────── the dot on the 보내기 tab ─────────
let unread = 0;
const listeners = new Set<() => void>();
export function refreshUnread() {
  const p = isDemo()
    ? myConversations().then((l) => l.filter((c) => c.unread > 0).length)
    : rpc<number>("unread_conversations");
  p.then((n) => { if (n !== unread) { unread = n; listeners.forEach((l) => l()); } }).catch(() => {});
}
export function useUnreadConversations(): number {
  useEffect(() => {
    refreshUnread();
    const t = setInterval(refreshUnread, 30000); // a new message shows as a dot within half a minute
    return () => clearInterval(t);
  }, []);
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => unread, () => unread);
}
