/**
 * 할 일·일기 검색 (user's feature): finds my past and future to-dos (title or memo) and diaries (text), newest day
 * first, to-dos before the diary of the same day; to-dos in 보관함 (no date) come last. Pure, so tests can load it.
 */
import type { DB } from "../data/types";
import type { Day } from "./dates";

export type SearchHit =
  | { kind: "todo"; id: string; date: Day | null; text: string; memo?: string; color: string; done: boolean }
  | { kind: "diary"; id: string; date: Day; text: string; emoji?: string };

export type SearchKind = "all" | "todo" | "diary";

const norm = (s: string) => s.normalize("NFC").toLowerCase();

/** The line around the first match (for a long diary or memo), with "…" where it was cut. */
export function snippet(text: string, q: string, around = 24) {
  const flat = text.replace(/\s+/g, " ").trim();
  const at = norm(flat).indexOf(norm(q.trim()));
  if (at < 0 || flat.length <= around * 2 + q.length) return flat;
  const from = Math.max(0, at - around), to = Math.min(flat.length, at + q.trim().length + around);
  return `${from > 0 ? "…" : ""}${flat.slice(from, to)}${to < flat.length ? "…" : ""}`;
}

/** Splits text into plain and matching parts, for highlighting. */
export function marks(text: string, q: string): { t: string; hit: boolean }[] {
  const needle = norm(q.trim());
  if (!needle) return [{ t: text, hit: false }];
  const out: { t: string; hit: boolean }[] = [];
  const low = norm(text);
  let i = 0;
  for (let at = low.indexOf(needle); at >= 0; at = low.indexOf(needle, i)) {
    if (at > i) out.push({ t: text.slice(i, at), hit: false });
    out.push({ t: text.slice(at, at + needle.length), hit: true });
    i = at + needle.length;
  }
  if (i < text.length) out.push({ t: text.slice(i), hit: false });
  return out;
}

export function searchAll(db: Pick<DB, "todos" | "diaries" | "categories">, query: string, kind: SearchKind = "all", limit = 200): SearchHit[] {
  const q = norm(query.trim());
  if (!q) return [];
  const color = new Map(db.categories.map((c) => [c.id, c.color]));
  const hits: SearchHit[] = [];
  if (kind !== "diary") {
    for (const t of db.todos) {
      if (t.isSkipped) continue;
      const inTitle = norm(t.title).includes(q);
      const inMemo = !!t.memo && norm(t.memo).includes(q);
      if (!inTitle && !inMemo) continue;
      hits.push({ kind: "todo", id: t.id, date: t.date, text: t.title, memo: inMemo ? snippet(t.memo, query) : undefined, color: color.get(t.categoryId) ?? "#888888", done: t.isDone });
    }
  }
  if (kind !== "todo") {
    for (const d of db.diaries) {
      if (!d.body || !norm(d.body).includes(q)) continue;
      hits.push({ kind: "diary", id: d.id, date: d.date, text: snippet(d.body, query), emoji: d.emoji });
    }
  }
  const key = (h: SearchHit) => h.date ?? "";
  hits.sort((a, b) => {
    if (!a.date !== !b.date) return a.date ? -1 : 1; // 보관함 last
    if (key(a) !== key(b)) return key(a) < key(b) ? 1 : -1;
    return a.kind === b.kind ? 0 : a.kind === "todo" ? -1 : 1;
  });
  return hits.slice(0, limit);
}
