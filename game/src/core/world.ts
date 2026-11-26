// 현재 맵의 실시간 시뮬레이션(순수 로직). 렌더러는 이 상태를 읽어 그리기만 한다.
import {
  arenaOf, CRYSTAL_CHANCE, crystalOf, MINIBOSSES, arenaWaves, baseClass, CARD_BY_ID, CARD_BOSS_CHANCE, NODE_CARD_CHANCE, CARD_CHANCE, CARD_UNOWNED_MULT, CLEAVE_RANGE, ITEMS, MAPS, MONSTERS, MapDef, MonsterDef, NODES, NOVA_RADIUS, NodeDef, Platform, PortalDef,
  SKILL_NAMES, SMASH_RANGE, TALENT, healPct, smashMult, isHealFood, bossDefAt } from './data';
import { Rng } from './rng';
import { multiKill } from './progress';
import { meritValue } from './tasks';
import { BOOST_SECS, drinkBoosts, Account, Character, Derived, addItem, anvilTick, derive, dmgTaken, gainSkillXp, gainXp, hitChance, itemRoom, minibossKey, minibossOpen, MINIBOSS_IDS, noteKill, portalReady, foodWait } from './state';

/** move: 좌우(-1/0/1), climb: 로프 오르내리기(-1 위 / 1 아래) */
export interface Input { move: number; climb: number }
export type SwingKind = 'attack' | 'shoot' | 'cast' | 'mining' | 'chopping' | 'fishing' | 'catching';

/** 터치로 내린 명령. 도착하거나 끝나면 사라진다. */
export type Command =
  | { k: 'move'; x: number; y: number }
  | { k: 'mob'; uid: number }
  | { k: 'node'; uid: number }
  | { k: 'portal'; idx: number }
  | { k: 'fac'; idx: number };

export interface Player {
  x: number; y: number; vx: number; vy: number;
  onGround: boolean; facing: 1 | -1;
  attackT: number; swingT: number; swingKind: SwingKind; swingId: number;
  dead: number; hurtT: number;
  /** 매달린 로프 번호(-1이면 없음) */
  rope: number;
  /** 액티브 스킬별 남은 재사용 대기시간 */
  cd: Record<string, number>;
}
export interface Mob {
  uid: number; def: MonsterDef; plat: Platform;
  x: number; y: number; dir: 1 | -1; hp: number;
  alive: boolean; t: number; moving: boolean;
  hitT: number; contactCd: number; respawnT: number; spawnAge: number;
  /** 보스: 다음 내려찍기까지, 내려찍기 예고 남은 시간 */
  slamT: number; windup: number;
  /** 수정 몬스터로 바뀐 동안 원래 몬스터 */
  base?: MonsterDef;
}
export interface Drop {
  uid: number; coin: boolean; id: string; qty: number;
  x: number; y: number; vx: number; vy: number; floorY: number; age: number;
  /** 주웠으면 캐릭터에게 날아온다 */
  picked?: boolean; flyT?: number;
}
/** 떨어진 아이템이 남아 있는 시간(초)과 한 맵에 쌓이는 최대 수 */
export const DROP_LIFE = 30 * 60, MAX_DROPS = 300;
export interface NodeInst { uid: number; def: NodeDef; x: number; y: number; progress: number; shakeT: number }
export interface Shot { uid: number; kind: 'arrow' | 'orb'; x: number; y: number; target: Mob; mult: number; angle: number }

export type WorldEvent =
  | { t: 'gate'; to: number }
  | { t: 'dmg'; x: number; y: number; amount: number; crit: boolean; onPlayer: boolean; miss?: boolean }
  | { t: 'heal'; x: number; y: number; amount: number; food?: string }
  | { t: 'kill'; uid: number; x: number; y: number }
  | { t: 'loot'; text: string; item?: string }
  /** 화면 가운데 경고(잠긴 문 등) */
  | { t: 'warn'; text: string }
  | { t: 'level'; level: number }
  | { t: 'skill'; name: string; level: number }
  | { t: 'yield'; x: number; y: number; item: string }
  | { t: 'cast'; id: string; x: number; y: number }
  | { t: 'arrive'; what: 'portal' | 'fac'; idx: number }
  | { t: 'telegraph'; x: number; y: number; r: number; time: number }
  | { t: 'slam'; x: number; y: number; r: number }
  | { t: 'boss'; name: string }
  | { t: 'arenaEnd'; waves: number; score: number }
  | { t: 'miniboss'; name: string }
  | { t: 'faint' }
  /** 쓰러진 뒤 마을에서 부활: 게임이 마을로 옮긴다 */
  | { t: 'respawn' };

export const SWING_TIME = 0.32;
export const GATHER_INTERVAL = 0.7;
const GRAVITY = 900, SHOT_SPEED = 330, CLIMB_SPEED = 62, ACCEL = 620;
/** 근접 공격은 대상과 절반쯤 겹칠 만큼 다가가서 시작한다 */
const MELEE_NEAR = 11;
/** 포탈·NPC 등은 대상과 겹치는 지점까지 걸어가서 상호작용한다 */
const INTERACT_STOP = 3;
export const HURT_TIME = 0.55;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const IDLE: Input = { move: 0, climb: 0 };
interface Rope { x: number; top: number; bottom: number; a: number; b: number }

export class World {
  /** 남은 채집 보호 시간(초). 0보다 크면 일반 몬스터의 몸통 박치기를 받지 않는다 */
  gatherT = 0;
  readonly map: MapDef;
  readonly platforms: Platform[];
  readonly player: Player;
  readonly mobs: Mob[] = [];
  readonly drops: Drop[] = [];
  readonly nodes: NodeInst[] = [];
  readonly shots: Shot[] = [];
  events: WorldEvent[] = [];
  command: Command | null = null;
  d: Derived;
  private uid = 1;
  private swingTarget: Mob | NodeInst | null = null;
  private hitDone = true;
  private aiTarget: Mob | NodeInst | null = null;
  /** 로프와 그 양 끝 발판(a: 아래, b: 위) */
  readonly ropes: Rope[] = [];
  private engaged = -1;
  /** 길 찾기가 고른 로프 진행 방향 */
  private climbDir = 0;
  /** 콜로세움 진행: 남은 시간, 나온 웨이브 수, 다음 웨이브까지, 점수·배율(연속 처치) */
  arena: { t: number; wave: number; next: number; kills: number; score: number; mult: number; comboT: number; done: boolean } | null = null;
  private miniT = 0;

