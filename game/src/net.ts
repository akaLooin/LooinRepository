// 서버 연결. VITE_SERVER_URL 이 설정되어 있으면 게스트 계정으로 로그인해 서버 상태를 쓴다.
// 요청은 한 줄로 세워 차례대로 보낸다(행동·기록 순서가 서버와 같도록).
import type { Action, ActionResult } from './core/actions';
import type { AfkReport } from './core/afk';
import type { Account, Character, Look } from './core/state';

const AUTH_KEY = 'looin-idle-auth-v1';
export interface SyncBody { character: Character; coins: number; cards: Record<string, number>; bosses: Record<string, number> }
export class NetError extends Error { constructor(msg: string, readonly status = 0) { super(msg); } }

export class Net {
  token = '';
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
  /** 실시간 연결 주소(토큰은 주소에: 브라우저 WebSocket 은 헤더를 못 넣는다) */
  liveUrl() { return `${this.base.replace(/^http/, 'ws')}/live?token=${encodeURIComponent(this.token)}`; }
}

// ───────── 실시간(같은 맵 플레이어·채팅) ─────────
export interface RemoteInfo {
  id: string; map: string; name: string; look: Look; cls: string; level: number;
  x: number; y: number; f: 1 | -1; m: boolean; g: boolean; r: boolean; s: number; k: string;
}
export interface ChatLine { id?: string; from: string; text: string; at: number; map?: string }

export class Live {
  private ws: WebSocket | null = null;
  private closed = false;
  private retry = 1000;
  private joinMsg: unknown = null;
  myId = '';
  onState: (players: RemoteInfo[]) => void = () => {};
  onJoin: (p: RemoteInfo) => void = () => {};
  onPos: (p: Partial<RemoteInfo> & { id: string }) => void = () => {};
  onLeft: (id: string) => void = () => {};
  onChat: (l: ChatLine) => void = () => {};
  onHistory: (l: ChatLine[]) => void = () => {};
  onNotice: (msg: string) => void = () => {};
  constructor(private url: () => string) {}
  open() {
    this.closed = false;
    let ws: WebSocket;
    try { ws = new WebSocket(this.url()); } catch { return; }
    this.ws = ws;
    ws.onopen = () => { this.retry = 1000; if (this.joinMsg) ws.send(JSON.stringify(this.joinMsg)); };
    ws.onmessage = (ev) => {
      let m: Record<string, unknown>;
      try { m = JSON.parse(String(ev.data)); } catch { return; }
      if (m.t === 'hello') { this.myId = String(m.id); this.onHistory((m.history as ChatLine[]) ?? []); }
      else if (m.t === 'state') this.onState(m.players as RemoteInfo[]);
      else if (m.t === 'join') this.onJoin(m.player as RemoteInfo);
      else if (m.t === 'pos') this.onPos(m as unknown as RemoteInfo);
      else if (m.t === 'left') this.onLeft(String(m.id));
      else if (m.t === 'chat') this.onChat(m as unknown as ChatLine);
      else if (m.t === 'slow') this.onNotice('채팅은 조금 천천히 보내 주세요');
      else if (m.t === 'full') this.onNotice('이 맵에 사람이 너무 많아 다른 플레이어가 보이지 않습니다');
    };
    ws.onclose = () => {
      this.ws = null;
      this.onState([]);
      if (!this.closed) { setTimeout(() => !this.closed && this.open(), this.retry); this.retry = Math.min(30000, this.retry * 2); }
    };
  }
  close() { this.closed = true; this.ws?.close(); this.ws = null; }
  private send(m: unknown) { if (this.ws?.readyState === 1) this.ws.send(JSON.stringify(m)); }
  join(info: { map: string; name: string; look: Look; cls: string; level: number }) { this.joinMsg = { t: 'join', ...info }; this.send(this.joinMsg); }
  pos(p: { x: number; y: number; f: 1 | -1; m: boolean; g: boolean; r: boolean; s: number; k: string }) { this.send({ t: 'pos', ...p }); }
  say(text: string) { this.send({ t: 'say', text }); }
  get connected() { return this.ws?.readyState === 1; }
}
