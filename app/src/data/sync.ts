/**
 * Offline-first sync. The app writes to its local copy first; this pushes what changed and pulls what other
 * devices changed. Pure functions over LocalState so two "devices" can be tested against a fake server.
 * Conflict rule: last write to reach the server wins, per row (see replica/architecture.md).
 */
import { fromRow, TABLES, toRow, type Table } from "./rows";
import type { DB } from "./types";

/** id -> change counter. A pushed id is cleared only if it did not change again while the push was in flight. */
export type Outbox = { upsert: Record<Table, Record<string, number>>; remove: Record<Table, Record<string, number>>; profile: number };
export type LocalState = { db: DB; outbox: Outbox; lastPulled: string | null };

export type PullResult = { serverTime: string; tables: Partial<Record<Table | "profiles", Record<string, unknown>[]>> };
export interface Remote {
  pull(since: string | null): Promise<PullResult>;
  upsert(table: Table | "profiles", rows: Record<string, unknown>[]): Promise<{ error?: string }>;
  softDelete(table: Table, ids: string[]): Promise<{ error?: string }>;
  /** Uploads a local photo to Storage; true when it worked. Optional so test servers can skip it. */
  uploadImage?(bucket: string, path: string, localUri: string): Promise<boolean>;
  /** Upserts this user's user_settings row; true when it worked. */
  upsertSettings?(row: Record<string, unknown>): Promise<boolean>;
}

export const emptyOutbox = (): Outbox => ({
  upsert: { categories: {}, routines: {}, todos: {}, ddays: {}, diaries: {}, reminders: {} },
  remove: { categories: {}, routines: {}, todos: {}, ddays: {}, diaries: {}, reminders: {} },
  profile: 0,
});

/** An outbox saved by an older version may lack newer tables. */
export function upgradeOutbox(o: Partial<Outbox> | undefined): Outbox {
  const e = emptyOutbox();
  if (!o) return e;
  return { upsert: { ...e.upsert, ...o.upsert }, remove: { ...e.remove, ...o.remove }, profile: o.profile ?? 0 };
}

let counter = 0;
const tick = () => ++counter;

/** Record what changed between two local snapshots (rows compared by reference). */
export function track(prev: DB, next: DB, outbox: Outbox): Outbox {
  const o: Outbox = { upsert: { ...outbox.upsert }, remove: { ...outbox.remove }, profile: outbox.profile };
  for (const t of TABLES) {
    const before = new Map(((prev[t] ?? []) as { id: string }[]).map((r) => [r.id, r]));
    const after = new Map(((next[t] ?? []) as { id: string }[]).map((r) => [r.id, r]));
    let up = o.upsert[t], rm = o.remove[t];
    for (const [id, row] of after) if (before.get(id) !== row) { up = { ...up, [id]: tick() }; if (rm[id]) { rm = { ...rm }; delete rm[id]; } }
    for (const id of before.keys()) if (!after.has(id)) { rm = { ...rm, [id]: tick() }; if (up[id]) { up = { ...up }; delete up[id]; } }
    o.upsert[t] = up;
    o.remove[t] = rm;
  }
  if (prev.profile !== next.profile) o.profile = tick();
  return o;
}

export const pendingCount = (o: Outbox) =>
  TABLES.reduce((s, t) => s + Object.keys(o.upsert[t]).length + Object.keys(o.remove[t]).length, 0) + (o.profile ? 1 : 0);

export type PushPlan = { profile: number; upsert: Record<Table, Record<string, number>>; remove: Record<Table, Record<string, number>> };

/** Sends the outbox. Returns which ids went through (with the counter they had) and which the server refused. */
export async function push(state: LocalState, remote: Remote, userId: string) {
  const sent: PushPlan = { profile: 0, upsert: emptyOutbox().upsert, remove: emptyOutbox().remove };
  const rejected: { table: string; id: string; error: string }[] = [];
  if (state.outbox.profile) {
    const r = await remote.upsert("profiles", [toRow.profiles(state.db.profile)]);
    if (!r.error) sent.profile = state.outbox.profile;
  }
  for (const t of TABLES) {
    const ids = Object.keys(state.outbox.upsert[t]);
    if (!ids.length) continue;
    const rows = (state.db[t] as { id: string }[]).filter((x) => ids.includes(x.id));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const conv = (x: any) => (toRow[t] as (v: unknown, u: string) => Record<string, unknown>)(x, userId);
    const r = await remote.upsert(t, rows.map(conv));
    if (!r.error) for (const x of rows) sent.upsert[t][x.id] = state.outbox.upsert[t][x.id];
    else
      for (const x of rows) {
        // one bad row (for example a to-do in an ended category) must not block the rest
        const one = await remote.upsert(t, [conv(x)]);
        if (one.error) rejected.push({ table: t, id: x.id, error: one.error });
        sent.upsert[t][x.id] = state.outbox.upsert[t][x.id];
      }
    // rows that vanished locally before the push are no longer pending
    for (const id of ids) if (!rows.some((x) => x.id === id)) sent.upsert[t][id] = state.outbox.upsert[t][id];
  }
  for (const t of [...TABLES].reverse()) {
    const ids = Object.keys(state.outbox.remove[t]);
    if (!ids.length) continue;
    const r = await remote.softDelete(t, ids);
    if (!r.error) for (const id of ids) sent.remove[t][id] = state.outbox.remove[t][id];
  }
  return { sent, rejected };
}

/** Removes what was sent from the *current* outbox, unless the row changed again meanwhile. */
export function settle(outbox: Outbox, sent: PushPlan): Outbox {
  const o: Outbox = { upsert: { ...outbox.upsert }, remove: { ...outbox.remove }, profile: outbox.profile === sent.profile ? 0 : outbox.profile };
  for (const t of TABLES) {
    const up = { ...o.upsert[t] }, rm = { ...o.remove[t] };
    for (const [id, c] of Object.entries(sent.upsert[t])) if (up[id] === c) delete up[id];
    for (const [id, c] of Object.entries(sent.remove[t])) if (rm[id] === c) delete rm[id];
    o.upsert[t] = up;
    o.remove[t] = rm;
  }
  return o;
}

/** Applies pulled rows. Rows with local changes still waiting to be pushed are left alone. */
export function applyPull(db: DB, outbox: Outbox, pulled: PullResult): DB {
  const next: DB = { ...db };
  for (const t of TABLES) {
    const rows = pulled.tables[t];
    if (!rows?.length) continue;
    const map = new Map(((db[t] ?? []) as { id: string }[]).map((r) => [r.id, r as unknown]));
    for (const raw of rows) {
      const id = raw.id as string;
      if (outbox.upsert[t][id] || outbox.remove[t][id]) continue;
      if (raw.deleted_at) map.delete(id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      else map.set(id, (fromRow[t] as (r: any) => unknown)(raw));
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (next as any)[t] = [...map.values()];
  }
  const p = pulled.tables.profiles?.[0];
  if (p && !outbox.profile) next.profile = fromRow.profiles(p);
  return next;
}

/** Ask a little earlier than the last pull so rows committed during it are not missed. Upserts make repeats harmless. */
export const sinceFor = (lastPulled: string | null) => (lastPulled ? new Date(Date.parse(lastPulled) - 5000).toISOString() : null);
