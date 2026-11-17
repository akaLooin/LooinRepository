// 현재 맵의 실시간 시뮬레이션(순수 로직). 렌더러는 이 상태를 읽어 그리기만 한다.
import {
  ITEMS, MAPS, MONSTERS, MapDef, MonsterDef, NODES, NodeDef, Platform, PortalDef, SKILL_NAMES, SMASH_RANGE, TALENT, healPct, smashMult,
} from './data';
import { Rng } from './rng';
import { Account, Character, Derived, addItem, derive, gainSkillXp, gainXp, mitigate, noteKill } from './state';

export interface Input { move: number; jump: boolean; down: boolean }
export type SwingKind = 'attack' | 'mining' | 'chopping';

export interface Player {
  x: number; y: number; vx: number; vy: number;
  onGround: boolean; facing: 1 | -1;
  attackT: number; swingT: number; swingKind: SwingKind; swingId: number;
  dead: number; dropT: number; hurtT: number;
  /** 액티브 스킬별 남은 재사용 대기시간 */
  cd: Record<string, number>;
}
export interface Mob {
  uid: number; def: MonsterDef; plat: Platform;
  x: number; y: number; dir: 1 | -1; hp: number;
  alive: boolean; t: number; moving: boolean;
  hitT: number; contactCd: number; respawnT: number; spawnAge: number;
}
export interface Drop {
  uid: number; coin: boolean; id: string; qty: number;
  x: number; y: number; vx: number; vy: number; floorY: number; age: number;
}
export interface NodeInst { uid: number; def: NodeDef; x: number; y: number; progress: number; shakeT: number }

export type WorldEvent =
  | { t: 'dmg'; x: number; y: number; amount: number; crit: boolean; onPlayer: boolean }
  | { t: 'kill'; uid: number; x: number; y: number }
  | { t: 'loot'; text: string; item?: string }
  | { t: 'level'; level: number }
  | { t: 'skill'; name: string; level: number }
  | { t: 'yield'; x: number; y: number; item: string }
  | { t: 'cast'; id: string; x: number; y: number }
  | { t: 'faint' };