  constructor(readonly acc: Account, readonly char: Character, readonly rng: Rng) {
    this.map = MAPS[char.mapId] ?? MAPS.town;
    char.mapId = this.map.id;
    this.platforms = [{ x: 0, y: 0, w: this.map.width }, ...this.map.platforms];
    this.d = derive(char, acc);
    const sx = clamp(char.x, 10, this.map.width - 10);
    // 저장된 높이에 발판이 있으면 그 위에, 아니면 지면에 선다
    const sy = this.platforms.some((q) => q.y === char.y && sx >= q.x && sx <= q.x + q.w) ? char.y! : 0;
    this.player = {
      x: sy === 0 ? this.groundX(sx) : sx, y: sy, vx: 0, vy: 0, onGround: true, facing: 1,
      attackT: 0, swingT: 0, swingKind: 'attack', swingId: 0, dead: 0, hurtT: 0, rope: -1, cd: {},
    };
    for (const r of this.map.ropes) {
      const at = (y: number) => this.platforms.findIndex((q) => q.y === y && r.x >= q.x && r.x <= q.x + q.w);
      const a = at(r.bottom), b = at(r.top);
      if (a >= 0 && b >= 0) this.ropes.push({ ...r, a, b });
    }
    const totalW = this.platforms.reduce((s, p) => s + p.w, 0);
    for (const s of this.map.spawns) {
      for (let i = 0; i < s.count; i++) {
        // 발판 너비에 비례해 배치
        let r = rng.next() * totalW, plat = this.platforms[0];
        for (const p of this.platforms) { if (r < p.w) { plat = p; break; } r -= p.w; }
        const def = MONSTERS[s.monster];
        const m: Mob = {
          uid: this.uid++, def, plat, x: 0, y: plat.y, dir: rng.chance(0.5) ? 1 : -1, hp: def.hp,
          alive: true, t: rng.range(0, 3), moving: true, hitT: 0, contactCd: 0, respawnT: 0, spawnAge: 1, slamT: 0, windup: 0,
        };
        this.placeMob(m);
        this.mobs.push(m);
      }
    }
    if (this.map.boss) {
      const def = bossDefAt(MONSTERS[this.map.boss], this.acc.bossTier?.[this.map.boss] ?? 0), plat = this.platforms[0];
      this.mobs.push({ uid: this.uid++, def, plat, x: this.map.width * 0.68, y: 0, dir: -1, hp: def.hp, alive: true, t: 0, moving: true,
        hitT: 0, contactCd: 0, respawnT: 0, spawnAge: 1, slamT: def.boss!.slamEvery, windup: 0 });
    }
    for (const n of this.map.nodes) {
      this.nodes.push({ uid: this.uid++, def: NODES[n.node], x: n.x, y: 0, progress: 0, shakeT: 0 });
    }
    if (this.map.arena) { this.arena = { t: arenaOf(this.map.id).seconds, wave: 0, next: 0, kills: 0, score: 0, mult: 1, comboT: 0, done: false }; }
    this.checkMinibosses();
  }

  /** 지금 나와 있어야 할 미니보스를 맵에 놓는다(이미 있거나 이번 회차에 잡았으면 건너뜀) */
  private checkMinibosses() {
    const now = Date.now();
    for (const mb of MINIBOSSES) {
      if (mb.map !== this.map.id || this.mobs.some((m) => m.def.id === mb.id)) continue;
      if (!minibossOpen(this.acc, mb.id, now)) continue;
      const def = MONSTERS[mb.id], plat = this.platforms[0];
      this.mobs.push({ uid: this.uid++, def, plat, x: mb.x, y: 0, dir: -1, hp: def.hp, alive: true, t: 0, moving: true,
        hitT: 0, contactCd: 0, respawnT: 0, spawnAge: 0, slamT: 0, windup: 0 });
      this.events.push({ t: 'loot', text: `${def.name}이(가) 나타났습니다!` });
    }
  }

  /** 콜로세움: 다음 웨이브를 내보낸다 */
  private spawnWave() {
    const a = this.arena!, [id, n] = arenaOf(this.map.id).waves[a.wave];
    const def = MONSTERS[id];
    for (let i = 0; i < n; i++) {
      const plat = this.platforms[i % this.platforms.length];
      const m: Mob = { uid: this.uid++, def, plat, x: 0, y: plat.y, dir: this.rng.chance(0.5) ? 1 : -1, hp: def.hp, alive: true, t: this.rng.range(0, 2), moving: true,
        hitT: 0, contactCd: 0, respawnT: 0, spawnAge: 0, slamT: 0, windup: 0 };
      this.placeMob(m);
      this.mobs.push(m);
    }
    a.wave++; a.next = arenaOf(this.map.id).waveGap;
  }
  private stepArena(dt: number) {
    const a = this.arena!;
    if (a.done) return;
    a.t -= dt; a.next -= dt; a.comboT -= dt;
    if (a.comboT <= 0) a.mult = 1;
    const alive = this.mobs.some((m) => m.alive);
    if (a.wave < arenaOf(this.map.id).waves.length && (a.wave === 0 || !alive || a.next <= 0)) this.spawnWave();
    const cleared = a.wave >= arenaOf(this.map.id).waves.length && !alive;
    if (cleared || a.t <= 0 || this.player.dead > 0) {
      a.done = true;
      // 일찍 다 깨면 남은 시간만큼 점수 보너스
      if (cleared) a.score += Math.round(a.t * 20);
      this.events.push({ t: 'arenaEnd', waves: arenaWaves(a.kills, arenaOf(this.map.id)), score: Math.round(a.score) });
    }
  }

  /** 언덕(solid) 아래의 지면 구간: 지나갈 수 없는 벽 */
  private walls(y: number): [number, number][] {
    return this.platforms.filter((q) => q.solid && q.y < y).map((q) => [q.x + 10, q.x + q.w - 10]);
  }
  /** 발판 위에서 실제로 걸을 수 있는 구간(벽 제외). 언덕은 맵 가장자리에 붙어 있다고 가정 */
  walkRange(q: Platform): [number, number] {
    let lo = q.x + 8, hi = q.x + q.w - 8;
    for (const [a, b] of this.walls(q.y)) {
      if (b < lo || a > hi) continue;
      if (a > (lo + hi) / 2) hi = Math.min(hi, a - 2); else lo = Math.max(lo, b + 2);
    }
    return [lo, hi];
  }
  /** 몬스터가 다니는 구간: 걸을 수 있는 구간에서 끝쪽 문 앞은 뺀다(문 너머 맵 끝에 숨지 않게) */
  private mobRange(q: Platform): [number, number] {
    let [lo, hi] = this.walkRange(q);
    for (const p of this.map.portals) {
      if ((p.y ?? 0) !== q.y) continue;
      if (p.x < lo + 40) lo = Math.max(lo, p.x + 30);
      if (p.x > hi - 40) hi = Math.min(hi, p.x - 30);
    }
    return [lo, hi];
  }
  private groundX(x: number) { const [lo, hi] = this.walkRange(this.platforms[0]); return clamp(x, lo, hi); }

