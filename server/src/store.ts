// 저장소: 계정 문서 읽기/쓰기와 처리한 요청 기록. Postgres(pg)와 PGlite(테스트) 모두 같은 SQL로 동작한다.
import type { Account } from '../../game/src/core/state';

export interface AccountRow { id: string; deviceHash: string; state: Account; version: number; banned: boolean }
export interface Store {
  create(deviceHash: string, state: Account): Promise<AccountRow>;
  get(id: string): Promise<AccountRow | null>;
  /** 기대한 버전일 때만 쓴다. 성공하면 새 버전, 아니면 null */
  save(id: string, state: Account, expect: number): Promise<number | null>;
  getCommand(id: string, accountId: string): Promise<unknown | undefined>;
  putCommand(id: string, accountId: string, kind: string, result: unknown, flagged: boolean): Promise<void>;
  remove(id: string): Promise<void>;
}

/** pg.Pool 과 PGlite 가 공통으로 가진 모양 */
export interface Sql { query<R = Record<string, unknown>>(text: string, params?: unknown[]): Promise<{ rows: R[] }> }

interface Row { id: string; device_hash: string; state: Account | string; version: string | number; banned_at: unknown }
const toRow = (r: Row): AccountRow => ({
  id: r.id, deviceHash: r.device_hash, state: typeof r.state === 'string' ? JSON.parse(r.state) : r.state,
  version: Number(r.version), banned: !!r.banned_at,
});

export class SqlStore implements Store {
  constructor(private db: Sql) {}
  async create(deviceHash: string, state: Account) {
    const { rows } = await this.db.query<Row>('insert into accounts (device_hash, state) values ($1, $2) returning *', [deviceHash, JSON.stringify(state)]);
    return toRow(rows[0]);
  }
  async get(id: string) {
    const { rows } = await this.db.query<Row>('select * from accounts where id = $1', [id]);
    return rows[0] ? toRow(rows[0]) : null;
  }
  async save(id: string, state: Account, expect: number) {
    const { rows } = await this.db.query<{ version: string | number }>(
      'update accounts set state = $2, version = version + 1, updated_at = now() where id = $1 and version = $3 returning version',
      [id, JSON.stringify(state), expect]);
    return rows[0] ? Number(rows[0].version) : null;
  }
  async getCommand(id: string, accountId: string) {
    const { rows } = await this.db.query<{ result: unknown }>('select result from commands where id = $1 and account_id = $2', [id, accountId]);
    return rows[0] ? (typeof rows[0].result === 'string' ? JSON.parse(rows[0].result) : rows[0].result) : undefined;
  }
  async putCommand(id: string, accountId: string, kind: string, result: unknown, flagged: boolean) {
    await this.db.query('insert into commands (id, account_id, kind, result, flagged) values ($1, $2, $3, $4, $5) on conflict (id) do nothing',
      [id, accountId, kind, JSON.stringify(result), flagged]);
  }
  async remove(id: string) { await this.db.query('delete from accounts where id = $1', [id]); }
}

/** 개발·테스트용 메모리 저장소(서버를 끄면 사라진다) */
export class MemoryStore implements Store {
  private rows = new Map<string, AccountRow>();
  private cmds = new Map<string, { accountId: string; result: unknown }>();
  async create(deviceHash: string, state: Account) {
    const row = { id: crypto.randomUUID(), deviceHash, state: structuredClone(state), version: 0, banned: false };
    this.rows.set(row.id, row);
    return structuredClone(row);
  }
  async get(id: string) { const r = this.rows.get(id); return r ? structuredClone(r) : null; }
  async save(id: string, state: Account, expect: number) {
    const r = this.rows.get(id);
    if (!r || r.version !== expect) return null;
    r.state = structuredClone(state); r.version++;
    return r.version;
  }
  async getCommand(id: string, accountId: string) { const c = this.cmds.get(id); return c && c.accountId === accountId ? c.result : undefined; }
  async putCommand(id: string, accountId: string, _kind: string, result: unknown) { if (!this.cmds.has(id)) this.cmds.set(id, { accountId, result }); }
  async remove(id: string) { this.rows.delete(id); for (const [k, v] of this.cmds) if (v.accountId === id) this.cmds.delete(k); }
}

/** migrations/ 의 SQL 파일을 이름 순서대로 한 번씩 적용 */
export async function migrate(db: Sql, files: { name: string; sql: string }[]) {
  await db.query('create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())');
  const { rows } = await db.query<{ name: string }>('select name from schema_migrations');
  const done = new Set(rows.map((r) => r.name));
  for (const f of files.sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(f.name)) continue;
    for (const stmt of f.sql.split(/;\s*$/m).map((x) => x.trim()).filter(Boolean)) await db.query(stmt);
    await db.query('insert into schema_migrations (name) values ($1)', [f.name]);
  }
}
