// 게임 컨트롤러: 계정/월드 수명주기, 저장, 방치 보상, 서버 동기화. UI와 렌더러가 공유한다.
// 서버가 있으면 서버가 기준(방치 보상·행동·플레이 기록 검증), 없거나 끊기면 이 기기에서 그대로 진행한다.
import { Action, ActionResult, applyAction } from './core/actions';
import { AfkReport, computeAfk } from './core/afk';
import { MAPS } from './core/data';
import { Rng } from './core/rng';
import { Account, Character, Look, createCharacter, deleteCharacter, deserialize, newAccount, serialize, portalLock } from './core/state';
import { Input, World, WorldEvent } from './core/world';
import { ChatLine, Gear, Live, Net, RemoteInfo, SyncBody } from './net';

export interface SaveBackend { load(): string | null; save(data: string): void }
const store = (key: string): SaveBackend => ({
  load: () => { try { return localStorage.getItem(key); } catch { return null; } },
  save: (d) => { try { localStorage.setItem(key, d); } catch { /* 저장 불가 환경에서는 무시 */ } },
});
export const localBackend = store('looin-idle-save-v1');
/** 온라인 계정은 따로 보관(혹시 끊겼을 때 이어서 보여주기 위한 사본) */
const onlineCache = store('looin-idle-online-cache-v1');

export type NetState = 'local' | 'online' | 'offline';
const SYNC_EVERY = 15;

export class Game {
  acc: Account;
  world: World | null = null;
  /** 터치/키보드 입력 상태 */
  input: Input = { move: 0, climb: 0 };
  paused = false;
  /** local: 서버 없이, online: 서버 연결됨, offline: 서버가 있지만 지금 끊김 */
  netState: NetState = 'local';
  onWorld: (w: World | null) => void = () => {};
  onEvent: (e: WorldEvent) => void = () => {};
  onAfk: (r: AfkReport, c: Character) => void = () => {};
  onNet: (s: NetState, msg?: string) => void = () => {};
  /** 같은 맵의 다른 플레이어(서버가 중계). 렌더러가 읽어 그린다 */
  others = new Map<string, RemoteInfo & { seen: number }>();
  chat: ChatLine[] = [];
  onChat: (l: ChatLine) => void = () => {};
  private live: Live | null = null;
  private posT = 0; private lastPos = '';
  private rng = new Rng(Date.now());
  private saveT = 0; private syncT = 0; private retryT = 0;
  private net: Net | null = null;
  private backend: SaveBackend;
  private busy = false;

  constructor(serverUrl?: string, backend: SaveBackend = localBackend) {
    this.backend = serverUrl ? onlineCache : backend;
    this.acc = deserialize(this.backend.load()) ?? newAccount();
    this.acc.active = -1;
    if (serverUrl) this.net = new Net(serverUrl.replace(/\/$/, ''));
  }

  /** 서버에 로그인하고 서버의 계정을 받아온다. 실패하면 기기 사본으로 진행 */
  async connect() {
    if (!this.net) return;
    try {
      await this.net.login();
      const { account } = await this.net.account();
      this.adopt(account);
      this.setNet('online');
      this.openLive();
    } catch (e) {
      this.setNet('offline', (e as Error).message);
    }
  }
  private openLive() {
    if (this.live || !this.net) return;
    const net = this.net;
    const live = (this.live = new Live(() => net.liveUrl()));
    const t = () => Date.now();
    live.onState = (ps) => { this.others.clear(); for (const p of ps) this.others.set(p.id, { ...p, seen: t() }); };
    live.onJoin = (p) => this.others.set(p.id, { ...p, seen: t() });
    live.onPos = (p) => { const o = this.others.get(p.id); if (o) Object.assign(o, p, { seen: t() }); };
    live.onLeft = (id) => this.others.delete(id);
    live.onGear = (id, gear) => { const o = this.others.get(id); if (o) o.gear = gear; };
    live.onHistory = (ls) => { this.chat = ls.slice(-50); };
    live.onChat = (l) => { this.chat.push(l); if (this.chat.length > 50) this.chat.shift(); this.onChat(l); };
    live.onNotice = (m) => this.onEvent({ t: 'loot', text: m });
    live.open();
    if (this.char) this.joinLive();
  }
  private joinLive() {
    const c = this.char;
    if (!c || !this.live) return;
    this.others.clear();
    this.lastGear = JSON.stringify(this.gearOf(c));
    this.live.join({ map: c.mapId, name: c.name, look: c.look, cls: c.cls, level: c.level, gear: this.gearOf(c) });
  }
  /** 다른 사람에게 보이는 장비만 */
  private gearOf(c: Character): Gear {
    const e = c.equipment, g: Gear = {};
    if (e.weapon) g.weapon = e.weapon;
    if (e.hat) g.hat = e.hat;
    if (e.body) g.body = e.body;
    return g;
  }
  private lastGear = '';
  say(text: string) { this.live?.say(text); }
  get liveId() { return this.live?.myId ?? ''; }
  get liveOn() { return !!this.live?.connected; }

