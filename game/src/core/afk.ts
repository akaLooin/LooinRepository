// 방치(오프라인) 보상. 실시간 시뮬레이션을 돌리지 않고 "시간당 기대값"으로 계산한다.
// afkRates 는 방치 정보 창과 보상 계산이 함께 쓴다 → 화면에 보이는 숫자 그대로 지급된다.
// 멀티 전환 시 이 파일은 서버에서 실행되어 보상을 검증/지급한다.
import {
  AFK_MAX_SECONDS, AFK_MIN_SECONDS, CARD_BY_ID, NODE_CARD_CHANCE, CARD_CHANCE, CARD_UNOWNED_MULT, GatherSkill, ITEMS, MAPS, MONSTERS, NODES, SKILL_NAMES,
  SkillKey,
} from './data';
import { Rng } from './rng';
import { Account, Character, addItemSome, foodTotalHeal, anvilTick, derive, dmgTaken, gainSkillXp, gainXp, hitChance, noteKill } from './state';
import { GATHER_INTERVAL } from './world';

export interface AfkReport {
  seconds: number; mapName: string; mode: 'fight' | 'gather' | 'rest';
  kills: number; xp: number; coins: number; levels: number;
  skill?: { key: SkillKey; name: string; xp: number; levels: number };
  items: { id: string; name: string; qty: number }[];
  cards: { name: string; qty: number }[];
  /** 가방이 가득 차 잃은 개수 */
  /** 가방이 차서 줍지 않은 개수(버린 것이 아니라 애초에 줍지 않음) */
  skipped: number;
  /** 먹은 음식 */
  food: number;
  /** 모루에서 만든 것(칸별) */
  anvil?: { items: { item: string; made: number }[]; levels: number };
}

/** 시간당 기대값 */
export interface AfkRates {
  mode: 'fight' | 'gather' | 'rest';
  target: string;
  /** 방치 효율(0~1) */
  rate: number;
  killsPerHour: number;
  /** 몬스터 재생성 속도로 정해지는 시간당 처치 상한 */
  killCap: number;
  xpPerHour: number; coinsPerHour: number;
  /** 평균 명중률 */
  hit: number;
  /** 생존력(0~1): 살아서 싸우는 시간 비율 */
  survival: number;
  /** 받는 피해(초당)와 회복(초당) */
  dps: number; regen: number;
  foodPerHour: number;
  drops: { id: string; perHour: number }[];
  /** perHour: 이미 가진 카드 기준 시간당 기대 장수. 처음 한 장은 더 잘 나온다 */
  /** 시간당 카드 기대치(몬스터·자원) */
  cards: { id: string; name: string; perHour: number; owned: boolean }[];
  skill?: { key: GatherSkill; xpPerHour: number; item: string; perHour: number };
}

/** 기대값(소수)을 정수 개수로: 소수 부분은 확률로 처리 */
const settle = (expected: number, rng: Rng) => Math.floor(expected) + (rng.chance(expected % 1) ? 1 : 0);
const TRAVEL = 1.6;     // 몬스터 사이 이동 시간 근사(초)
const RESPAWN = 3;      // 쓰러진 뒤 부활까지(초)
const MOB_RESPAWN = 4.5 + 0.5; // 몬스터 재생성 평균(초) + 등장 연출