  private placeMob(m: Mob) {
    const [lo0, hi0] = this.mobRange(m.plat), lo = lo0 + 4, hi = hi0 - 4;
    for (let i = 0; i < 6; i++) {
      m.x = this.rng.range(lo, hi);
      // 포탈 근처와 플레이어 바로 위에는 스폰하지 않는다
      const nearPortal = this.map.portals.some((p) => (p.y ?? 0) === m.plat.y && Math.abs(p.x - m.x) < 50);
      if (!nearPortal && Math.abs(m.x - this.player.x) > 40) break;
    }
  }

  portalOpen(q: PortalDef) { return portalReady(this.char, this.map.id, q); }
  private canUse(n: NodeInst) { return this.char.skills[n.def.skill].lv >= n.def.reqLv; }

  /** 화면을 터치한 월드 좌표를 명령으로 바꾼다. 대상이 있으면 그 대상, 없으면 그 지점으로 이동 */
  tap(x: number, y: number): Command | null {
    const p = this.player, c = this.char, map = this.map;
    if (p.dead > 0) return null;
    this.engaged = -1;
    const near = (tx: number, w: number, top: number, base = 0) => Math.abs(tx - x) <= w && y >= base + top && y <= base + 8;
    let cmd: Command | null = null;
    const mob = this.mobs.filter((m) => m.alive && Math.abs(m.x - x) <= 15 && y >= m.y - 30 && y <= m.y + 8)
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    const node = this.nodes.find((n) => near(n.x, 18, -62));
    const portal = map.portals.findIndex((q) => near(q.x, 16, -48, q.y ?? 0));
    const fac = map.facilities.findIndex((f) => near(f.x, 18, -38, f.y));
    if (mob) { cmd = { k: 'mob', uid: mob.uid }; c.activity = { k: 'fight' }; }
    else if (portal >= 0) cmd = { k: 'portal', idx: portal };
    else if (fac >= 0) cmd = { k: 'fac', idx: fac };
    else if (node) {
      if (!this.canUse(node)) { this.events.push({ t: 'loot', text: `${SKILL_NAMES[node.def.skill]} Lv.${node.def.reqLv} 필요` }); return null; }
      cmd = { k: 'node', uid: node.uid }; c.activity = { k: 'gather', node: node.def.id };
    } else {
      // 바닥(발판 윗면 근처, 지면은 그 아래 흙까지)을 눌렀을 때만 이동한다. 허공은 무시.
      let py: number | null = null, best = 1e9;
      for (const q of this.platforms) {
        if (x < q.x || x > q.x + q.w) continue;
        const gap = y - q.y; // 양수면 윗면보다 아래를 누른 것
        if (gap < -16 || gap > (q.y === 0 || q.solid ? 1e9 : 14)) continue;
        // 언덕 속(벽 구간)의 낮은 바닥은 고를 수 없다
        const [lo, hi] = this.walkRange(q);
        if (x < lo - 8 || x > hi + 8) continue;
        if (Math.abs(gap) < best) { best = Math.abs(gap); py = q.y; }
      }
      if (py === null) return null;
      const q = this.platforms.find((pl) => pl.y === py && x >= pl.x && x <= pl.x + pl.w)!;
      const [lo, hi] = this.walkRange(q);
      cmd = { k: 'move', x: clamp(x, lo, hi), y: py };
    }
    this.aiTarget = null;
    return (this.command = cmd);
  }

  /** 액티브 스킬 사용. 성공 여부 반환 */
  /** 자동을 끄면 하던 일을 멈추고 그 자리에 선다 */
  stopAuto() {
    this.command = null; this.aiTarget = null; this.engaged = -1; this.climbDir = 0;
    const p = this.player;
    p.vx = 0;
  }