export const SWING_TIME = 0.32;
export const GATHER_INTERVAL = 0.7;
const GRAVITY = 900, JUMP = 335, RANGE = 26, JUMP_REACH = 58;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export class World {
  readonly map: MapDef;
  readonly platforms: Platform[];
  readonly player: Player;
  readonly mobs: Mob[] = [];
  readonly drops: Drop[] = [];
  readonly nodes: NodeInst[] = [];
  events: WorldEvent[] = [];
  d: Derived;
  private uid = 1;
  private swingTarget: Mob | NodeInst | null = null;
  private hitDone = true;
  private aiTarget: Mob | NodeInst | null = null;
  private aiGoalX = 0;

  constructor(readonly acc: Account, readonly char: Character, readonly rng: Rng) {
    this.map = MAPS[char.mapId] ?? MAPS.town;
    char.mapId = this.map.id;
    this.platforms = [{ x: 0, y: 0, w: this.map.width }, ...this.map.platforms];
    this.d = derive(char);
    this.player = {
      x: clamp(char.x, 10, this.map.width - 10), y: 0, vx: 0, vy: 0, onGround: true, facing: 1,
      attackT: 0, swingT: 0, swingKind: 'attack', swingId: 0, dead: 0, dropT: 0, hurtT: 0, cd: {},
    };
    const totalW = this.platforms.reduce((s, p) => s + p.w, 0);
    for (const s of this.map.spawns) {
      for (let i = 0; i < s.count; i++) {
        // 발판 너비에 비례해 배치
        let r = rng.next() * totalW, plat = this.platforms[0];
        for (const p of this.platforms) { if (r < p.w) { plat = p; break; } r -= p.w; }
        const def = MONSTERS[s.monster];
        const m: Mob = {
          uid: this.uid++, def, plat, x: 0, y: plat.y, dir: rng.chance(0.5) ? 1 : -1, hp: def.hp,
          alive: true, t: rng.range(0, 3), moving: true, hitT: 0, contactCd: 0, respawnT: 0, spawnAge: 1,
        };
        this.placeMob(m);
        this.mobs.push(m);
      }
    }
    for (const n of this.map.nodes) {
      this.nodes.push({ uid: this.uid++, def: NODES[n.node], x: n.x, y: 0, progress: 0, shakeT: 0 });
    }
  }

  private placeMob(m: Mob) {
    const lo = m.plat.x + 12, hi = m.plat.x + m.plat.w - 12;
    for (let i = 0; i < 6; i++) {
      m.x = this.rng.range(lo, hi);
      // 포탈 근처와 플레이어 바로 위에는 스폰하지 않는다
      const nearPortal = m.plat.y === 0 && this.map.portals.some((p) => Math.abs(p.x - m.x) < 50);
      if (!nearPortal && Math.abs(m.x - this.player.x) > 40) break;
    }
  }

  /** 플레이어가 서 있는 포탈 */
  portalNear(): PortalDef | null {
    const p = this.player;
    if (p.dead > 0 || p.y < -4) return null;
    return this.map.portals.find((q) => Math.abs(q.x - p.x) < 16) ?? null;
  }
  portalOpen(q: PortalDef) { return (this.char.kills[this.map.id] ?? 0) >= (q.reqKills ?? 0); }
  nearNpc() { return this.map.npcX !== undefined && Math.abs(this.map.npcX - this.player.x) < 26 && this.player.y > -4; }

  /** 액티브 스킬 사용. 성공 여부 반환 */
  useSkill(id: string): boolean {
    const p = this.player, c = this.char, lv = c.talents[id] ?? 0, t = TALENT[id];
    if (!t?.active || lv <= 0 || p.dead > 0 || (p.cd[id] ?? 0) > 0) return false;
    const d = this.d;
    if (id === 'smash') {
      const hit = this.mobs.filter((m) => m.alive && m.spawnAge > 0.4 && Math.abs(m.x - p.x) <= SMASH_RANGE && Math.abs(m.y - p.y) < 22);
      if (!hit.length) return false;
      p.swingKind = 'attack'; p.swingT = SWING_TIME; p.swingId++; p.attackT = Math.max(p.attackT, d.atkInterval * 0.6);
      this.hitDone = true;
      for (const m of hit) this.damageMob(m, d, smashMult(lv), m.x >= p.x ? 1 : -1);
    } else if (id === 'heal') {
      if (c.hp >= d.maxHp) return false;
      c.hp = Math.min(d.maxHp, c.hp + d.maxHp * healPct(lv));
    }
    p.cd[id] = t.active.cooldown;
    this.events.push({ t: 'cast', id, x: p.x, y: p.y });
    return true;
  }

  private damageMob(m: Mob, d: Derived, mult: number, push: number) {
    const crit = this.rng.chance(d.crit);
    const amount = Math.max(1, Math.round(d.dmg * mult * this.rng.range(0.8, 1.2) * (crit ? d.critMult : 1)));
    m.hp -= amount; m.hitT = 0.22;
    m.x = clamp(m.x + push * 5, m.plat.x + 8, m.plat.x + m.plat.w - 8);
    this.events.push({ t: 'dmg', x: m.x, y: m.y - 18, amount, crit, onPlayer: false });
    if (m.hp <= 0) this.kill(m, d);
  }

  nearCraft() { return this.map.craftX !== undefined && Math.abs(this.map.craftX - this.player.x) < 26 && this.player.y > -4; }

  step(dt: number, manual: Input) {
    dt = Math.min(dt, 0.05);
    const p = this.player, c = this.char;
    const d = (this.d = derive(c));
    c.x = p.x;

    for (const n of this.nodes) n.shakeT = Math.max(0, n.shakeT - dt);
    this.stepMobs(dt, d);
    this.stepDrops(dt);

    if (p.dead > 0) {
      p.dead -= dt;
      if (p.dead <= 0) { p.x = this.map.portals[0]?.x ?? 60; p.y = 0; p.vy = 0; p.onGround = true; c.hp = d.maxHp; }
      return;
    }
    c.hp = Math.min(d.maxHp, c.hp + d.regen * dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
    if (c.auto) {
      // 자동 조작 중에는 스킬도 알아서 쓴다
      if (c.hp < d.maxHp * 0.5) this.useSkill('heal');
      if (c.mode === 'fight') this.useSkill('smash');
    }

    const inp = c.auto ? this.ai() : manual;

    // 이동
    p.vx = inp.move * d.speed;
    if (inp.move) p.facing = inp.move > 0 ? 1 : -1;
    if (inp.jump && p.onGround) { p.vy = -JUMP; p.onGround = false; }
    if (inp.down && p.onGround && p.y < 0) { p.dropT = 0.25; p.onGround = false; }
    p.dropT = Math.max(0, p.dropT - dt);
    p.x = clamp(p.x + p.vx * dt, 10, this.map.width - 10);
    if (p.onGround) {
      const under = this.platforms.some((q) => q.y === p.y && p.x >= q.x && p.x <= q.x + q.w);
      if (!under) p.onGround = false;
    }
    if (!p.onGround) {
      const prevY = p.y;
      p.vy += GRAVITY * dt;
      p.y += p.vy * dt;
      if (p.vy > 0) {
        for (const q of this.platforms) {
          if (q.y !== 0 && p.dropT > 0) continue;
          if (prevY <= q.y && p.y >= q.y && p.x >= q.x && p.x <= q.x + q.w) {
            p.y = q.y; p.vy = 0; p.onGround = true; break;
          }
        }
      }
    }

    // 공격 / 채집
    p.attackT -= dt;
    if (p.swingT > 0) {
      p.swingT -= dt;
      if (!this.hitDone && p.swingT <= SWING_TIME * 0.55) { this.hitDone = true; this.applyHit(d); }
    }
    if (p.attackT <= 0 && p.swingT <= 0) {
      const mob = this.mobInRange();
      if (mob) {
        this.startSwing('attack', mob, d.atkInterval);
      } else {
        const node = this.nodes.find((n) => Math.abs(n.x - p.x) < 20 && Math.abs(n.y - p.y) < 6 && c.skills[n.def.skill].lv >= n.def.reqLv);
        const wants = c.auto ? c.mode === 'gather' : inp.move === 0 && p.onGround;
        if (node && wants) this.startSwing(node.def.skill, node, GATHER_INTERVAL);
      }
    }
  }

  private startSwing(kind: SwingKind, target: Mob | NodeInst, interval: number) {
    const p = this.player;
    if (target.x !== p.x) p.facing = target.x > p.x ? 1 : -1;
    p.swingKind = kind; p.swingT = SWING_TIME; p.swingId++; p.attackT = interval;
    this.swingTarget = target; this.hitDone = false;
  }

  private mobInRange(): Mob | null {
    const p = this.player;
    let best: Mob | null = null, bd = 1e9;
    for (const m of this.mobs) {
      if (!m.alive || m.spawnAge < 0.4) continue;
      const dx = Math.abs(m.x - p.x);
      if (dx <= RANGE + m.def.radius * 0.5 && Math.abs(m.y - p.y) < 18 && dx < bd) { best = m; bd = dx; }
    }
    return best;
  }

  private applyHit(d: Derived) {
    const t = this.swingTarget, c = this.char;
    if (!t) return;
    if ('hp' in t) {
      if (!t.alive) return;
      this.damageMob(t, d, 1, this.player.facing);
    } else {
      t.progress += d[t.def.skill]; t.shakeT = 0.3;
      while (t.progress >= t.def.hp) {
        t.progress -= t.def.hp;
        this.events.push({ t: 'yield', x: t.x, y: t.y - 30, item: t.def.item });
        this.spawnDrop(false, t.def.item, 1, t.x + this.player.facing * -8, t.y - 24, t.y);
        const ups = gainSkillXp(c, t.def.skill, t.def.xp);
        if (ups) this.events.push({ t: 'skill', name: SKILL_NAMES[t.def.skill], level: c.skills[t.def.skill].lv });
      }
    }
  }

  private kill(m: Mob, d: Derived) {
    const c = this.char;
    m.alive = false; m.respawnT = this.rng.range(3.5, 5.5);
    c.kills[this.map.id] = (c.kills[this.map.id] ?? 0) + 1;
    noteKill(c, m.def.id);
    this.events.push({ t: 'kill', uid: m.uid, x: m.x, y: m.y });
    if (gainXp(c, Math.max(1, Math.round(m.def.xp * d.xpMult)))) this.events.push({ t: 'level', level: c.level });
    this.spawnDrop(true, 'coin', this.rng.int(m.def.coins[0], m.def.coins[1]), m.x, m.y - 10, m.y);
    for (const dr of m.def.drops) {
      if (this.rng.chance(dr.chance * d.dropMult)) this.spawnDrop(false, dr.item, this.rng.int(dr.qty[0], dr.qty[1]), m.x, m.y - 10, m.y);
    }
    if (this.aiTarget === m) this.aiTarget = null;
  }

  private spawnDrop(coin: boolean, id: string, qty: number, x: number, y: number, floorY: number) {
    this.drops.push({ uid: this.uid++, coin, id, qty, x, y, vx: this.rng.range(-35, 35), vy: this.rng.range(-190, -130), floorY, age: 0 });
  }

  private stepMobs(dt: number, d: Derived) {
    const p = this.player, c = this.char;
    for (const m of this.mobs) {
      if (!m.alive) {
        m.respawnT -= dt;
        if (m.respawnT <= 0) { m.alive = true; m.hp = m.def.hp; m.spawnAge = 0; m.hitT = 0; this.placeMob(m); }
        continue;
      }
      m.spawnAge += dt; m.hitT = Math.max(0, m.hitT - dt); m.contactCd = Math.max(0, m.contactCd - dt);
      m.t -= dt;
      if (m.t <= 0) {
        m.moving = this.rng.chance(0.7); m.t = this.rng.range(1, 3.5);
        if (this.rng.chance(0.4)) m.dir = m.dir === 1 ? -1 : 1;
      }
      if (m.moving && m.hitT <= 0) {
        m.x += m.dir * m.def.speed * dt;
        const lo = m.plat.x + 8, hi = m.plat.x + m.plat.w - 8;
        if (m.x < lo) { m.x = lo; m.dir = 1; } else if (m.x > hi) { m.x = hi; m.dir = -1; }
      }
      if (p.dead <= 0 && m.contactCd <= 0 && m.spawnAge > 0.8
        && Math.abs(m.x - p.x) < m.def.radius + 5 && Math.abs(m.y - p.y) < 14) {
        m.contactCd = 1.2;
        const amount = mitigate(m.def.atk * this.rng.range(0.8, 1.2), d.def);
        c.hp -= amount; p.hurtT = 0.25;
        this.events.push({ t: 'dmg', x: p.x, y: p.y - 34, amount, crit: false, onPlayer: true });
        if (c.hp <= 0) { c.hp = 0; p.dead = 3; p.swingT = 0; p.vx = 0; this.events.push({ t: 'faint' }); }
      }
    }
  }

  private stepDrops(dt: number) {
    const p = this.player, c = this.char;
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const dr = this.drops[i];
      dr.age += dt;
      const dx = p.x - dr.x, dy = p.y - 14 - dr.y, dist = Math.hypot(dx, dy);
      if (p.dead <= 0 && dr.age > 0.55 && (dist < 60 || dr.age > 1.3)) {
        // 플레이어에게 빨려 들어온다
        const sp = 140 + dr.age * 260;
        if (dist < 9 || dist < sp * dt) {
          this.drops.splice(i, 1);
          if (dr.coin) { this.acc.coins += dr.qty; this.events.push({ t: 'loot', text: `+${dr.qty} 코인` }); }
          else if (addItem(c, dr.id, dr.qty)) this.events.push({ t: 'loot', text: `${ITEMS[dr.id].name} +${dr.qty}`, item: dr.id });
          else this.events.push({ t: 'loot', text: '가방이 가득 찼습니다!' });
          continue;
        }
        dr.x += (dx / dist) * sp * dt; dr.y += (dy / dist) * sp * dt;
      } else if (dr.y < dr.floorY - 5 || dr.vy < 0) {
        dr.vy += GRAVITY * 0.6 * dt; dr.x += dr.vx * dt; dr.y += dr.vy * dt;
        if (dr.y >= dr.floorY - 5 && dr.vy > 0) { dr.y = dr.floorY - 5; dr.vy = 0; }
        dr.x = clamp(dr.x, 6, this.map.width - 6);
      }
      if (dr.age > 30) this.drops.splice(i, 1);
    }
  }

  // ───────── 자동 조작 ─────────
  private pickTarget(): Mob | NodeInst | null {
    const p = this.player, c = this.char;
    const cur = this.aiTarget;
    if (cur && ('hp' in cur ? cur.alive && c.mode === 'fight' : c.mode === 'gather')) return cur;
    let best: Mob | NodeInst | null = null, bd = 1e9;
    const consider = (t: Mob | NodeInst) => {
      const s = Math.abs(t.x - p.x) + Math.abs(t.y - p.y) * 1.5;
      if (s < bd) { bd = s; best = t; }
    };
    if (c.mode === 'fight') { for (const m of this.mobs) if (m.alive) consider(m); }
    else for (const n of this.nodes) if (c.skills[n.def.skill].lv >= n.def.reqLv) consider(n);
    return (this.aiTarget = best);
  }

  private ai(): Input {
    const p = this.player;
    const inp: Input = { move: 0, jump: false, down: false };
    const t = this.pickTarget();
    if (!t) return inp;
    const dx = t.x - p.x, dy = t.y - p.y;
    const toward = (gx: number, stop: number) => { if (Math.abs(gx - p.x) > stop) inp.move = gx > p.x ? 1 : -1; };
    if (dy < -6) {
      if (!p.onGround) { toward(this.aiGoalX, 3); return inp; }
      // 한 번의 점프로 닿는 발판 중 목표에 가장 가까운 것을 디딘다
      let plat: Platform | null = null, bd = 1e9;
      for (const q of this.platforms) {
        if (q.y >= p.y - 6 || q.y < p.y - JUMP_REACH) continue;
        const gx = clamp(t.x, q.x + 8, q.x + q.w - 8);
        const s = Math.abs(gx - t.x) + Math.abs(q.y - t.y) + Math.abs(gx - p.x) * 0.1;
        if (s < bd) { bd = s; plat = q; }
      }
      if (!plat) { toward(t.x, 4); return inp; }
      this.aiGoalX = clamp(t.x, plat.x + 8, plat.x + plat.w - 8);
      if (Math.abs(this.aiGoalX - p.x) > 4) toward(this.aiGoalX, 4); else inp.jump = true;
    } else if (dy > 6) {
      if (p.onGround) inp.down = true; else toward(t.x, 6);
    } else {
      toward(t.x, 'hp' in t ? RANGE * 0.6 : 10);
      if (!inp.move && dx) p.facing = dx > 0 ? 1 : -1;
    }
    return inp;
  }
}