export function afkRates(acc: Account, c: Character): AfkRates {
  const map = MAPS[c.mapId];
  const d = derive(c, acc);
  const base: AfkRates = { mode: 'rest', target: '휴식', rate: 0, killsPerHour: 0, killCap: 0, xpPerHour: 0, coinsPerHour: 0, hit: 0,
    survival: 1, dps: 0, regen: d.regen, foodPerHour: 0, drops: [], cards: [] };

  // AUTO 여부와 무관: 마지막으로 지정한 대상을 기준으로 한다. 지정이 없으면 사냥터에서는 사냥.
  const act = c.activity;
  const node = act.k === 'gather' && map.nodes.some((n) => n.node === act.node)
    && c.skills[NODES[act.node].skill].lv >= NODES[act.node].reqLv ? NODES[act.node] : null;

  if (node) {
    const swings = Math.ceil(node.hp / d[node.skill]);
    const perHour = (3600 / (swings * GATHER_INTERVAL)) * d.afkSkill;
    const cards = CARD_BY_ID[node.id] ? [{ id: node.id, name: node.name, perHour: perHour * NODE_CARD_CHANCE * d.dropMult, owned: (acc.cards[node.id] ?? 0) > 0 }] : [];
    return { ...base, mode: 'gather', target: node.name, rate: d.afkSkill, cards,
      skill: { key: node.skill, xpPerHour: perHour * node.xp, item: node.item, perHour } };
  }
  if (!map.spawns.length) return base;

  const total = map.spawns.reduce((s, x) => s + x.count, 0);
  const avgHit = d.dmg * (1 + d.crit * (d.critMult - 1));
  // 스폰 비율로 가중한 평균 처치 시간과 받는 피해
  let killTime = 0, dps = 0, hitAvg = 0;
  for (const s of map.spawns) {
    const m = MONSTERS[s.monster], w = s.count / total;
    // 빗나가면 그만큼 휘두르는 횟수가 늘어난다. 전혀 못 맞히는 몬스터는 처치하지 못한다.
    const hit = hitChance(d.acc, m.acc);
    hitAvg += w * hit;
    killTime += w * (hit > 0 ? Math.ceil(m.hp / avgHit) / hit * d.atkInterval + (d.ranged ? TRAVEL * 0.5 : TRAVEL) : Infinity);
    dps += w * (dmgTaken(m, d.def) / 1.2) * 0.5;
  }
  // 음식: 피해가 회복을 넘으면 그 차이만큼 음식을 먹어 메운다
  // 음식: 칸들의 회복량을 위 칸부터 쓴다. 한 개 평균 회복량으로 개수를 어림한다
  const totalHeal = foodTotalHeal(c), totalQty = c.foods.reduce((n, f) => n + (f?.qty ?? 0), 0);
  const heal = totalQty ? totalHeal / totalQty : 0;
  const deficit = Math.max(0, dps - d.regen);
  const foodPerHour = heal > 0 ? (deficit * 3600) / heal : 0;
  let survival = 1;
  if (deficit > 0) {
    const fed = heal > 0 ? Math.min(1, totalHeal / (deficit * 3600)) : 0; // 1시간 기준 음식이 버티는 비율
    const alive = d.maxHp / deficit;
    const starved = alive / (alive + RESPAWN + TRAVEL);
    survival = fed + (1 - fed) * starved;
  }
  const killCap = map.spawns.reduce((s, x) => s + x.count, 0) * (3600 / MOB_RESPAWN);
  const raw = Number.isFinite(killTime) ? (3600 / killTime) * survival : 0;
  const kph = Math.min(killCap, raw) * d.afkFight;

  const r: AfkRates = { ...base, mode: 'fight', target: [...new Set(map.spawns.map((s) => MONSTERS[s.monster].name))].join(', '),
    rate: d.afkFight, killsPerHour: kph, killCap, hit: hitAvg, survival, dps, foodPerHour: Math.min(foodPerHour, totalQty) };
  for (const s of map.spawns) {
    const m = MONSTERS[s.monster], k = kph * (s.count / total);
    r.xpPerHour += k * m.xp * d.xpMult;
    r.coinsPerHour += k * (m.coins[0] + m.coins[1]) / 2 * d.coinMult;
    for (const dr of m.drops) {
      // 같은 아이템은 한 줄로 합친다
      const per = k * Math.min(1, dr.chance * d.dropMult) * (dr.qty[0] + dr.qty[1]) / 2;
      const ex = r.drops.find((x) => x.id === dr.item);
      if (ex) ex.perHour += per; else r.drops.push({ id: dr.item, perHour: per });
    }
    if (CARD_BY_ID[m.id] && !m.boss) r.cards.push({ id: m.id, name: m.name, perHour: k * CARD_CHANCE * d.dropMult, owned: (acc.cards[m.id] ?? 0) > 0 });
  }
  return r;
}

