// 서버 연결. VITE_SERVER_URL 이 설정되어 있으면 게스트 계정으로 로그인해 서버 상태를 쓴다.
// 요청은 한 줄로 세워 차례대로 보낸다(행동·기록 순서가 서버와 같도록).
import type { Action, ActionResult } from './core/actions';
import type { AfkReport } from './core/afk';
import type { Account, Character, Look } from './core/state';

const AUTH_KEY = 'looin-idle-auth-v1';
export interface SyncBody { character: Character; coins: number; cards: Record<string, number>; bosses: Record<string, number> }
export class NetError extends Error { constructor(msg: string, readonly status = 0) { super(msg); } }

export class Net {
  private token = '';
  private queue: Promise<unknown> = Promise.resolve();
  constructor(readonly base: string) {}

  private async raw<T>(method: string, path: string, body?: unknown): Promise<T> {
    let r: Response;
    try {
      r = await fetch(this.base + path, {
        method, headers: { 'content-type': 'application/json', ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) },
        body: body === undefined ? (method === 'GET' || method === 'DELETE' ? undefined : '{}') : JSON.stringify(body),
      });
    } catch { throw new NetError('서버에 연결할 수 없습니다'); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new NetError(j.error ?? `서버 오류 ${r.status}`, r.status);
    return j as T;
  }
  /** 줄 세워 보내기 */
  private send<T>(method: string, path: string, body?: unknown): Promise<T> {
    const p = this.queue.then(() => this.raw<T>(method, path, body));
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** 저장된 게스트 키로 로그인하거나 새 게스트 계정을 만든다 */
  async login() {
    let saved: { accountId: string; deviceKey: string } | null = null;
    try { saved = JSON.parse(localStorage.getItem(AUTH_KEY) ?? 'null'); } catch { /* 없음 */ }
    if (saved) {
      try { this.token = (await this.raw<{ token: string }>('POST', '/auth/login', saved)).token; return; }
      catch (e) { if ((e as NetError).status !== 401) throw e; }
    }
    const g = await this.raw<{ accountId: string; deviceKey: string; token: string }>('POST', '/auth/guest');
    this.token = g.token;
    try { localStorage.setItem(AUTH_KEY, JSON.stringify({ accountId: g.accountId, deviceKey: g.deviceKey })); } catch { /* 저장 불가 */ }
  }
  health() { return this.raw<{ ok: boolean }>('GET', '/health'); }
  account() { return this.send<{ account: Account }>('GET', '/account'); }
  create(name: string, look: Look) { return this.send<{ account: Account; error?: string }>('POST', '/characters', { name, look }); }
  enter(i: number) { return this.send<{ account: Account; report: AfkReport | null; error?: string }>('POST', `/characters/${i}/enter`); }
  sync(i: number, body: SyncBody) { return this.send<{ ok: boolean; reason?: string; account?: Account }>('POST', `/characters/${i}/sync`, { commandId: crypto.randomUUID(), ...body }); }
  action(i: number, action: Action, sync?: SyncBody) {
    return this.send<ActionResult & { account?: Account; reason?: string }>('POST', `/characters/${i}/action`, { commandId: crypto.randomUUID(), action, sync });
  }
  remove() { return this.send<{ ok: boolean }>('DELETE', '/account'); }
}