  useSkill(id: string): boolean {
    const p = this.player, c = this.char, lv = c.talents[id] ?? 0, t = TALENT[id];
    const d = this.d;
    if (!t?.active || lv <= 0 || p.dead > 0 || (p.cd[id] ?? 0) > 0 || c.mp < t.active.mana) return false;
    // 걷거나 로프를 타는 중에는 쓸 수 없다
    if (!p.onGround || p.rope >= 0 || Math.abs(p.vx) > 1) return false;
    const live = (r: number, cx = p.x, cy = p.y) => this.mobs.filter((m) => m.alive && m.spawnAge > 0.4 && Math.abs(m.x - cx) <= r && Math.abs(m.y - cy) < 22);
    const pose = (kind: SwingKind) => {
      p.swingKind = kind; p.swingT = SWING_TIME; p.swingId++; p.attackT = Math.max(p.attackT, d.atkInterval * 0.6);
      this.hitDone = true;
    };
    let fx = p.x, fy = p.y;
    if (id === 'smash' || id === 'cleave') {
      const hit = live(id === 'smash' ? SMASH_RANGE : CLEAVE_RANGE);
      if (!hit.length) return false;
      pose('attack');
      const mult = id === 'smash' ? smashMult(lv) : 3 + lv * 0.3;
      for (const m of hit) this.damageMob(m, d, mult, m.x >= p.x ? 1 : -1);
    } else if (id === 'volley') {
      const hit = live(d.range + 20).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x)).slice(0, 4);
      if (!hit.length) return false;
      p.facing = hit[0].x >= p.x ? 1 : -1;
      pose('shoot');
      for (const m of hit) this.fire(m, 1.5 + lv * 0.15);
    } else if (id === 'nova') {
      const tgt = live(d.range + 20).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!tgt) return false;
      p.facing = tgt.x >= p.x ? 1 : -1;
      pose('cast');
      fx = tgt.x; fy = tgt.y;
      for (const m of live(NOVA_RADIUS, tgt.x, tgt.y)) this.damageMob(m, d, 2.2 + lv * 0.25, m.x >= tgt.x ? 1 : -1);
    } else if (id === 'fortune') {
      const hit = live(SMASH_RANGE);
      if (!hit.length) return false;
      pose('attack');
      for (const m of hit) this.damageMob(m, d, 2 + lv * 0.25, m.x >= p.x ? 1 : -1);
    } else if (id === 'destiny') {
      const tgt = live(d.range + 40).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!tgt) return false;
      p.facing = tgt.x >= p.x ? 1 : -1;
      pose('attack');
      fx = tgt.x; fy = tgt.y;
      for (const m of live(NOVA_RADIUS, tgt.x, tgt.y)) this.damageMob(m, d, 3 + lv * 0.3, m.x >= tgt.x ? 1 : -1);
    } else if (id === 'talestorm' || id === 'lifesong') {
      const hit = live(id === 'talestorm' ? 90 : 120);
      if (id === 'lifesong') {
        const before = c.hp;
        c.hp = Math.min(d.maxHp, c.hp + d.maxHp * (0.4 + lv * 0.03));
        if (c.hp > before) this.events.push({ t: 'heal', x: p.x, y: p.y - 34, amount: Math.round(c.hp - before) });
      } else if (!hit.length) return false;
      pose('attack');
      for (const m of hit) this.damageMob(m, d, id === 'talestorm' ? 4 + lv * 0.4 : 5 + lv * 0.5, m.x >= p.x ? 1 : -1);
    } else if (id === 'quake' || id === 'rampage') {
      // 3차 전사: 넓은 충격파 / 주변 난타
      const hit = live(id === 'quake' ? 90 : CLEAVE_RANGE);
      if (!hit.length) return false;
      pose('attack');
      for (const m of hit) this.damageMob(m, d, id === 'quake' ? 4 + lv * 0.4 : 5 + lv * 0.5, m.x >= p.x ? 1 : -1);
    } else if (id === 'pierce' || id === 'arrowrain') {
      // 3차 궁수: 가까운 여섯 / 사거리 안 모두에게 화살
      const all = live(d.range + 20).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x));
      const hit = id === 'pierce' ? all.slice(0, 6) : all;
      if (!hit.length) return false;
      p.facing = hit[0].x >= p.x ? 1 : -1;
      pose('shoot');
      for (const m of hit) this.fire(m, id === 'pierce' ? 3 + lv * 0.3 : 2.5 + lv * 0.25);
    } else if (id === 'meteor' || id === 'starfall') {
      // 3차 마법사: 대상 주변 넓은 폭발
      const tgt = live(d.range + 20).sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0];
      if (!tgt) return false;
      p.facing = tgt.x >= p.x ? 1 : -1;
      pose('cast');
      fx = tgt.x; fy = tgt.y;
      for (const m of live(id === 'meteor' ? 80 : NOVA_RADIUS + 10, tgt.x, tgt.y)) this.damageMob(m, d, id === 'meteor' ? 4.5 + lv * 0.45 : 3.5 + lv * 0.35, m.x >= tgt.x ? 1 : -1);
    } else if (id === 'heal') {
      if (c.hp >= d.maxHp) return false;
      const before = c.hp;
      c.hp = Math.min(d.maxHp, c.hp + d.maxHp * healPct(lv));
      this.events.push({ t: 'heal', x: p.x, y: p.y - 34, amount: Math.round(c.hp - before) });
    }
    c.mp -= t.active.mana;
    p.cd[id] = t.active.cooldown;
    this.events.push({ t: 'cast', id, x: fx, y: fy });
    return true;
  }

  /** 음식 재사용 대기(초) */
  eatT = 0;
  boostT = 0;
  /** 음식 칸에서 하나 먹는다 */
  private eat(d: Derived) {
    const c = this.char, i = c.foods.findIndex((x) => x && isHealFood(x.id)), f = c.foods[i]!, it = ITEMS[f.id], p = this.player;
    const before = c.hp;
    c.hp = Math.min(d.maxHp, c.hp + (it.heal ?? 0));
    if (--f.qty <= 0) c.foods[i] = null;
    this.eatT = foodWait(c, f.id);
    this.events.push({ t: 'heal', x: p.x, y: p.y - 34, amount: Math.round(c.hp - before), food: f.id });
  }

  private fire(target: Mob, mult: number) {
    const p = this.player;
    this.shots.push({ uid: this.uid++, kind: baseClass(this.char.cls) === 'mage' ? 'orb' : 'arrow', x: p.x + p.facing * 8, y: p.y - 15, target, mult, angle: p.facing > 0 ? 0 : Math.PI });
  }

  private damageMob(m: Mob, d: Derived, mult: number, push: number) {
    if (!m.alive) return;
    if (!this.rng.chance(hitChance(d.acc, m.def.acc))) {
      this.events.push({ t: 'dmg', x: m.x, y: m.y - 18, amount: 0, crit: false, onPlayer: false, miss: true });
      return;
    }
    const crit = this.rng.chance(d.crit);
    const boss = m.def.boss || MINIBOSS_IDS.has(m.def.id) || m.def.id === 'champion';
    const amount = Math.max(1, Math.round(d.dmg * mult * this.rng.range(0.8, 1.2) * (crit ? d.critMult : 1) * (boss ? d.bossMult : 1)));
    m.hp -= amount; m.hitT = 0.22;
    m.x = clamp(m.x + push * 5, m.plat.x + 8, m.plat.x + m.plat.w - 8);
    this.events.push({ t: 'dmg', x: m.x, y: m.y - 18, amount, crit, onPlayer: false });
    if (m.hp <= 0) this.kill(m, d);
  }

  step(dt: number, manual: Input) {
    dt = Math.min(dt, 0.05);
    const p = this.player, c = this.char;
    const d = (this.d = derive(c, this.acc));
    c.x = p.x; c.y = p.onGround ? p.y : c.y;
    // 모루 생산은 플레이 중에도 계속된다
    const anvil = anvilTick(c, dt);
    if (anvil.levels) this.events.push({ t: 'skill', name: SKILL_NAMES.smithing, level: c.skills.smithing.lv });

    for (const n of this.nodes) n.shakeT = Math.max(0, n.shakeT - dt);
    if (this.arena) this.stepArena(dt);
    this.miniT -= dt;
    if (this.miniT <= 0) { this.miniT = 5; this.checkMinibosses(); }
    this.stepMobs(dt, d);
    this.stepDrops(dt);
    this.stepShots(dt, d);

    if (p.dead > 0) {
      p.dead -= dt; this.command = null; p.rope = -1;
      if (p.dead <= 0) { c.hp = d.maxHp; c.mp = d.maxMp; this.events.push({ t: 'respawn' }); }
      return;
    }
    c.hp = Math.min(d.maxHp, c.hp + d.regen * dt);
    c.mp = Math.min(d.maxMp, c.mp + d.mpRegen * dt);
    this.eatT = Math.max(0, this.eatT - dt);
    if (c.foods.some((x) => x && isHealFood(x.id)) && c.hp < d.maxHp * 0.45 && this.eatT <= 0) this.eat(d);
    // 버프 물약: 10분마다 하나씩 마신다(사냥·채집 중에만)
    if (this.map.spawns.length || this.map.nodes.length) {
      this.boostT += dt;
      if (this.boostT >= BOOST_SECS) { this.boostT -= BOOST_SECS; drinkBoosts(c, 1); }
    }
    p.hurtT = Math.max(0, p.hurtT - dt);
    this.gatherT = Math.max(0, this.gatherT - dt);
    for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
    if (c.auto && this.acc.options.autoAttacks) {
      // 원작처럼: 지금 공격 바의 왼쪽 칸부터 쓸 수 있는 것을 시전
      for (const id of c.attackBars[c.attackPage] ?? []) {
        if (!id) continue;
        if (id === 'heal') { if (c.hp < d.maxHp * 0.5 && this.useSkill('heal')) break; }
        else if (c.activity.k !== 'gather' && this.useSkill(id)) break;
      }
    }

    // 조작 우선순위: 키보드 > 터치 명령 > AUTO
    const keyed = manual.move !== 0 || manual.climb !== 0;
    if (keyed) { this.command = null; this.engaged = -1; this.climbDir = 0; }
    const inp = keyed ? manual : this.command ? this.follow(d) : c.auto ? this.ai(d) : IDLE;

    if (p.rope >= 0) {
      // 로프: 위아래로만 움직이고, 끝에 닿으면 그 발판에 선다
      const r = this.ropes[p.rope];
      p.x = r.x; p.vx = 0; p.vy = inp.climb * CLIMB_SPEED;
      p.y += p.vy * dt;
      if (p.y <= r.top) { p.y = r.top; p.rope = -1; p.onGround = true; p.vy = 0; }
      else if (p.y >= r.bottom) { p.y = r.bottom; p.rope = -1; p.onGround = true; p.vy = 0; }
      else if (keyed && manual.move) { p.rope = -1; p.onGround = false; p.vy = 0; }
    } else {
      // 좌우 이동: 가속/감속을 줘서 뚝뚝 끊기지 않게. 공격 모션 중에는 제자리.
      const want = p.swingT > 0 ? 0 : inp.move * d.speed;
      p.vx += clamp(want - p.vx, -ACCEL * dt, ACCEL * dt);
      if (inp.move && p.swingT <= 0) p.facing = inp.move > 0 ? 1 : -1;
      const nx = clamp(p.x + p.vx * dt, 10, this.map.width - 10);
      // 언덕 아래로는 걸어 들어갈 수 없다
      let bx = nx;
      for (const [a, b] of this.walls(p.y - 1)) if (bx > a && bx < b) bx = p.x <= a ? a : p.x >= b ? b : bx;
      if (bx !== nx) p.vx = 0;
      p.x = bx;
      if (inp.climb && p.onGround) {
        const i = this.ropes.findIndex((r) => Math.abs(r.x - p.x) < 5 && p.y === (inp.climb < 0 ? r.bottom : r.top));
        if (i >= 0) { p.rope = i; p.onGround = false; p.x = this.ropes[i].x; p.vx = 0; p.vy = 0; }
      }
      if (p.onGround) {
        const under = this.platforms.some((q) => q.y === p.y && p.x >= q.x && p.x <= q.x + q.w);
        if (!under) p.onGround = false;
      }
      if (!p.onGround && p.rope < 0) {
        const prevY = p.y;
        p.vy += GRAVITY * dt;
        p.y += p.vy * dt;
        for (const q of this.platforms) {
          if (prevY <= q.y && p.y >= q.y && p.x >= q.x && p.x <= q.x + q.w) { p.y = q.y; p.vy = 0; p.onGround = true; break; }
        }
      }
    }

    // 공격 / 채집
    p.attackT -= dt;
    if (p.swingT > 0) {
      p.swingT -= dt;
      if (!this.hitDone && p.swingT <= SWING_TIME * 0.55) { this.hitDone = true; this.applyHit(d); }
    }
    // 공격·채집은 멈춰 서 있을 때만(걷기·로프 타기가 끝난 뒤)
    const still = p.onGround && p.rope < 0 && inp.move === 0 && inp.climb === 0;
    if (p.attackT <= 0 && p.swingT <= 0 && still) {
      const cmd = this.command;
      // 터치/AUTO 중에는 자리를 잡은(engaged) 대상만 친다 → 지나가다 멈칫거리지 않는다.
      // 한 번 시작한 공격은 대상이 자리를 벗어나도 적용된다(applyHit는 거리 검사를 하지 않음).
      // 자동이 켜져 있거나 몬스터를 눌러 지정했을 때만 싸운다(자동이 꺼져 있으면 옆에 적이 있어도 치지 않는다)
      const fighting = c.auto || cmd?.k === 'mob';
      const mob = fighting ? this.mobs.find((m) => m.uid === this.engaged && m.alive && m.spawnAge >= 0.4) ?? null : null;
      if (mob) {
        this.startSwing(d.ranged ? (baseClass(c.cls) === 'mage' ? 'cast' : 'shoot') : 'attack', mob, d.atkInterval);
      } else {
        const wants = cmd ? cmd.k === 'node' : c.auto && c.activity.k === 'gather';
        const node = wants && inp.move === 0 ? this.nodes.find((n) => Math.abs(n.x - p.x) < 20 && Math.abs(n.y - p.y) < 6 && this.canUse(n)
          && (cmd?.k !== 'node' || cmd.uid === n.uid)) : null;
        if (node) this.startSwing(node.def.skill, node, GATHER_INTERVAL);
      }
    }
  }

  private startSwing(kind: SwingKind, target: Mob | NodeInst, interval: number) {
    const p = this.player;
    if (target.x !== p.x) p.facing = target.x > p.x ? 1 : -1;
    p.swingKind = kind; p.swingT = SWING_TIME; p.swingId++; p.attackT = interval;
    this.swingTarget = target; this.hitDone = false;
    // 채집하는 동안(다음 휘두름까지 조금 더)은 일반 몬스터가 건드리지 않는다
    this.gatherT = 'hp' in target ? 0 : interval + 0.4;
  }

  /** 사거리 안에서 가장 가까운 몬스터(키보드 조작용) */


  private applyHit(d: Derived) {
    const t = this.swingTarget, c = this.char;
    if (!t) return;
    if ('hp' in t) {
      if (!t.alive) return;
      if (d.ranged) this.fire(t, 1); else this.damageMob(t, d, 1, this.player.facing);
    } else {
      t.progress += d[t.def.skill]; t.shakeT = 0.3;
      while (t.progress >= t.def.hp) {
        t.progress -= t.def.hp;
        this.events.push({ t: 'yield', x: t.x, y: t.y - 30, item: t.def.item });
        this.spawnDrop(false, t.def.item, 1, t.x + this.player.facing * -8, t.y - 24, t.y);
        this.rollCard(t.def.id, t.def.name, NODE_CARD_CHANCE, d);
        const ups = gainSkillXp(c, t.def.skill, t.def.skill === 'fishing' ? Math.round(t.def.xp * d.fishXp) : t.def.xp);
        if (ups) this.events.push({ t: 'skill', name: SKILL_NAMES[t.def.skill], level: c.skills[t.def.skill].lv });
      }
    }
  }

  private stepShots(dt: number, d: Derived) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i], m = s.target;
      if (!m.alive) { this.shots.splice(i, 1); continue; }
      const dx = m.x - s.x, dy = m.y - 10 - s.y, dist = Math.hypot(dx, dy), stepLen = SHOT_SPEED * dt;
      if (dist <= Math.max(6, stepLen)) {
        this.shots.splice(i, 1);
        this.damageMob(m, d, s.mult, dx >= 0 ? 1 : -1);
        continue;
      }
      s.angle = Math.atan2(dy, dx);
      s.x += (dx / dist) * stepLen; s.y += (dy / dist) * stepLen;
    }
  }

  private kill(m: Mob, d: Derived) {
    const c = this.char;
    m.alive = false; m.respawnT = m.def.boss || this.arena || MINIBOSS_IDS.has(m.def.id) ? Infinity : this.rng.range(3.5, 5.5);
    if (this.arena) {
      // 콜로세움: 드롭·코인·카드 없이 경험치와 점수만(연속 처치로 배율이 오른다)
      const a = this.arena;
      a.kills++; a.score += m.def.xp * a.mult; a.mult = Math.min(5, a.mult + 0.1); a.comboT = 2.5;
      c.kills[this.map.id] = (c.kills[this.map.id] ?? 0) + 1;
      this.events.push({ t: 'kill', uid: m.uid, x: m.x, y: m.y });
      if (gainXp(c, Math.max(1, Math.round(m.def.xp * d.xpMult)))) this.events.push({ t: 'level', level: c.level });
      if (this.aiTarget === m) this.aiTarget = null;
      return;
    }
    if (MINIBOSS_IDS.has(m.def.id)) { this.acc.miniKills[m.def.id] = minibossKey(m.def.id, Date.now()); this.events.push({ t: 'miniboss', name: m.def.name }); }
    if (m.def.boss) {
      this.acc.bosses[m.def.id] = (this.acc.bosses[m.def.id] ?? 0) + 1;
      const bt = this.acc.bossTier?.[m.def.id] ?? 0;
      this.acc.bossBest ??= {}; this.acc.bossBest[m.def.id] = Math.max(this.acc.bossBest[m.def.id] ?? -1, bt);
      this.events.push({ t: 'boss', name: m.def.name });
    }
    // 멀티킬: 3월드에 간 계정은 처치 기록 단계만큼 한 번에 여러 마리로 센다(보스는 1)
    c.kills[this.map.id] = (c.kills[this.map.id] ?? 0) + (m.def.boss ? 1 : multiKill(this.acc, this.map.id));
    noteKill(c, m.def.id);
    this.events.push({ t: 'kill', uid: m.uid, x: m.x, y: m.y });
    if (gainXp(c, Math.max(1, Math.round(m.def.xp * d.xpMult)))) this.events.push({ t: 'level', level: c.level });
    this.spawnDrop(true, 'coin', Math.round(this.rng.int(m.def.coins[0], m.def.coins[1]) * d.coinMult), m.x, m.y - 10, m.y);
    // 공로 상점: 보스 열쇠·몬스터 재료 드롭 보너스
    const keyM = 1 + meritValue(this.acc, 'key'), matM = 1 + meritValue(this.acc, 'mats');
    for (const dr of m.def.drops) {
      const extra = dr.item.endsWith('_key') ? keyM : ITEMS[dr.item]?.kind === 'material' ? matM : 1;
      if (this.rng.chance(dr.chance * d.dropMult * extra)) this.spawnDrop(false, dr.item, this.rng.int(dr.qty[0], dr.qty[1]), m.x, m.y - 10, m.y);
    }
    this.rollCard(m.def.id, m.def.name, m.def.boss ? CARD_BOSS_CHANCE : CARD_CHANCE, d, !!m.def.boss);
    if (this.aiTarget === m) this.aiTarget = null;
  }

  /** 카드 굴리기: 아직 없는 카드는 더 잘 나온다(보스는 고정 확률) */
  private rollCard(id: string, name: string, base: number, d: Derived, fixed = false) {
    if (!CARD_BY_ID[id]) return;
    const owned = (this.acc.cards[id] ?? 0) > 0;
    if (!this.rng.chance(fixed ? base : base * (owned ? 1 : CARD_UNOWNED_MULT) * d.cardMult)) return;
    this.acc.cards[id] = (this.acc.cards[id] ?? 0) + 1;
    this.events.push({ t: 'loot', text: `★ ${name} 카드 획득!` });
  }

  private spawnDrop(coin: boolean, id: string, qty: number, x: number, y: number, floorY: number) {
    this.drops.push({ uid: this.uid++, coin, id, qty, x, y, vx: this.rng.range(-35, 35), vy: this.rng.range(-190, -130), floorY, age: 0 });
  }

  private stepMobs(dt: number, d: Derived) {
    const p = this.player, c = this.char;
    for (const m of this.mobs) {
      if (!m.alive) {
        m.respawnT -= dt;
        if (m.respawnT <= 0) {
          // 다시 나타날 때 드물게 수정 몬스터로 바뀐다(다음에 다시 나타날 때 원래대로)
          const base = m.base ?? m.def, cr = MONSTERS[crystalOf(base.id)];
          m.def = cr && !this.arena && this.rng.chance(CRYSTAL_CHANCE) ? cr : base;
          m.base = m.def === base ? undefined : base;
          if (m.base) this.events.push({ t: 'loot', text: `반짝! ${m.def.name}이(가) 나타났습니다!` });
          m.alive = true; m.hp = m.def.hp; m.spawnAge = 0; m.hitT = 0; this.placeMob(m);
        }
        continue;
      }
      m.spawnAge += dt; m.hitT = Math.max(0, m.hitT - dt); m.contactCd = Math.max(0, m.contactCd - dt);
      m.t -= dt;
      if (m.t <= 0) {
        m.moving = this.rng.chance(0.7); m.t = this.rng.range(1, 3.5);
        if (this.rng.chance(0.4)) m.dir = m.dir === 1 ? -1 : 1;
      }
      if (m.def.boss) this.stepBoss(m, dt, d);
      if (m.moving && m.hitT <= 0 && m.windup <= 0) {
        m.x += m.dir * m.def.speed * dt;
        const [lo, hi] = this.mobRange(m.plat);
        if (m.x < lo) { m.x = lo; m.dir = 1; } else if (m.x > hi) { m.x = hi; m.dir = -1; }
      }
      if (p.dead <= 0 && m.contactCd <= 0 && m.spawnAge > 0.8 && (this.gatherT <= 0 || m.def.boss)
        && Math.abs(m.x - p.x) < m.def.radius + 5 && Math.abs(m.y - p.y) < 14) {
        m.contactCd = 1.2;
        const amount = dmgTaken(m.def, d.def, this.rng.range(0.8, 1.2));
        if (amount <= 0) { this.events.push({ t: 'dmg', x: p.x, y: p.y - 34, amount: 0, crit: false, onPlayer: true }); continue; }
        c.hp -= amount; p.hurtT = HURT_TIME;
        this.events.push({ t: 'dmg', x: p.x, y: p.y - 40, amount, crit: false, onPlayer: true });
        if (c.hp <= 0) { c.hp = 0; p.dead = 3; p.swingT = 0; p.vx = 0; this.events.push({ t: 'faint' }); }
      }
    }
  }

  /** 보스: 플레이어 쪽으로 천천히 다가가다가 주기적으로 예고 후 내려찍는다 */
  private stepBoss(m: Mob, dt: number, d: Derived) {
    const p = this.player, b = m.def.boss!, c = this.char;
    m.moving = true; m.t = 1;
    if (p.dead <= 0 && Math.abs(p.x - m.x) > 6) m.dir = p.x > m.x ? 1 : -1;
    if (m.windup > 0) {
      m.windup -= dt;
      if (m.windup <= 0) {
        this.events.push({ t: 'slam', x: m.x, y: m.y, r: b.slamRadius });
        if (p.dead <= 0 && Math.abs(p.x - m.x) <= b.slamRadius && Math.abs(p.y - m.y) < 6) {
          const amount = dmgTaken({ atk: b.slamDmg, defZero: m.def.defZero }, d.def, this.rng.range(0.9, 1.1));
          if (amount > 0) {
            c.hp -= amount; p.hurtT = HURT_TIME;
            this.events.push({ t: 'dmg', x: p.x, y: p.y - 40, amount, crit: false, onPlayer: true });
            if (c.hp <= 0) { c.hp = 0; p.dead = 3; p.swingT = 0; p.vx = 0; this.events.push({ t: 'faint' }); }
          }
        }
      }
      return;
    }
    m.slamT -= dt;
    if (m.slamT <= 0 && p.dead <= 0) {
      m.slamT = b.slamEvery; m.windup = b.slamWindup;
      this.events.push({ t: 'telegraph', x: m.x, y: m.y, r: b.slamRadius, time: b.slamWindup });
    }
  }

  /** 떨어진 아이템: 바닥에 머물고, 터치·밀어서 주워야 들어온다(주운 것만 캐릭터에게 날아온다). 30분이 지나면 사라진다 */
  private stepDrops(dt: number) {
    const p = this.player, c = this.char;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const dr = this.drops[i];
      dr.age += dt;
      if (dr.age > DROP_LIFE && !dr.picked) { this.drops.splice(i, 1); continue; }
      // 자동 줍기(줍기 자석): 바닥에 닿은 뒤 저절로 날아온다
      if (!dr.picked && this.acc.autoLoot && dr.age > 0.8 && p.dead <= 0 && (dr.coin || itemRoom(c, dr.id) >= dr.qty)) dr.picked = true;
      if (dr.picked) {
        const dx = p.x - dr.x, dy = p.y - 14 - dr.y, dist = Math.hypot(dx, dy), sp = 220 + (dr.flyT = (dr.flyT ?? 0) + dt) * 400;
        if (dist < 9 || dist < sp * dt) {
          this.drops.splice(i, 1);
          if (dr.coin) { this.acc.coins += dr.qty; this.events.push({ t: 'loot', text: `+${dr.qty} 코인` }); }
          else if (addItem(c, dr.id, dr.qty)) this.events.push({ t: 'loot', text: `${ITEMS[dr.id].name} +${dr.qty}`, item: dr.id });
          else { dr.picked = false; dr.x = p.x; dr.y = p.y - 5; dr.floorY = p.y; dr.vy = 0; this.drops.push(dr); this.events.push({ t: 'loot', text: '가방이 가득 찼습니다!' }); }
          continue;
        }
        dr.x += (dx / dist) * sp * dt; dr.y += (dy / dist) * sp * dt;
      } else if (dr.y < dr.floorY - 5 || dr.vy < 0) {
        dr.vy += GRAVITY * 0.6 * dt; dr.x += dr.vx * dt; dr.y += dr.vy * dt;
        if (dr.y >= dr.floorY - 5 && dr.vy > 0) { dr.y = dr.floorY - 5; dr.vy = 0; }
        dr.x = clamp(dr.x, 6, this.map.width - 6);
      }
    }
    // 너무 많이 쌓이면 오래된 것부터 정리
    if (this.drops.length > MAX_DROPS) this.drops.splice(0, this.drops.length - MAX_DROPS);
  }

  /** (x, y) 근처에 떨어진 아이템이 있는가(가방이 차서 못 줍는 것도 포함) */
  dropNear(x: number, y: number, r = 16): boolean { return this.drops.some((dr) => !dr.picked && dr.age >= 0.3 && Math.hypot(dr.x - x, dr.y - y) <= r); }

  /** (x, y) 근처에 떨어진 아이템을 줍는다(캐릭터는 움직이지 않는다). 주운 개수 */
  pickAt(x: number, y: number, r = 16): number {
    if (this.player.dead > 0) return 0;
    let n = 0, full = false;
    for (const dr of this.drops) {
      if (dr.picked || dr.age < 0.3 || Math.hypot(dr.x - x, dr.y - y) > r) continue;
      if (!dr.coin && itemRoom(this.char, dr.id) < dr.qty) { full = true; continue; }
      dr.picked = true; n++;
    }
    if (full && !n) this.events.push({ t: 'loot', text: '가방이 가득 찼습니다!' });
    return n;
  }

  // ───────── 길 찾기 ─────────
  private platAt(x: number, y: number): number {
    let best = -1, bd = 1e9;
    this.platforms.forEach((q, i) => {
      if (q.y !== y) return;
      const dx = x < q.x ? q.x - x : x > q.x + q.w ? x - (q.x + q.w) : 0;
      if (dx < bd) { bd = dx; best = i; }
    });
    return best;
  }
  /** from 발판에서 to 발판으로 가기 위해 처음 타야 할 로프와 방향(너비 우선 탐색) */
  private route(from: number, to: number): { rope: number; dir: number } | null {
    const p = this.player;
    const first = new Map<number, { rope: number; dir: number }>();
    const queue = [from], seen = new Set([from]);
    while (queue.length) {
      const cur = queue.shift()!;
      if (cur === to) return first.get(cur) ?? null;
      const edges = this.ropes.map((r, i) => ({ r, i })).filter(({ r }) => r.a === cur || r.b === cur)
        .sort((u, v) => Math.abs(u.r.x - p.x) - Math.abs(v.r.x - p.x));
      for (const { r, i } of edges) {
        const next = r.a === cur ? r.b : r.a;
        if (seen.has(next)) continue;
        seen.add(next);
        first.set(next, first.get(cur) ?? { rope: i, dir: r.a === cur ? -1 : 1 });
        queue.push(next);
      }
    }
    return null;
  }

  /** (tx, ty) 지점까지 가는 입력을 만든다. 높이가 다르면 로프를 찾아 탄다. */
  private navigate(tx: number, ty: number, stop: number): Input {
    const p = this.player;
    const inp: Input = { move: 0, climb: 0 };
    if (p.rope >= 0) {
      // 타고 있는 로프는 목표 높이 쪽으로 끝까지
      const r = this.ropes[p.rope];
      inp.climb = this.climbDir || (ty <= r.top ? -1 : 1);
      return inp;
    }
    if (!p.onGround) return inp;
    const toward = (gx: number, s: number) => { if (Math.abs(gx - p.x) > s) inp.move = gx > p.x ? 1 : -1; };
    const cur = this.platAt(p.x, p.y), dst = this.platAt(tx, ty);
    if (cur === dst || cur < 0 || dst < 0) {
      toward(tx, stop);
      if (!inp.move && tx !== p.x && p.swingT <= 0) p.facing = tx > p.x ? 1 : -1;
      return inp;
    }
    const step = this.route(cur, dst);
    if (!step) return inp; // 갈 수 없는 곳
    const r = this.ropes[step.rope];
    if (Math.abs(r.x - p.x) > 2) toward(r.x, 2); else inp.climb = this.climbDir = step.dir;
    return inp;
  }
  private arrived(tx: number, ty: number, stop: number) {
    const p = this.player;
    return p.onGround && Math.abs(ty - p.y) <= 6 && Math.abs(tx - p.x) <= stop;
  }

  /** 터치 명령 수행 */
  private follow(d: Derived): Input {
    const cmd = this.command!;
    switch (cmd.k) {
      case 'move':
        if (this.arrived(cmd.x, cmd.y, 3)) { this.command = null; return IDLE; }
        return this.navigate(cmd.x, cmd.y, 3);
      case 'mob': {
        const m = this.mobs.find((x) => x.uid === cmd.uid);
        if (!m || !m.alive) { this.command = null; return IDLE; }
        return this.chase(m, d);
      }
      case 'node': {
        const n = this.nodes.find((x) => x.uid === cmd.uid);
        if (!n) { this.command = null; return IDLE; }
        return this.navigate(n.x, n.y, 10);
      }
      default: {
        const at = cmd.k === 'portal' ? this.map.portals[cmd.idx] : this.map.facilities[cmd.idx];
        const tx = at.x, ty = at.y ?? 0;
        const stop = INTERACT_STOP;
        if (this.arrived(tx, ty, stop)) {
          this.command = null;
          this.events.push({ t: 'arrive', what: cmd.k, idx: cmd.idx });
          return IDLE;
        }
        return this.navigate(tx, ty, stop);
      }
    }
  }

  // ───────── 자동 조작 ─────────
  private pickTarget(): Mob | NodeInst | null {
    const p = this.player, c = this.char;
    const cur = this.aiTarget;
    const act = c.activity;
    if (cur && ('hp' in cur ? cur.alive && act.k !== 'gather' : act.k === 'gather' && cur.def.id === act.node)) return cur;
    let best: Mob | NodeInst | null = null, bd = 1e9;
    const consider = (t: Mob | NodeInst) => {
      const s = Math.abs(t.x - p.x) + Math.abs(t.y - p.y) * 1.5;
      if (s < bd) { bd = s; best = t; }
    };
    if (act.k === 'gather') { for (const n of this.nodes) if (n.def.id === act.node && this.canUse(n)) consider(n); }
    else for (const m of this.mobs) if (m.alive) consider(m);
    return (this.aiTarget = best);
  }

  /** 몬스터 추적. 한 번 자리를 잡으면 대상이 사거리를 벗어날 때까지 멈춰서 싸운다(왔다 갔다 떨림 방지) */
  private chase(m: Mob, d: Derived): Input {
    const p = this.player;
    const near = d.ranged ? d.range * 0.8 : MELEE_NEAR, far = d.range;
    const dx = Math.abs(m.x - p.x), level = p.onGround && Math.abs(m.y - p.y) < 6;
    if (level && dx <= (this.engaged === m.uid ? far : near)) {
      this.engaged = m.uid;
      if (m.x !== p.x && p.swingT <= 0) p.facing = m.x > p.x ? 1 : -1;
      return IDLE;
    }
    if (p.swingT > 0) return IDLE;
    this.engaged = -1;
    return this.navigate(m.x, m.y, near);
  }

  private ai(d: Derived): Input {
    const t = this.pickTarget();
    if (!t) return IDLE;
    return 'hp' in t ? this.chase(t, d) : this.navigate(t.x, t.y, 10);
  }

  /** 현재 명령의 대상 위치(강조 화살표용). 단순 이동이면 null */
  commandTarget(): { x: number; y: number } | null {
    const cmd = this.command;
    if (!cmd || cmd.k === 'move') return null;
    if (cmd.k === 'mob') { const m = this.mobs.find((x) => x.uid === cmd.uid); return m ? { x: m.x, y: m.y - (m.def.motion === 'float' ? 38 : 28) } : null; }
    if (cmd.k === 'node') { const n = this.nodes.find((x) => x.uid === cmd.uid); return n ? { x: n.x, y: n.y - (n.def.skill === 'chopping' ? 74 : 44) } : null; }
    if (cmd.k === 'portal') { const q = this.map.portals[cmd.idx]; return { x: q.x, y: (q.y ?? 0) - 60 }; }
    const f = this.map.facilities[cmd.idx];
    return { x: f.x, y: f.y - (f.kind === 'npc' ? 50 : 44) };
  }
}