export function computeAfk(acc: Account, c: Character, now: number, rng: Rng): AfkReport | null {
  const elapsed = Math.min(AFK_MAX_SECONDS, Math.floor((now - c.lastActive) / 1000));
  if (elapsed < AFK_MIN_SECONDS) { c.lastActive = now; return null; }
  c.lastActive = now;
  const map = MAPS[c.mapId], hours = elapsed / 3600;
  const r = afkRates(acc, c);
  const rep: AfkReport = { seconds: elapsed, mapName: map.name, mode: r.mode, kills: 0, xp: 0, coins: 0, levels: 0, items: [], cards: [], skipped: 0, food: 0 };
  const give = (id: string, qty: number) => {
    if (qty <= 0) return;
    const got = addItemSome(c, id, qty);
    if (got) rep.items.push({ id, name: ITEMS[id].name, qty: got });
    rep.skipped += qty - got;
  };

  if (r.mode === 'fight') {
    rep.kills = Math.floor(r.killsPerHour * hours);
    const total = map.spawns.reduce((s, x) => s + x.count, 0);
    for (const s of map.spawns) noteKill(c, s.monster, Math.floor(rep.kills * (s.count / total)));
    c.kills[map.id] = (c.kills[map.id] ?? 0) + rep.kills;
    rep.xp = Math.floor(r.xpPerHour * hours);
    rep.coins = Math.floor(r.coinsPerHour * hours);
    acc.coins += rep.coins;
    // 같은 아이템이 여러 몬스터에서 나오면 합쳐서 지급
    const sum = new Map<string, number>();
    for (const dr of r.drops) sum.set(dr.id, (sum.get(dr.id) ?? 0) + dr.perHour * hours);
    for (const [id, n] of sum) give(id, settle(n, rng));
    if (r.foodPerHour > 0) {
      // 필요한 회복량만큼 위 칸부터 먹는다
      let need = Math.max(0, r.dps - r.regen) * 3600 * hours;
      for (let i = 0; i < c.foods.length && need > 0; i++) {
        const f = c.foods[i];
        if (!f) continue;
        const h = ITEMS[f.id].heal ?? 1, n = Math.min(f.qty, Math.ceil(need / h));
        f.qty -= n; rep.food += n; need -= n * h;
        if (f.qty <= 0) c.foods[i] = null;
      }
    }
    rep.levels = gainXp(c, rep.xp);
  } else if (r.mode === 'gather' && r.skill) {
    const yields = Math.floor(r.skill.perHour * hours);
    give(r.skill.item, yields);
    const sxp = Math.floor(r.skill.xpPerHour * hours);
    rep.skill = { key: r.skill.key, name: SKILL_NAMES[r.skill.key], xp: sxp, levels: gainSkillXp(c, r.skill.key, sxp) };
  }
  for (const cd of r.cards) {
    // 없는 카드는 첫 장까지만 확률이 높다: 첫 장이 나올 확률을 먼저 굴리고, 나머지는 기본 확률
    let n = 0, exp = cd.perHour * hours;
    if (!cd.owned) {
      const first = 1 - Math.exp(-exp * CARD_UNOWNED_MULT);
      if (rng.chance(first)) { n = 1; exp *= 0.5; } else exp = 0;
    }
    n += settle(exp, rng);
    if (n) { acc.cards[cd.id] = (acc.cards[cd.id] ?? 0) + n; rep.cards.push({ name: cd.name, qty: n }); }
  }
  // 모루 생산은 방치 효율과 무관하게 흐른 시간 그대로
  const a = anvilTick(c, elapsed);
  if (a.made) rep.anvil = { items: a.bySlot, levels: a.levels };
  const d = derive(c, acc);
  c.hp = d.maxHp; c.mp = d.maxMp;
  return rep;
}
