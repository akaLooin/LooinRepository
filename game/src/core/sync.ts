// 접속 중 플레이 기록 검증. 기기는 화면에서 전투·채집을 돌리고 주기적으로 결과(캐릭터 상태)를 보낸다.
// 서버는 "지난 동기화 이후 흐른 시간(서버 시계)" 동안 얻을 수 있는 최대치를 계산해, 넘으면 거절한다.
// 장비·특성·전직처럼 행동(actions.ts)으로만 바뀌어야 하는 값이 바뀌어 있어도 거절한다.
import { CARD_CHANCE, CARD_UNOWNED_MULT, ITEMS, MAPS, MONSTERS, NODES, PRODUCTS } from './data';
import { Account, Character, anvilCap, anvilRate, derive, skillXpToNext, xpToNext } from './state';
import { GATHER_INTERVAL } from './world';

/** 기기가 보내는 계정 값(캐릭터 밖) */
export interface SyncAccount { coins: number; cards: Record<string, number>; bosses: Record<string, number> }

/** 넉넉함: 정상 플레이가 걸리지 않도록 최대치에 곱하고 더하는 값 */
const SLACK = 1.6, PAD_KILLS = 4;

const cumXp = (lv: number, xp: number, next: (l: number) => number) => { let t = xp; for (let l = 1; l < lv; l++) t += next(l); return t; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const itemCount = (c: Character) => {
  const m: Record<string, number> = {};
  for (const s of c.inventory) m[s.id] = (m[s.id] ?? 0) + s.qty;
  if (c.food) m[c.food.id] = (m[c.food.id] ?? 0) + c.food.qty;
  return m;
};

/** 문제가 없으면 null, 있으면 거절 이유 */
export function checkSync(acc: Account, ci: number, claimed: Character, ca: SyncAccount, elapsedSec: number): string | null {
  const s = acc.characters[ci];
  if (!s) return '캐릭터가 없습니다';
  const t = Math.max(0, elapsedSec);

  // 1) 행동으로만 바뀌는 값
  const fixed: (keyof Character)[] = ['id', 'name', 'look', 'cls', 'stats', 'talents', 'equipment', 'bags', 'pouches', 'cardSlots', 'mapId', 'attackBars'];
  for (const k of fixed) if (!same(s[k], claimed[k])) return `바뀌면 안 되는 값: ${String(k)}`;
  if (!same(s.anvil.pts, claimed.anvil.pts)) return '바뀌면 안 되는 값: 모루 포인트';
  if (!same(s.anvil.slots.map((x) => x.prod), claimed.anvil.slots.map((x) => x.prod).slice(0, s.anvil.slots.length))) return '바뀌면 안 되는 값: 모루 품목';
  for (const [npc, q] of Object.entries(claimed.quests)) {
    const sq = s.quests[npc] ?? { idx: 0, accepted: false, prog: 0 };
    if (q.idx !== sq.idx || q.accepted !== sq.accepted) return '바뀌면 안 되는 값: 퀘스트';
  }

  // 2) 이 시간 동안 가능한 최대치
  const map = MAPS[s.mapId];
  const d = derive(s, acc.cards);
  const boss = map.boss ? MONSTERS[map.boss] : null;
  const killCap = map.spawns.reduce((n, x) => n + x.count, 0) * (3600 / 5);
  const maxKills = Math.floor((killCap * t) / 3600 * SLACK) + PAD_KILLS + (boss ? 1 : 0);
  const mobs = [...map.spawns.map((x) => MONSTERS[x.monster]), ...(boss ? [boss] : [])];
  const maxXpKill = Math.max(0, ...mobs.map((m) => m.xp)) * d.xpMult * 1.05;
  const maxCoinKill = Math.max(0, ...mobs.map((m) => m.coins[1]));
  const swings = t / GATHER_INTERVAL * SLACK + 3;

  // 처치
  const dk = (claimed.kills[s.mapId] ?? 0) - (s.kills[s.mapId] ?? 0);
  if (dk < 0 || dk > maxKills) return `처치 수가 너무 많습니다(${dk} > ${maxKills})`;
  for (const [m, n] of Object.entries(claimed.kills)) if (m !== s.mapId && n !== (s.kills[m] ?? 0)) return '다른 맵 처치 수가 바뀌었습니다';
  for (const [npc, q] of Object.entries(claimed.quests)) if (q.prog - (s.quests[npc]?.prog ?? 0) > dk) return '퀘스트 진행이 처치 수보다 많습니다';

  // 경험치·레벨(레벨업 포인트는 레벨만큼만)
  const dxp = cumXp(claimed.level, claimed.xp, xpToNext) - cumXp(s.level, s.xp, xpToNext);
  if (dxp < 0 || dxp > dk * maxXpKill + 1) return `경험치가 너무 많습니다(${Math.round(dxp)})`;
  const dl = claimed.level - s.level;
  if (claimed.statPoints - s.statPoints !== dl * 3 || claimed.talentPoints - s.talentPoints !== dl) return '포인트가 레벨과 맞지 않습니다';

  // 기술 경험치: 채집(맵 자원) + 모루 생산
  for (const k of ['mining', 'chopping'] as const) {
    const nodes = map.nodes.map((n) => NODES[n.node]).filter((n) => n.skill === k);
    const maxYield = nodes.length ? Math.max(...nodes.map((n) => Math.ceil(d[k] / n.hp))) * swings : 0;
    const maxXp = maxYield * Math.max(0, ...nodes.map((n) => n.xp));
    const ds = cumXp(claimed.skills[k].lv, claimed.skills[k].xp, skillXpToNext) - cumXp(s.skills[k].lv, s.skills[k].xp, skillXpToNext);
    if (ds < 0 || ds > maxXp + 1) return `${k} 경험치가 너무 많습니다`;
  }
  let anvilXp = 0;
  for (let i = 0; i < s.anvil.slots.length; i++) {
    const sl = s.anvil.slots[i], cl = claimed.anvil.slots[i];
    const p = PRODUCTS.find((x) => x.item === sl.prod);
    const made = cl.stored - sl.stored;
    const maxMade = (anvilRate(s, i) * t) / 3600 * SLACK + 2;
    if (made < 0 || made > maxMade || cl.stored > anvilCap(claimed)) return '모루 생산량이 너무 많습니다';
    if (p) anvilXp += made * p.xp * (1 + s.anvil.pts.xp * 0.15) * 1.05 + 1;
  }
  const dsm = cumXp(claimed.skills.smithing.lv, claimed.skills.smithing.xp, skillXpToNext) - cumXp(s.skills.smithing.lv, s.skills.smithing.xp, skillXpToNext);
  if (dsm < 0 || dsm > anvilXp + 1) return '대장 경험치가 너무 많습니다';

  // 아이템: 몬스터 드롭 + 채집으로만 늘어난다(줄어드는 것은 상관없음)
  const allow: Record<string, number> = {};
  for (const m of mobs) for (const dr of m.drops) allow[dr.item] = (allow[dr.item] ?? 0) + (m.boss ? 1 : dk) * dr.qty[1];
  for (const n of map.nodes) { const nd = NODES[n.node]; allow[nd.item] = (allow[nd.item] ?? 0) + Math.ceil(d[nd.skill] / nd.hp) * swings; }
  const before = itemCount(s), after = itemCount(claimed);
  for (const [id, n] of Object.entries(after)) {
    if (!ITEMS[id]) return `없는 아이템: ${id}`;
    const gain = n - (before[id] ?? 0);
    if (gain > (allow[id] ?? 0)) return `${ITEMS[id].name}이(가) 너무 많습니다(+${gain})`;
  }
  if (claimed.inventory.some((x) => x.qty <= 0 || !Number.isInteger(x.qty))) return '잘못된 아이템 수량';

  // 계정 값: 코인·카드·보스
  const dc = ca.coins - acc.coins;
  if (dc < 0 || dc > dk * maxCoinKill) return `코인이 너무 많습니다(+${dc})`;
  for (const [id, n] of Object.entries(ca.cards)) {
    const gain = n - (acc.cards[id] ?? 0);
    const cap = Math.ceil(dk * CARD_CHANCE * CARD_UNOWNED_MULT * d.dropMult * 4) + 1;
    if (gain < 0 || gain > (MONSTERS[id]?.boss ? 1 : cap)) return '카드가 너무 많습니다';
  }
  for (const [id, n] of Object.entries(ca.bosses)) {
    const gain = n - (acc.bosses[id] ?? 0);
    if (gain < 0 || gain > (map.boss === id ? 1 : 0)) return '보스 처치 기록이 맞지 않습니다';
  }
  return null;
}

/** 검증을 통과한 기록을 서버 상태에 반영. 서버 쪽 시각만 쓴다 */
export function acceptSync(acc: Account, ci: number, claimed: Character, ca: SyncAccount, now: number) {
  const s = acc.characters[ci];
  acc.characters[ci] = { ...claimed, lastActive: now, anvil: { ...claimed.anvil, slots: claimed.anvil.slots.slice(0, Math.max(s.anvil.slots.length, claimed.anvil.slots.length)) } };
  acc.coins = ca.coins;
  acc.cards = { ...acc.cards, ...ca.cards };
  acc.bosses = { ...acc.bosses, ...ca.bosses };
}
