// 게임 컨트롤러: 계정/월드 수명주기, 저장, 방치 보상. UI와 렌더러가 공유한다.
// 멀티 전환 시 SaveBackend 구현만 서버 API로 바꾸면 된다.
import { AfkReport, computeAfk } from './core/afk';
import { ITEMS, MAPS, PortalDef } from './core/data';
import { Rng } from './core/rng';
import { Account, Character, Look, countItem, createCharacter, deserialize, newAccount, removeItem, serialize } from './core/state';
import { Input, World, WorldEvent } from './core/world';

export interface SaveBackend { load(): string | null; save(data: string): void }
const KEY = 'looin-idle-save-v1';
export const localBackend: SaveBackend = {
  load: () => { try { return localStorage.getItem(KEY); } catch { return null; } },
  save: (d) => { try { localStorage.setItem(KEY, d); } catch { /* 저장 불가 환경에서는 무시 */ } },
};

export class Game {
  acc: Account;
  world: World | null = null;
  /** 터치/키보드 입력 상태 */
  input: Input = { move: 0, climb: 0 };
  paused = false;
  onWorld: (w: World | null) => void = () => {};
  onEvent: (e: WorldEvent) => void = () => {};
  onAfk: (r: AfkReport, c: Character) => void = () => {};
  private rng = new Rng(Date.now());
  private saveT = 0;

  constructor(private backend: SaveBackend = localBackend) {
    this.acc = deserialize(backend.load()) ?? newAccount();
    this.acc.active = -1;
  }

  get char(): Character | null { return this.acc.characters[this.acc.active] ?? null; }

  create(name: string, look: Look): Character | null {
    const c = createCharacter(this.acc, name, look, Date.now());
    this.save();
    return c;
  }

  select(idx: number) {
    this.leave();
    const c = this.acc.characters[idx];
    if (!c) return;
    this.acc.active = idx;
    const rep = computeAfk(this.acc, c, Date.now(), this.rng);
    this.enterWorld();
    if (rep) this.onAfk(rep, c);
    this.save();
  }

  /** 현재 캐릭터를 방치 상태로 두고 캐릭터 선택으로 */
  leave() {
    const c = this.char;
    if (c) c.lastActive = Date.now();
    this.acc.active = -1;
    this.world = null;
    this.save();
    this.onWorld(null);
  }

  private enterWorld() {
    this.world = new World(this.acc, this.char!, this.rng);
    this.onWorld(this.world);
  }

  travel(p: PortalDef) {
    const c = this.char;
    if (!c || !this.world || !MAPS[p.to] || !this.world.portalOpen(p)) return;
    // 열쇠가 필요한 문: 들어갈 때 열쇠가 사라진다
    if (p.key) {
      if (countItem(c, p.key) < 1) { this.onEvent({ t: 'loot', text: `${ITEMS[p.key].name}가 있어야 들어갈 수 있습니다` }); return; }
      removeItem(c, p.key, 1);
    }
    c.mapId = p.to; c.x = p.toX; c.y = p.toY ?? 0;
    this.enterWorld();
    this.save();
  }

  tick(dt: number) {
    const w = this.world;
    if (!w || this.paused) return;
    w.step(dt, this.input);
    if (w.events.length) {
      const evs = w.events.splice(0);
      for (const e of evs) {
        this.onEvent(e);
        if (e.t === 'arrive' && e.what === 'portal') {
          const q = w.map.portals[e.idx];
          if (w.portalOpen(q)) { this.travel(q); return; }
          this.onEvent({ t: 'loot', text: `이 맵에서 ${q.reqKills}마리를 처치해야 열립니다` });
        }
      }
    }
    this.saveT += dt;
    if (this.saveT > 5) { this.saveT = 0; this.save(); }
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
    this.paused = true;
  }
  /** 앱이 다시 보일 때: 자리를 비운 동안의 보상 지급 */
  resume() {
    if (!this.paused) return;
    this.paused = false;
    const c = this.char;
    if (c) {
      const rep = computeAfk(this.acc, c, Date.now(), this.rng);
      if (rep) this.onAfk(rep, c);
    }
    this.save();
  }
}
