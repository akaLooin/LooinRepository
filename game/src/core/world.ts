// 현재 맵의 실시간 시뮬레이션(순수 로직). 렌더러는 이 상태를 읽어 그리기만 한다.
import {
  CARDS, CARD_CHANCE, CLEAVE_RANGE, ITEMS, MAPS, MONSTERS, MapDef, MonsterDef, NODES, NOVA_RADIUS, NodeDef, Platform, PortalDef,
  SKILL_NAMES, SMASH_RANGE, TALENT, TALENTS, healPct, smashMult,
} from './data';
import { Rng } from './rng';
import { Account, Character, Derived, addItem, derive, gainSkillXp, gainXp, mitigate, noteKill } from './state';

export interface Input { move: number; jump: boolean; down: boolean }
export type SwingKind = 'attack' | 'shoot' | 'cast' | 'mining' | 'chopping';

/** 터치로 내린 명령. 도착하거나 끝나면 사라진다. */
export type Command =
  | { k: 'move'; x: number; y: number }
  | { k: 'mob'; uid: number }
  | { k: 'node'; uid: number }
  | { k: 'portal'; idx: number }
  | { k: 'npc' } | { k: 'craft' };

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
export interface Shot { uid: number; kind: 'arrow' | 'orb'; x: number; y: number; target: Mob; mult: number; angle: number }

export type WorldEvent =
  | { t: 'dmg'; x: number; y: number; amount: number; crit: boolean; onPlayer: boolean }
  | { t: 'kill'; uid: number; x: number; y: number }
  | { t: 'loot'; text: string; item?: string }
  | { t: 'level'; level: number }
  | { t: 'skill'; name: string; level: number }
  | { t: 'yield'; x: number; y: number; item: string }
  | { t: 'cast'; id: string; x: number; y: number }
  | { t: 'arrive'; what: 'portal' | 'npc' | 'craft'; idx: number }
  | { t: 'faint' };

export const SWING_TIME = 0.32;
export const GATHER_INTERVAL = 0.7;
const GRAVITY = 900, JUMP = 335, JUMP_REACH = 58, SHOT_SPEED = 330;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const IDLE: Input = { move: 0, jump: false, down: false };

export class World {
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
  private aiGoalX = 0;

  constructor(readonly acc: Account, readonly char: Character, readonly rng: Rng) {
    this.map = MAPS[char.mapId] ?? MAPS.town;
    char.mapId = this.map.id;
    this.platforms = [{ x: 0, y: 0, w: this.map.width }, ...this.map.platforms];
    this.d = derive(char, acc.cards);
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

  portalOpen(q: PortalDef) { return (this.char.kills[this.map.id] ?? 0) >= (q.reqKills ?? 0); }
  private canUse(n: NodeInst) { return this.char.skills[n.def.skill].lv >= n.def.reqLv; }

  /** 화면을 터치한 월드 좌표를 명령으로 바꾼다. 대상이 있으면 그 대상, 없으면 그 지점으로 이동 */
  tap(x: number, y: number): Command | null {
    const p = this.player, c = this.char, map = this.map;
    if (p.dead > 0) return null;
    const near = (tx: number, w: number, top: number) => Math.abs(tx - x) <= w && y >= top && y <= 8;
    let cmd: Command | null = null;
    const mob = this.mobs.filter((m) => m.alive && Math.abs(m.x - x) <= 15 && y >= m.y - 30 && y <= m.y + 8)
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
    const node = this.nodes.find((n) => near(n.x, 18, -62));
    const portal = map.portals.findIndex((q) => near(q.x, 16, -48));
    if (mob) { cmd = { k: 'mob', uid: mob.uid }; c.mode = 'fight'; }
    else if (portal >= 0) cmd = { k: 'portal', idx: portal };
    else if (map.npcX !== undefined && near(map.npcX, 14, -36)) cmd = { k: 'npc' };
    else if (map.craftX !== undefined && near(map.craftX, 20, -28)) cmd = { k: 'craft' };
    else if (node) {
      if (!this.canUse(node)) { this.events.push({ t: 'loot', text: `${SKILL_NAMES[node.def.skill]} Lv.${node.def.reqLv} 필요` }); return null; }
      cmd = { k: 'node', uid: node.uid }; c.mode = 'gather';
    } else {
      // 터치 지점 바로 아래의 발판 위로
      let py = 0, best = 1e9;
      for (const q of this.platforms) {
        if (x < q.x || x > q.x + q.w) continue;
        const gap = q.y - y;
        if (gap >= -14 && gap < best) { best = gap; py = q.y; }
      }
      cmd = { k: 'move', x: clamp(x, 10, map.width - 10), y: py };
    }
    this.aiTarget = null;
    return (this.command = cmd);
  }

  /** 액티브 스킬 사용. 성공 여부 반환 */
  useSkill(id: string): boolean {
    const p = this.player, c = this.char, lv = c.talents[id] ?? 0, t = TALENT[id];
    if (!t?.active || lv <= 0 || p.dead > 0 || (p.cd[id] ?? 0) > 0) return false;
    const d = this.d;
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
    } else if (id === 'heal') {
      if (c.hp >= d.maxHp) return false;
      c.hp = Math.min(d.maxHp, c.hp + d.maxHp * healPct(lv));
    }
    p.cd[id] = t.active.cooldown;
    this.events.push({ t: 'cast', id, x: fx, y: fy });
    return true;
  }