  private setNet(s: NetState, msg?: string) { this.netState = s; this.onNet(s, msg); }
  private get online() { return this.net && this.netState === 'online'; }
  /** 서버 상태를 받아들인다(서버가 기준) */
  private adopt(account: Account) {
    const active = this.acc.active;
    const fixed = deserialize(serialize(account));
    if (!fixed) return;
    this.acc = fixed;
    this.acc.active = active;
    this.backend.save(serialize(this.acc));
  }
  private syncBody(): SyncBody {
    return { character: this.char!, coins: this.acc.coins, cards: this.acc.cards, bosses: this.acc.bosses };
  }
  /** 서버와 어긋났을 때: 서버 상태로 맞추고 월드를 다시 만든다 */
  private resync(account: Account | undefined, why?: string) {
    if (!account) return;
    this.adopt(account);
    if (this.char) this.enterWorld();
    this.onEvent({ t: 'loot', text: `서버 기록과 맞추었습니다${why ? ` (${why})` : ''}` });
  }
  private netFail(e: unknown) {
    if ((e as { status?: number }).status === 409 || (e as { status?: number }).status === 401) this.connect();
    else this.setNet('offline', (e as Error).message);
  }

  get char(): Character | null { return this.acc.characters[this.acc.active] ?? null; }

  async create(name: string, look: Look): Promise<boolean> {
    if (this.online) {
      try {
        const r = await this.net!.create(name, look);
        if (r.error) { this.onEvent({ t: 'loot', text: r.error }); return false; }
        this.adopt(r.account);
        return true;
      } catch (e) { this.netFail(e); }
    }
    const c = createCharacter(this.acc, name, look, Date.now());
    this.save();
    return !!c;
  }

  /** 캐릭터 삭제(이름 확인). 실패하면 사유 */
  async deleteChar(idx: number, name: string): Promise<string | null> {
    await this.leave();
    if (this.online) {
      try {
        const r = await this.net!.removeChar(idx, name);
        if (r.error || !r.account) return r.error ?? '삭제하지 못했습니다';
        this.adopt(r.account);
        this.save();
        return null;
      } catch (e) { this.netFail(e); return (e as Error).message; }
    }
    const err = deleteCharacter(this.acc, idx, name);
    if (!err) this.save();
    return err;
  }

