// Two devices, one fake server. npx tsx scripts/test-sync.ts
import assert from "node:assert/strict";
import { applyPull, emptyOutbox, push, settle, sinceFor, track, type LocalState, type Remote } from "../src/data/sync";
import type { DB } from "../src/data/types";

const USER = "11111111-1111-1111-1111-111111111111";
let clock = Date.parse("2026-11-03T00:00:00Z");
const now = () => new Date((clock += 1000)).toISOString();

function fakeServer(): Remote & { rows: Record<string, Map<string, Record<string, unknown>>> } {
  const rows: Record<string, Map<string, Record<string, unknown>>> = { profiles: new Map(), categories: new Map(), routines: new Map(), todos: new Map(), ddays: new Map(), diaries: new Map() };
  return {
    rows,
    async pull(since) {
      const tables: Record<string, Record<string, unknown>[]> = {};
      for (const [t, m] of Object.entries(rows)) tables[t] = [...m.values()].filter((r) => !since || (r.updated_at as string) > since);
      return { serverTime: now(), tables };
    },
    async upsert(t, list) {
      for (const r of list) {
        if (t === "todos") {
          const cat = rows.categories.get(r.category_id as string);
          if (!cat) return { error: "category does not belong to user" };
          if (cat.ended_at && !rows.todos.has(r.id as string)) return { error: "category is ended" };
        }
      }
      for (const r of list) rows[t].set(r.id as string, { ...rows[t].get(r.id as string), ...r, updated_at: now(), deleted_at: null });
      return {};
    },
    async softDelete(t, ids) {
      for (const id of ids) { const r = rows[t].get(id); if (r) rows[t].set(id, { ...r, deleted_at: now(), updated_at: now() }); }
      return {};
    },
  };
}

const emptyDB = (): DB => ({ profile: { id: USER, nickname: "", bio: "" }, categories: [], todos: [], routines: [], ddays: [], diaries: [] });
const device = (): LocalState => ({ db: emptyDB(), outbox: emptyOutbox(), lastPulled: null });
function edit(s: LocalState, f: (db: DB) => DB) { const next = f(s.db); s.outbox = track(s.db, next, s.outbox); s.db = next; }
async function sync(s: LocalState, r: Remote) {
  const { sent, rejected } = await push(s, r, USER);
  s.outbox = settle(s.outbox, sent);
  const pulled = await r.pull(sinceFor(s.lastPulled));
  s.db = applyPull(s.db, s.outbox, pulled);
  s.lastPulled = pulled.serverTime;
  return rejected;
}
const t = async (name: string, fn: () => Promise<void>) => { await fn(); console.log("ok", name); };

(async () => {
  const server = fakeServer();
  const A = device(), B = device();
  const cat = { id: "c1", title: "To Do", color: "#00FF7F", visibility: "followers" as const, sortOrder: 1 };
  const todo = { id: "t1", categoryId: "c1", title: "운동하기", date: "2026-11-03", sortOrder: 1, isDone: false, memo: "", memoIsPrivate: false, timerSeconds: 0, createdAt: "" };

  await t("A adds a category and a to-do; B sees them", async () => {
    edit(A, (d) => ({ ...d, categories: [cat], todos: [todo] }));
    assert.deepEqual(await sync(A, server), []);
    await sync(B, server);
    assert.equal(B.db.todos[0]?.title, "운동하기");
    assert.equal(B.db.categories[0]?.color, "#00FF7F");
  });
  await t("syncing again changes nothing and leaves the outbox empty", async () => {
    await sync(A, server); await sync(B, server);
    assert.equal(Object.keys(A.outbox.upsert.todos).length, 0);
    assert.equal(server.rows.todos.size, 1);
  });
  await t("B checks it, A gets the check", async () => {
    edit(B, (d) => ({ ...d, todos: d.todos.map((x) => ({ ...x, isDone: true, doneAt: "2026-11-03T11:43:00Z" })) }));
    await sync(B, server); await sync(A, server);
    assert.equal(A.db.todos[0].isDone, true);
  });
  await t("offline edits on A wait in the outbox and win when they arrive later", async () => {
    edit(A, (d) => ({ ...d, todos: d.todos.map((x) => ({ ...x, title: "운동하기: 어깨" })) }));
    edit(B, (d) => ({ ...d, todos: d.todos.map((x) => ({ ...x, title: "운동하기: 등" })) }));
    await sync(B, server); // B first
    await sync(A, server); // A last: last write wins, and A's pending edit was not overwritten by the pull
    assert.equal(A.db.todos[0].title, "운동하기: 어깨");
    await sync(B, server);
    assert.equal(B.db.todos[0].title, "운동하기: 어깨");
  });
  await t("delete on B removes it on A", async () => {
    edit(B, (d) => ({ ...d, todos: [] }));
    await sync(B, server); await sync(A, server);
    assert.equal(A.db.todos.length, 0);
    assert.ok(server.rows.todos.get("t1")?.deleted_at);
  });
  await t("a row the server refuses is reported and does not block others", async () => {
    edit(A, (d) => ({ ...d, categories: d.categories.map((c) => ({ ...c, endedAt: "2026-11-03T12:00:00Z" })) }));
    await sync(A, server);
    server.rows.categories.get("c1")!.ended_at = "2026-11-03T12:00:00Z";
    edit(B, (d) => ({ ...d, ddays: [{ id: "d1", title: "시험", type: "fixed", targetDate: "2026-11-15", isPrivate: false, sortOrder: 1 }], todos: [{ ...todo, id: "t2" }] }));
    const rejected = await sync(B, server);
    assert.deepEqual(rejected.map((r) => r.id), ["t2"]);
    assert.ok(server.rows.ddays.get("d1"));
    assert.equal(Object.keys(B.outbox.upsert.todos).length, 0);
  });
  await t("a diary written on B reaches A", async () => {
    edit(B, (d) => ({ ...d, diaries: [{ id: "y1", date: "2026-11-03", emoji: "😊", body: "좋은 하루", visibility: "private", imagePaths: [] }] }));
    await sync(B, server); await sync(A, server);
    assert.equal(A.db.diaries[0]?.body, "좋은 하루");
    assert.equal(A.db.diaries[0]?.emoji, "😊");
  });
  await t("an outbox saved before diaries existed still works", async () => {
    const { upgradeOutbox } = await import("../src/data/sync");
    const old = { upsert: { categories: {}, routines: {}, todos: { x: 1 }, ddays: {} }, remove: { categories: {}, routines: {}, todos: {}, ddays: {} }, profile: 0 };
    const o = upgradeOutbox(old as never);
    assert.deepEqual(o.upsert.diaries, {});
    assert.equal(o.upsert.todos.x, 1);
  });
})().catch((e) => { console.error(e); process.exit(1); });
