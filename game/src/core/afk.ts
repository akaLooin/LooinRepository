// 방치(오프라인) 보상 계산. 실시간 시뮬레이션을 돌리지 않고 기대값으로 계산한다.
// 멀티 전환 시 이 함수는 서버에서 실행되어 보상을 검증/지급한다.
import {
  AFK_EFFICIENCY, AFK_MAX_SECONDS, AFK_MIN_SECONDS, CARDS, CARD_CHANCE, ITEMS, MAPS, MONSTERS, NODES, SKILL_NAMES, SkillKey,
} from './data';
import { Rng } from './rng';
import { Account, Character, addItem, derive, dmgTaken, gainSkillXp, gainXp, hitChance, noteKill } from './state';

export interface AfkReport {
  seconds: number; mapName: string; mode: 'fight' | 'gather' | 'rest';
  kills: number; xp: number; coins: number; levels: number;
  skill?: { key: SkillKey; name: string; xp: number; levels: number };
  items: { id: string; name: string; qty: number }[];
  cards: { name: string; qty: number }[];
  lost: number;
}

/** 기대값(소수)을 정수 개수로: 소수 부분은 확률로 처리 */
const settle = (expected: number, rng: Rng) => Math.floor(expected) + (rng.chance(expected % 1) ? 1 : 0);

const SWING = 0.7;      // 채집 1회 간격(초) — world.ts와 동일
const TRAVEL = 1.6;     // 몬스터 사이 이동 시간 근사(초)
const RESPAWN = 3;

export function computeAfk(acc: Account, c: Character, now: number, rng: Rng): AfkReport | null {
  const elapsed = Math.min(AFK_MAX_SECONDS, Math.floor((now - c.lastActive) / 1000));
  c.lastActive = now;
  if (elapsed < AFK_MIN_SECONDS) return null;

  const map = MAPS[c.mapId];
  const d = derive(c, acc.cards);
  const rep: AfkReport = { seconds: elapsed, mapName: map.name, mode: 'rest', kills: 0, xp: 0, coins: 0, levels: 0, items: [], cards: [], lost: 0 };
  const give = (id: string, qty: number) => {
    if (qty <= 0) return;
    if (addItem(c, id, qty)) rep.items.push({ id, name: ITEMS[id].name, qty });
    else rep.lost += qty;
  };
  const time = elapsed * AFK_EFFICIENCY;

  // AUTO 여부와 무관: 마지막으로 지정한 대상을 기준으로 한다. 지정이 없으면 사냥터에서는 사냥.
  const act = c.activity;
  const gatherNode = act.k === 'gather' && map.nodes.some((n) => n.node === act.node)
    && c.skills[NODES[act.node].skill].lv >= NODES[act.node].reqLv ? NODES[act.node] : null;
  if (!gatherNode && map.spawns.length) {
    rep.mode = 'fight';
    const total = map.spawns.reduce((s, x) => s + x.count, 0);
    const avgHit = d.dmg * (1 + d.crit * (d.critMult - 1));
    // 스폰 비율로 가중한 평균 처치 시간과 받는 피해
    let killTime = 0, dps = 0;
    for (const s of map.spawns) {
      const m = MONSTERS[s.monster], w = s.count / total;
      // 빗나가면 그만큼 휘두르는 횟수가 늘어난다. 전혀 못 맞히는 몬스터는 처치하지 못한다.
      const hit = hitChance(d.acc, m.acc);
      killTime += w * (hit > 0 ? Math.ceil(m.hp / avgHit) / hit * d.atkInterval + (d.ranged ? TRAVEL * 0.5 : TRAVEL) : Infinity);
      dps += w * (dmgTaken(m, d.def) / 1.2) * 0.5;
    }
    let uptime = 1;
    if (dps > d.regen) {
      const alive = d.maxHp / (dps - d.regen);
      uptime = alive / (alive + RESPAWN + TRAVEL);
    }
    const kills = Number.isFinite(killTime) ? Math.floor((time * uptime) / killTime) : 0;
    rep.kills = kills;
    let xp = 0, coins = 0;
    for (const s of map.spawns) {
      const m = MONSTERS[s.monster], k = kills * (s.count / total);
      xp += k * m.xp;
      noteKill(c, m.id, Math.floor(k));
      if (CARDS.some((cd) => cd.monster === m.id)) {
        const n = settle(k * CARD_CHANCE * d.dropMult, rng);
        if (n) { acc.cards[m.id] = (acc.cards[m.id] ?? 0) + n; rep.cards.push({ name: m.name, qty: n }); }
      }
      coins += k * (m.coins[0] + m.coins[1]) / 2;
      for (const dr of m.drops) {
        give(dr.item, settle(k * Math.min(1, dr.chance * d.dropMult) * (dr.qty[0] + dr.qty[1]) / 2, rng));
      }
    }
    rep.xp = Math.floor(xp * d.xpMult);
    rep.coins = Math.floor(coins);
    c.kills[map.id] = (c.kills[map.id] ?? 0) + kills;
    acc.coins += rep.coins;
    rep.levels = gainXp(c, rep.xp);
  } else if (gatherNode) {
    const node = gatherNode;
    if (node) {
      rep.mode = 'gather';
      const swings = Math.ceil(node.hp / d[node.skill]);
      const yields = Math.floor(time / (swings * SWING));
      give(node.item, yields);
      const sxp = yields * node.xp;
      rep.skill = { key: node.skill, name: SKILL_NAMES[node.skill], xp: sxp, levels: gainSkillXp(c, node.skill, sxp) };
    }
  }
  c.hp = derive(c, acc.cards).maxHp;
  c.mp = derive(c, acc.cards).maxMp;
  return rep;
}