  async select(idx: number) {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.leave();
      if (!this.acc.characters[idx]) return;
      this.acc.active = idx;
      let rep: AfkReport | null = null;
      if (this.online) {
        try {
          const r = await this.net!.enter(idx);
          this.adopt(r.account);
          rep = r.report;
        } catch (e) { this.netFail(e); }
      }
      if (!this.online) rep = computeAfk(this.acc, this.char!, Date.now(), this.rng);
      this.enterWorld();
      if (rep) this.onAfk(rep, this.char!);
      this.save();
    } finally { this.busy = false; }
  }

  /** 현재 캐릭터를 방치 상태로 두고 캐릭터 선택으로 */
  async leave() {
    const c = this.char;
    if (c) {
      c.lastActive = Date.now();
      if (this.online) await this.pushSync().catch(() => undefined);
    }
    this.acc.active = -1;
    this.world = null;
    this.others.clear();
    this.save();
    this.onWorld(null);
  }

  private enterWorld() {
    this.world = new World(this.acc, this.char!, this.rng);
    this.syncT = 0;
    this.joinLive();
    this.onWorld(this.world);
  }

  /** 행동: 이 기기에 바로 적용하고(반응 빠르게), 온라인이면 서버에도 보낸다. 서버와 결과가 다르면 서버를 따른다 */
  act(a: Action): ActionResult {
    const i = this.acc.active;
    if (i < 0) return { ok: false, err: '캐릭터를 고르세요' };
    const body = this.online ? this.syncBody() : undefined;
    const snapshot = body ? JSON.parse(JSON.stringify(body)) as SyncBody : undefined;
    const r = applyAction(this.acc, i, a, Date.now());
    if (!r.ok) return r;
    this.save();
    if (this.online) {
      this.net!.action(i, a, snapshot).then((s) => {
        if (!s.ok) this.resync(s.account, s.err);
        else this.syncT = 0;
      }).catch((e) => this.netFail(e));
    }
    return r;
  }

  /** 순간이동처럼 행동으로 맵이 바뀐 뒤 월드를 다시 만든다 */
  travelTo() { this.enterWorld(); }

  /** 포탈로 이동(서버에서는 처치 조건·열쇠를 다시 확인) */
  travel(portal: number) {
    const r = this.act({ t: 'travel', portal });
    if (!r.ok) { this.onEvent({ t: 'loot', text: r.err ?? '이동할 수 없습니다' }); return; }
    this.enterWorld();
  }

  private pushSync() {
    const i = this.acc.active;
    if (!this.online || i < 0) return Promise.resolve();
    return this.net!.sync(i, this.syncBody()).then((s) => { if (!s.ok) this.resync(s.account, s.reason); }).catch((e) => this.netFail(e));
  }

  tick(dt: number) {
    // 끊겼으면 가끔 다시 붙어 본다
    if (this.net && this.netState === 'offline') {
      this.retryT += dt;
      if (this.retryT > 30) { this.retryT = 0; this.net.health().then(() => this.connect().then(() => this.char && this.select(this.acc.active))).catch(() => undefined); }
    }
    const w = this.world;
    if (!w || this.paused || this.busy) return;
    w.step(dt, this.input);
    if (w.events.length) {
      const evs = w.events.splice(0);
      for (const e of evs) {
        this.onEvent(e);
        if (e.t === 'respawn' && w.arena) continue; // 콜로세움에서는 결과 창에서 보상을 받고 나간다
        if (e.t === 'respawn') {
          // 원작처럼 쓰러지면 마을에서 다시 시작한다
          this.act({ t: 'respawn' });
          this.enterWorld();
          return;
        }
        if (e.t === 'arrive' && e.what === 'portal') {
          const q = w.map.portals[e.idx];
          if (!w.portalOpen(q)) { this.onEvent({ t: 'loot', text: `아직 열리지 않았습니다(${portalLock(w.char, w.map.id, q)})` }); continue; }
          if (!MAPS[q.to]) continue;
          this.travel(e.idx);
          return;
        }
      }
    }
    this.saveT += dt;
    if (this.saveT > 5) { this.saveT = 0; this.save(); }
    this.syncT += dt;
    if (this.syncT > SYNC_EVERY) { this.syncT = 0; this.pushSync(); }
    // 내 위치를 초당 8번까지, 바뀌었을 때만
    this.posT += dt;
    if (this.live && this.posT > 0.125) {
      this.posT = 0;
      const p = w.player;
      const msg = { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, f: p.facing, m: Math.abs(p.vx) > 6, g: p.onGround, r: p.rope >= 0, s: p.swingId, k: p.swingKind };
      const key = JSON.stringify(msg);
      if (key !== this.lastPos) { this.lastPos = key; this.live.pos(msg); }
      // 장비를 바꾸면 같은 맵 사람들에게 알린다
      const g = this.gearOf(this.char!), gk = JSON.stringify(g);
      if (gk !== this.lastGear) { this.lastGear = gk; this.live.gear(g); }
    }
  }

  save() {
    const c = this.char;
    if (c && !this.paused) c.lastActive = Date.now();
    this.backend.save(serialize(this.acc));
  }

  /** 앱이 백그라운드로 갈 때 */
  suspend() {
    if (this.paused) return;
    this.save();
    this.pushSync();
    this.paused = true;
  }
  /** 앱이 다시 보일 때: 자리를 비운 동안의 보상 지급 */
  resume() {
    if (!this.paused) return;
    this.paused = false;
    const c = this.char;
    if (!c) return;
    if (this.online) { this.select(this.acc.active); return; }
    const rep = computeAfk(this.acc, c, Date.now(), this.rng);
    if (rep) this.onAfk(rep, c);
    this.save();
  }

  /** 계정 삭제(온라인이면 서버에서도) */
  async deleteAccount() {
    if (this.online) await this.net!.remove();
    this.acc = newAccount(); this.acc.active = -1;
    this.world = null;
    this.backend.save(serialize(this.acc));
    try { localStorage.removeItem('looin-idle-auth-v1'); } catch { /* 없음 */ }
    this.onWorld(null);
  }
}
