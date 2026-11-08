// Pure helpers for 대화 (no device imports, so tests can load them).

export type MessageKind = "text" | "emoji" | "photo" | "sticker";
export type Message = {
  id: string; kind: MessageKind; body: string; photoUri?: string; mine: boolean; createdAt: string;
  /** only on this device: still on its way, or the server refused / the network failed */
  status?: "sending" | "failed";
  /** crew rooms: who sent it */
  sender?: { id: string; nickname: string; avatarUri?: string };
};
export type ChatItem = { type: "day"; key: string; label: string } | { type: "msg"; key: string; m: Message; time?: string; last: boolean };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function toMessage(r: any): Message {
  const kind: MessageKind = r.kind === "emoji" || r.kind === "photo" || r.kind === "sticker" ? r.kind : "text";
  return {
    id: String(r.id), kind, body: String(r.body ?? ""), photoUri: r.photo_path ?? undefined, mine: !!r.mine, createdAt: String(r.created_at),
    ...(r.sender?.id ? { sender: { id: String(r.sender.id), nickname: String(r.sender.nickname ?? ""), avatarUri: r.sender.avatar_path ?? undefined } } : {}),
  };
}

/** Puts new messages into the list: one copy per id (the server's wins over this device's), oldest first. */
export function mergeMessages(list: Message[], incoming: Message[]): Message[] {
  const byId = new Map(list.map((m) => [m.id, m]));
  for (const m of incoming) {
    const old = byId.get(m.id);
    // a photo sent from this phone keeps showing the local copy (no download flash)
    const local = old?.photoUri && !old.photoUri.startsWith("chat-photos/") ? old.photoUri : undefined;
    byId.set(m.id, local && m.kind === "photo" ? { ...m, photoUri: local } : m);
  }
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

const pad = (n: number) => String(n).padStart(2, "0");
const localDay = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "오늘", "어제", or "11월 7일 토요일" (and the year when it is not this year). */
export function dayLabel(iso: string, now = new Date()): string {
  const d = new Date(iso);
  const day = localDay(d);
  if (day === localDay(now)) return "오늘";
  const y = new Date(now); y.setDate(now.getDate() - 1);
  if (day === localDay(y)) return "어제";
  const md = `${d.getMonth() + 1}월 ${d.getDate()}일 ${"일월화수목금토"[d.getDay()]}요일`;
  return d.getFullYear() === now.getFullYear() ? md : `${d.getFullYear()}년 ${md}`;
}

export function clock(iso: string, use24h: boolean): string {
  const d = new Date(iso);
  const h = d.getHours(), m = pad(d.getMinutes());
  return use24h ? `${pad(h)}:${m}` : `${h < 12 ? "오전" : "오후"} ${h % 12 || 12}:${m}`;
}

/**
 * The chat as rows: a day label where the day changes, and the time only on the last message of a run
 * (same sender, same minute), as messengers do.
 */
export function chatItems(list: Message[], use24h: boolean, now = new Date()): ChatItem[] {
  const out: ChatItem[] = [];
  let lastDay = "";
  list.forEach((m, i) => {
    const day = localDay(new Date(m.createdAt));
    if (day !== lastDay) { out.push({ type: "day", key: `d:${day}`, label: dayLabel(m.createdAt, now) }); lastDay = day; }
    const next = list[i + 1];
    const sameRun = next && next.mine === m.mine && clock(next.createdAt, true) === clock(m.createdAt, true) && localDay(new Date(next.createdAt)) === day;
    out.push({ type: "msg", key: m.id, m, time: sameRun ? undefined : clock(m.createdAt, use24h), last: !sameRun });
  });
  return out;
}

/** A message of only one to three emoji is drawn large, without a bubble. */
// built at run time: a phone whose JavaScript engine lacks \p{...} just shows every message as text
let EMOJI_PARTS: RegExp | null = null, PICTO: RegExp | null = null;
try {
  EMOJI_PARTS = new RegExp("[\\p{Extended_Pictographic}\\p{Emoji_Modifier}\\u200D\\uFE0F\\s]", "gu");
  PICTO = new RegExp("\\p{Extended_Pictographic}", "gu");
} catch { /* not supported */ }

export function isBigEmoji(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 24 || !EMOJI_PARTS || !PICTO) return false;
  const pics = t.match(PICTO)?.length ?? 0;
  return t.replace(EMOJI_PARTS, "") === "" && pics >= 1 && pics <= 3;
}

/** The line under a name in the conversation list. */
export function previewText(last: { kind?: string; body?: string; mine?: boolean; nickname?: string } | null | undefined): string {
  if (!last) return "";
  if (last.nickname && !last.mine) return `${last.nickname}: ${previewText({ ...last, nickname: undefined })}`;
  if (last.kind === "photo") return "사진을 보냈어요";
  if (last.kind === "sticker") return "스티커를 보냈어요";
  return String(last.body ?? "").replace(/\s+/g, " ").trim();
}

/** Crew rooms share the chat screen: their conversation id is "crew-<crew id>". */
export const crewRoomId = (crewId: string) => `crew-${crewId}`;
export const crewOfRoom = (id: string) => (id.startsWith("crew-") ? id.slice(5) : null);