  private fire(target: Mob, mult: number) {
    const p = this.player;
    this.shots.push({ uid: this.uid++, kind: this.char.cls === 'mage' ? 'orb' : 'arrow', x: p.x + p.facing * 8, y: p.y - 15, target, mult, angle: p.facing > 0 ? 0 : Math.PI });
  }

  private damageMob(m: Mob, d: Derived, mult: number, push: number) {
    if (!m.alive) return;
    const crit = this.rng.chance(d.crit);
    const amount = Math.max(1, Math.round(d.dmg * mult * this.rng.range(0.8, 1.2) * (crit ? d.critMult : 1)));
    m.hp -= amount; m.hitT = 0.22;
    m.x = clamp(m.x + push * 5, m.plat.x + 8, m.plat.x + m.plat.w - 8);
    this.events.push({ t: 'dmg', x: m.x, y: m.y - 18, amount, crit, onPlayer: false });
    if (m.hp <= 0) this.kill(m, d);
  }

  step(dt: number, manual: Input) {
    dt = Math.min(dt, 0.05);
    const p = this.player, c = this.char;
    const d = (this.d = derive(c, this.acc.cards));
    c.x = p.x;

    for (const n of this.nodes) n.shakeT = Math.max(0, n.shakeT - dt);
    this.stepMobs(dt, d);
    this.stepDrops(dt);
    this.stepShots(dt, d);

    if (p.dead > 0) {
      p.dead -= dt; this.command = null;
      if (p.dead <= 0) { p.x = this.map.portals[0]?.x ?? 60; p.y = 0; p.vy = 0; p.onGround = true; c.hp = d.maxHp; }
      return;
    }
    c.hp = Math.min(d.maxHp, c.hp + d.regen * dt);
    p.hurtT = Math.max(0, p.hurtT - dt);
    for (const k in p.cd) p.cd[k] = Math.max(0, p.cd[k] - dt);
    if (c.auto) {
      // 자동 조작 중에는 스킬도 알아서 쓴다
      for (const t of TALENTS) {
        if (!t.active || !c.talents[t.id]) continue;
        if (t.id === 'heal') { if (c.hp < d.maxHp * 0.5) this.useSkill('heal'); }
        else if (c.mode === 'fight') this.useSkill(t.id);
      }
    }

    // 조작 우선순위: 키보드 > 터치 명령 > AUTO
    const keyed = manual.move !== 0 || manual.jump || manual.down;
    if (keyed) this.command = null;
    const inp = keyed ? manual : this.command ? this.follow(d) : c.auto ? this.ai(d) : IDLE;

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
      const cmd = this.command;
      // 이동 명령 중에는 멈춰서 싸우지 않는다(원거리 직업이 걸음을 못 떼는 것 방지)
      const mob = cmd && cmd.k !== 'mob' ? null : this.mobInRange(d, cmd?.k === 'mob' ? cmd.uid : undefined);
      if (mob && (d.ranged ? p.onGround && inp.move === 0 : true)) {
        this.startSwing(d.ranged ? (c.cls === 'mage' ? 'cast' : 'shoot') : 'attack', mob, d.atkInterval);
      } else {
        const wants = cmd ? cmd.k === 'node' : c.auto && c.mode === 'gather';
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
  }

  /** 사거리 안의 몬스터. prefer가 있으면 그 개체를 우선한다 */
  private mobInRange(d: Derived, prefer?: number): Mob | null {
    const p = this.player;
    let best: Mob | null = null, bd = 1e9;
    for (const m of this.mobs) {
      if (!m.alive || m.spawnAge < 0.4) continue;
      const dx = Math.abs(m.x - p.x);
      if (dx > d.range + m.def.radius * 0.5 || Math.abs(m.y - p.y) >= 18) continue;
      if (m.uid === prefer) return m;
      if (dx < bd) { best = m; bd = dx; }
    }
    return best;
  }

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
        const ups = gainSkillXp(c, t.def.skill, t.def.xp);
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
    m.alive = false; m.respawnT = this.rng.range(3.5, 5.5);
    c.kills[this.map.id] = (c.kills[this.map.id] ?? 0) + 1;
    noteKill(c, m.def.id);
    this.events.push({ t: 'kill', uid: m.uid, x: m.x, y: m.y });
    if (gainXp(c, Math.max(1, Math.round(m.def.xp * d.xpMult)))) this.events.push({ t: 'level', level: c.level });
    this.spawnDrop(true, 'coin', this.rng.int(m.def.coins[0], m.def.coins[1]), m.x, m.y - 10, m.y);
    for (const dr of m.def.drops) {
      if (this.rng.chance(dr.chance * d.dropMult)) this.spawnDrop(false, dr.item, this.rng.int(dr.qty[0], dr.qty[1]), m.x, m.y - 10, m.y);
    }
    if (CARDS.some((cd) => cd.monster === m.def.id) && this.rng.chance(CARD_CHANCE * d.dropMult)) {
      this.acc.cards[m.def.id] = (this.acc.cards[m.def.id] ?? 0) + 1;
      this.events.push({ t: 'loot', text: `★ ${m.def.name} 카드 획득!` });
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

  // ───────── 길 찾기 ─────────
  /** (tx, ty) 지점까지 가는 입력을 만든다. stop 이내면 멈춘다. 도착 여부는 arrived로 확인 */
  private navigate(tx: number, ty: number, stop: number): Input {
    const p = this.player;
    const inp: Input = { move: 0, jump: false, down: false };
    const dy = ty - p.y;
    const toward = (gx: number, s: number) => { if (Math.abs(gx - p.x) > s) inp.move = gx > p.x ? 1 : -1; };
    if (dy < -6) {
      if (!p.onGround) { toward(this.aiGoalX, 3); return inp; }
      // 한 번의 점프로 닿는 발판 중 목표에 가장 가까운 것을 디딘다
      let plat: Platform | null = null, bd = 1e9;
      for (const q of this.platforms) {
        if (q.y >= p.y - 6 || q.y < p.y - JUMP_REACH) continue;
        const gx = clamp(tx, q.x + 8, q.x + q.w - 8);
        const s = Math.abs(gx - tx) + Math.abs(q.y - ty) + Math.abs(gx - p.x) * 0.1;
        if (s < bd) { bd = s; plat = q; }
      }
      if (!plat) { toward(tx, 4); return inp; }
      this.aiGoalX = clamp(tx, plat.x + 8, plat.x + plat.w - 8);
      if (Math.abs(this.aiGoalX - p.x) > 4) toward(this.aiGoalX, 4); else inp.jump = true;
    } else if (dy > 6) {
      if (p.onGround) inp.down = true; else toward(tx, 6);
    } else {
      toward(tx, stop);
      if (!inp.move && tx !== p.x && p.swingT <= 0) p.facing = tx > p.x ? 1 : -1;
    }
    return inp;
  }
  private arrived(tx: number, ty: number, stop: number) {
    const p = this.player;
    return p.onGround && Math.abs(ty - p.y) <= 6 && Math.abs(tx - p.x) <= stop;
  }

  /** 터치 명령 수행 */
  private follow(d: Derived): Input {
    const cmd = this.command!;
    const fightStop = d.ranged ? d.range * 0.85 : d.range * 0.6;
    switch (cmd.k) {
      case 'move':
        if (this.arrived(cmd.x, cmd.y, 3)) { this.command = null; return IDLE; }
        return this.navigate(cmd.x, cmd.y, 3);
      case 'mob': {
        const m = this.mobs.find((x) => x.uid === cmd.uid);
        if (!m || !m.alive) { this.command = null; return IDLE; }
        return this.navigate(m.x, m.y, fightStop);
      }
      case 'node': {
        const n = this.nodes.find((x) => x.uid === cmd.uid);
        if (!n) { this.command = null; return IDLE; }
        return this.navigate(n.x, n.y, 10);
      }
      default: {
        const tx = cmd.k === 'portal' ? this.map.portals[cmd.idx].x : cmd.k === 'npc' ? this.map.npcX! : this.map.craftX!;
        const stop = cmd.k === 'portal' ? 6 : 16;
        if (this.arrived(tx, 0, stop)) {
          this.command = null;
          this.events.push({ t: 'arrive', what: cmd.k, idx: cmd.k === 'portal' ? cmd.idx : 0 });
          return IDLE;
        }
        return this.navigate(tx, 0, stop);
      }
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
    else for (const n of this.nodes) if (this.canUse(n)) consider(n);
    return (this.aiTarget = best);
  }

  private ai(d: Derived): Input {
    const t = this.pickTarget();
    if (!t) return IDLE;
    return this.navigate(t.x, t.y, 'hp' in t ? (d.ranged ? d.range * 0.85 : d.range * 0.6) : 10);
  }
}
