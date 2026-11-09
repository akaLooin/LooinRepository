// Alignments, factions and their 12 upgrades each (3 tiers x 4), structured like the original.
// Effects are written for this game (same roles as the original factions, own numbers).
// Costs marked GUESS are not verified against the original yet.
import type { Alignment, CoinType, FactionId } from './types';
import { type Ctx, type Mods, ln, lowTiers, highTiers } from '../engine/mods';

const LOW = ['c1', 'c2', 'c3'];
const low = (c: Ctx) => LOW.reduce((a, k) => a + (c.buildings[k] ?? 0), 0);
const aligned = (c: Ctx, p: string) => Object.entries(c.buildings).reduce((a, [k, n]) => a + (k.startsWith(p) ? n : 0), 0);

export interface AlignmentDef { id: Alignment; ko: string; cost: number; color: string; desc: string; needsGems?: number }
export const ALIGNMENTS: AlignmentDef[] = [
  { id: 'bright', ko: '{alignBright}의 증표', cost: 25000, color: '#4f78c8', desc: '능동 플레이: 주문과 두드리기 중심. {alignBright} 건물과 진영이 열려요.' },
  { id: 'dark', ko: '{alignDark}의 증표', cost: 25000, color: '#b0413e', desc: '방치 플레이: 꾸준한 건물 생산 중심. {alignDark} 건물과 진영이 열려요.' },
  { id: 'legend', ko: '{alignLegend}의 증표', cost: 1e16, color: '#6f6a5e', desc: '혼합형. {gem}(보석) 10억 개 이상 필요.', needsGems: 1e9 },
];

export interface UpgradeEffect { (m: Mods, c: Ctx): void }
export interface FactionUpgrade {
  id: string; faction: FactionId; tier: 1 | 2 | 3; slot: 0 | 1 | 2 | 3;
  ko: string; desc: string; cost: number; fcCost?: Partial<Record<CoinType, number>>;
  effect?: UpgradeEffect;
}
export type FactionKind = 'vanilla' | 'neutral' | 'prestige' | 'mercenary';
export interface FactionDef {
  id: FactionId; alignment: Alignment; kind: FactionKind; ko: string; role: string; color: string; emblem: string;
  treatyCost: Partial<Record<CoinType, number>>; coinTypes: CoinType[]; spell: string; minR?: number;
}

export const FACTIONS: FactionDef[] = [
  { id: 'woodland', kind: 'vanilla', alignment: 'bright', ko: '숲속 친구들', role: '{assistant}(조수)과 하위 3단계 건물', color: '#7fbf6a', emblem: 'leaf', treatyCost: { woodland: 20 }, coinTypes: ['woodland'], spell: 'woodland' },
  { id: 'minstrel', kind: 'vanilla', alignment: 'bright', ko: '음유시인', role: '두드리기와 {fc}', color: '#d8b04a', emblem: 'lute', treatyCost: { minstrel: 20 }, coinTypes: ['minstrel'], spell: 'minstrel' },
  { id: 'starmage', kind: 'vanilla', alignment: 'bright', ko: '별의 마법사', role: '주문과 {mana} 회복', color: '#7cc0ff', emblem: 'wand', treatyCost: { starmage: 20 }, coinTypes: ['starmage'], spell: 'starmage' },
  { id: 'thieves', kind: 'vanilla', alignment: 'dark', ko: '도적단', role: '싼 건물과 {coin} 욕심', color: '#a8a060', emblem: 'dagger', treatyCost: { thieves: 20 }, coinTypes: ['thieves'], spell: 'thieves' },
  { id: 'ghost', kind: 'vanilla', alignment: 'dark', ko: '유령', role: '오래 켜둘수록 강해지는 생산·{assistant}', color: '#8c6cc8', emblem: 'ghost', treatyCost: { ghost: 20 }, coinTypes: ['ghost'], spell: 'ghost' },
  { id: 'witch', kind: 'vanilla', alignment: 'dark', ko: '마녀', role: '상위 단계 건물과 {trophy}', color: '#d4553a', emblem: 'cauldron', treatyCost: { witch: 20 }, coinTypes: ['witch'], spell: 'witch' },
  { id: 'pirate', kind: 'neutral', alignment: 'legend', ko: '해적', role: '운이 좋으면 아주 강함 (별의 마법사+도적단)', color: '#e0c060', emblem: 'anchor', treatyCost: { starmage: 500, thieves: 500 }, coinTypes: ['starmage', 'thieves'], spell: 'pirate' },
  { id: 'sage', kind: 'neutral', alignment: 'legend', ko: '현자', role: '마법과 균형 (음유시인+마녀)', color: '#9a7a4a', emblem: 'owl', treatyCost: { minstrel: 500, witch: 500 }, coinTypes: ['minstrel', 'witch'], spell: 'sage' },
  { id: 'puppet', kind: 'neutral', alignment: 'legend', ko: '꼭두각시', role: '시간이 갈수록 강해짐 (숲속 친구들+유령)', color: '#b090e0', emblem: 'mask', treatyCost: { woodland: 500, ghost: 500 }, coinTypes: ['woodland', 'ghost'], spell: 'puppet' },
  // prestige factions: joined in addition to a faction of the same alignment, after its alliance (WIKI)
  { id: 'clockmaker', kind: 'prestige', alignment: 'bright', ko: '시계장인', role: '발굴과 두드리기 ({alignBright}의 프리스티지)', color: '#c8a060', emblem: 'gear', treatyCost: { clockmaker: 3000 }, coinTypes: ['clockmaker'], spell: 'clockmaker' },
  { id: 'shadow', kind: 'prestige', alignment: 'dark', ko: '그림자 극단', role: '연속 주문과 {exchange} ({alignDark}의 프리스티지)', color: '#6a5a9a', emblem: 'mask', treatyCost: { shadow: 3000 }, coinTypes: ['shadow'], spell: 'shadow' },
  { id: 'phoenix', kind: 'prestige', alignment: 'legend', ko: '불사조', role: '무작위 숨결, 유물과 시간 ({alignLegend}의 프리스티지, R46)', color: '#e86a3a', emblem: 'sun', treatyCost: { clockmaker: 5e9, shadow: 5e9 }, coinTypes: ['clockmaker', 'shadow'], spell: 'phoenix', minR: 46 },
  // mercenary: any alignment, R3, combines other factions' spells and upgrades (WIKI)
  { id: 'freelancer', kind: 'mercenary', alignment: 'bright', ko: '떠돌이 작가', role: '다른 진영의 주문과 개선을 골라 조합 (R3, 모든 성향)', color: '#9a9a9a', emblem: 'book', treatyCost: {}, coinTypes: [], spell: '', minR: 3 },
];
export const FACTION_BY_ID = Object.fromEntries(FACTIONS.map((f) => [f.id, f])) as Record<FactionId, FactionDef>;

// Coin costs per [tier][slot 1..3] and gate faction-coin costs per tier, from the original (WIKI, Fandom faction pages).
const M = 1e6, B = 1e9, T = 1e12, Qa = 1e15, Qi = 1e18, Sx = 1e21, Sp = 1e24, Oc = 1e27, No = 1e30, Qad = 1e45, Qid = 1e48, Sxd = 1e51, Spd = 1e54;
const VAN = [[50 * M, 500 * M, 5 * B], [500 * B, 5 * T, 50 * T], [5 * Qa, 50 * Qa, 500 * Qa]];
export const FACTION_COSTS: Record<string, number[][]> = {
  woodland: [[50 * M, 500 * M, 50 * T], [5 * Qa, 5 * T, 500 * Qa], [500 * B, 50 * Qa, 5 * B]],
  minstrel: VAN, starmage: VAN, thieves: VAN, ghost: VAN, witch: VAN,   // elf/goblin tier 3: GUESS (same as angel)
  pirate: [[500 * Qi, 5 * Sx, 50 * Sx], [5 * Sp, 50 * Sp, 500 * Sp], [50 * Oc, 500 * Oc, 5 * No]],
  sage: [[500 * Qi, 5 * Sx, 50 * Sx], [5 * Sp, 50 * Sp, 500 * Sp], [50 * Oc, 500 * Oc, 5 * No]],
  puppet: [[500 * Qi, 5 * Sx, 50 * Sx], [5 * Sp, 50 * Sp, 500 * Sp], [50 * Oc, 500 * Oc, 5 * No]],
  clockmaker: [[5 * Qad, 50 * Qad, 500 * Qad], [50 * Qid, 500 * Qid, 5 * Sxd], [500 * Sxd, 5 * Spd, 50 * Spd]],
  shadow: [[5 * Qad, 50 * Qad, 500 * Qad], [50 * Qid, 500 * Qid, 5 * Sxd], [500 * Sxd, 5 * Spd, 50 * Spd]],
  phoenix: [[5e66, 5e67, 5e68], [5e70, 5e71, 5e72], [5e74, 5e75, 5e76]],
};
const GATE_FC: Record<string, number[]> = {
  vanilla: [20, 100, 500], neutral: [500, 2500, 10000], prestige: [3000, 12000, 30000], phoenix: [5e9, 2.5e10, 6.5e10],
};
const GATE = ['조약', '우호 협정', '동맹'];

type Row = [string, string, UpgradeEffect];
function faction(id: FactionId, rows: Row[]): FactionUpgrade[] {
  const f = FACTIONS.find((x) => x.id === id)!;
  const out: FactionUpgrade[] = [];
  for (let tier = 1 as 1 | 2 | 3; tier <= 3; tier++) {
    const gate: FactionUpgrade = {
      id: `${id}_g${tier}`, faction: id, tier, slot: 0, ko: `${f.ko} ${GATE[tier - 1]}`,
      desc: tier === 1 ? `${f.ko} 진영에 가입해요. 진영 주문이 열려요.` : `${f.ko}와 더 깊은 관계를 맺어 다음 단계 개선이 열려요.`,
      cost: 0,
      fcCost: Object.fromEntries(f.coinTypes.map((c) => [c, GATE_FC[f.id === 'phoenix' ? 'phoenix' : f.kind][tier - 1]])),
    };
    out.push(gate);
    for (let s = 1; s <= 3; s++) {
      const [ko, desc, effect] = rows[(tier - 1) * 3 + (s - 1)];
      out.push({ id: `${id}_${tier}${s}`, faction: id, tier, slot: s as 1 | 2 | 3, ko, desc, cost: FACTION_COSTS[id][tier - 1][s - 1], effect });
    }
  }
  return out;
}

export const FACTION_UPGRADES: FactionUpgrade[] = [
  // Vanilla factions: effect types and formulas modelled on the original's upgrades (Fandom faction pages), own names.
  ...faction('woodland', [
    ['요정 비료', '1~3단계 건물의 기본 생산 +600', (m) => { for (const id of LOW) m.baseAdd[id] = (m.baseAdd[id] ?? 0) + 600; }],
    ['숲속 일꾼', '{assistant} 수에 따라 1~3단계 건물 증가 (5·ln(1+x)^2.5 %)', (m, c) => lowTiers(m, 1 + (5 * ln(1 + c.assistants) ** 2.5) / 100)],
    ['주문 대장장이', '1~3단계 건물 수에 따라 {mana} 회복 증가 (0.3·x^0.3)', (m, c) => { m.manaRegenAdd += 0.3 * low(c) ** 0.3; }],
    ['별쇠 합금', '발동 중인 주문 1개당 초당 1회 자동 두드리기', (m, c) => { m.autoclick += c.activeSpells ?? 0; }],
    ['황금 항아리', '1~3단계 건물 생산의 100%를 두드리기 기본 보상에 더하고 {fcShort} 확률 +20%', (m, c) => { m.clickShareLow += 1; m.fcChance *= 1.2; void c; }],
    ['요정 떼', '1~3단계 건물 수에 따라 {assistant} 증가 (0.3·x^0.7)', (m, c) => { m.assistantsAdd += Math.floor(0.3 * low(c) ** 0.7); }],
    ['요정 요리', '숲의 합창 발동 시간에 따라 {gem} 보너스 증가 (0.35·초^0.65 %)', (m, c) => { m.gemBonusMult *= 1 + (0.35 * (c.spellTime?.woodland ?? 0) ** 0.65) / 100; }],
    ['무지개 다리', '1~3단계 건물 수에 따라 전체 생산 증가 (1.25·x^0.75 %)', (m, c) => { m.global *= 1 + (1.25 * low(c) ** 0.75) / 100; }],
    ['다정한 마음', '{alignBright} 건물 수에 따라 {mana} 최대치 증가 (1.3·x^0.7)', (m, c) => { m.manaMaxAdd += 1.3 * aligned(c, 'b') ** 0.7; }],
  ]),
  ...faction('minstrel', [
    ['음유시인의 동전', '{fcShort} 발견 확률 x2, 초당 3회 자동 두드리기', (m) => { m.fcChance *= 2; m.autoclick += 3; }],
    ['반짝이는 장식', '건물 전체 생산의 50%를 두드리기 보상에 더해요', (m) => { m.clickShare += 0.5; }],
    ['오래된 연주법', '이번 판 두드리기 수에 따라 {mana} 회복 증가 (2·log10(1+x)^1.25)', (m, c) => { m.manaRegenAdd += 2 * Math.log10(1 + c.clicksRun) ** 1.25; }],
    ['순회 사절단', '{alignBright} 건물 수에 따라 두드리기 증가 (x^0.6 %)', (m, c) => { m.click *= 1 + aligned(c, 'b') ** 0.6 / 100; }],
    ['노래의 효율', '이번 판 {fcShort} 수에 따라 {exchange} 보너스 증가 (2·ln(1+x)^2 %)', (m, c) => { m.exchangeBonus *= 1 + (2 * ln(1 + c.fcFoundRun) ** 2) / 100; }],
    ['비밀 연주법', '이번 판 두드리기 수에 따라 전체 생산 증가 (2·x^0.4 %)', (m, c) => { m.global *= 1 + (2 * c.clicksRun ** 0.4) / 100; }],
    ['노래의 외교', '이번 판 {fcShort} 수에 따라 두드리기 증가 (2·ln(1+x)^2 %)', (m, c) => { m.click *= 1 + (2 * ln(1 + c.fcFoundRun) ** 2) / 100; }],
    ['행운의 노래', '두드릴 때마다 1% 확률로 생산의 10,000% 획득 (평균: 두드리기에 생산 100% 추가)', (m) => { m.clickShare += 1; }],
    ['보물 상자 장식', '{trophy} 수에 따라 {fcShort} 확률 증가 (1%/개)', (m, c) => { m.fcChance *= 1 + 0.01 * c.trophies; }],
  ]),
  ...faction('starmage', [
    ['별의 종', '건물 수에 따라 {mana} 회복 증가 (1.6·x^0.4)', (m, c) => { m.manaRegenAdd += 1.6 * c.ownedTotal ** 0.4; }],
    ['별의 결심', '이번 판 주문 수에 따라 전체 생산 증가 (4·ln(1+x)^2 %)', (m, c) => { m.global *= 1 + (4 * ln(1 + c.spellsRun) ** 2) / 100; }],
    ['별빛 깃털', '발동 중인 주문 1개당 {fcShort} 확률 +20%', (m, c) => { m.fcChance *= 1 + 0.2 * (c.activeSpells ?? 0); }],
    ['수호성', '구름 항구의 기본 생산 +98,000, 보유 수에 따라 추가 증가', (m, c) => { m.baseAdd.b7 = (m.baseAdd.b7 ?? 0) + 98000; m.building.b7 = (m.building.b7 ?? 1) * (1 + (c.buildings.b7 ?? 0) / 100); }],
    ['별의 지혜', '{mana} 회복 x1.5', (m) => { m.manaRegenMult *= 1.5; }],
    ['대천사의 깃털', '{mana} 회복량에 따라 전체 생산 증가 (4·ln(1+x)^2 %)', (m, c) => { m.global *= 1 + (4 * ln(1 + c.manaRegen) ** 2) / 100; }],
    ['마법의 문', '이번 판 {alignBright} 시간에 따라 {mana} 최대치 증가 (3.5·초^0.7)', (m, c) => { m.manaMaxAdd += 3.5 * (c.alignSeconds ?? 0) ** 0.7; }],
    ['별의 지배', '별의 손길 발동 시간에 따라 {gem} 보너스 증가 (0.35·초^0.65 %)', (m, c) => { m.gemBonusMult *= 1 + (0.35 * (c.spellTime?.starmage ?? 0) ** 0.65) / 100; }],
    ['자유의 날개', '{mana} 회복량에 따라 전체 생산 증가 (강화)', (m, c) => { m.global *= 1 + (4 * ln(1 + c.manaRegen) ** 2.5) / 100; }],
  ]),
  ...faction('thieves', [
    ['든든한 화폐', '이번 판 {fcShort} 수에 따라 {assistant} 증가 (0.5·ln(1+x)^2)', (m, c) => { m.assistantsAdd += Math.floor(0.5 * ln(1 + c.fcFoundRun) ** 2); }],
    ['노예 상인 대신 장물아비', '{alignDark} 건물 수에 따라 전체 생산 증가 (2·x^0.7 %)', (m, c) => { m.global *= 1 + (2 * aligned(c, 'd') ** 0.7) / 100; }],
    ['싼 재료', '건물 수에 따라 인세 정산이 더 많은 초를 벌어요 (+√x 초)', (m, c) => { m.taxSeconds += Math.sqrt(c.ownedTotal); }],
    ['바보의 금', '마녀의 오두막 수에 따라 {fcShort} 확률 증가 (2·x^0.5 %)', (m, c) => { m.fcChance *= 1 + (2 * (c.buildings.d6 ?? 0) ** 0.5) / 100; }],
    ['도적 경제학', '보유 {coin}에 따라 {mana} 회복 증가 (0.75·log10(1+x)^1.25 %)', (m, c) => { m.manaRegenMult *= 1 + (0.75 * (c.coinsLog10 ?? 0) ** 1.25) / 100; }],
    ['검투사', '인세 정산 가치에 따라 전체 생산 증가 (12·ln(1+초)^3 %)', (m, c) => { m.global *= 1 + (12 * ln(1 + 30 + Math.sqrt(c.ownedTotal)) ** 3) / 100; }],
    ['도적 중앙은행', '주문을 쓸 때마다 공짜 인세 정산 (평균: 전체 생산 x1.5)', (m) => { m.global *= 1.5; }],
    ['암시장', '보유 {gem}에 따라 {gem} 보너스 증가', (m, c) => { m.gemBonusMult *= 1 + Math.log10(1 + c.gems) / 20; }],
    ['녹색 손가락 할인', '이번 판 시간에 따라 30초마다 {coin} 보너스 (평균: 전체 생산 증가)', (m, c) => { m.global *= 1 + Math.min(5, c.runSeconds / 7200); }],
  ]),
  ...faction('ghost', [
    ['걷는 망령', '{assistant} 수에 따라 {fcShort} 확률 증가 (ln(1+x)^1.75 %)', (m, c) => { m.fcChance *= 1 + ln(1 + c.assistants) ** 1.75 / 100; }],
    ['굳은 근육', '거울 미궁 수에 따라 전체 생산 증가 (4·x^0.8 %)', (m, c) => { m.global *= 1 + (4 * (c.buildings.d8 ?? 0) ** 0.8) / 100; }],
    ['죽음의 사원', '거울 미궁 수에 따라 {mana} 회복 증가 (x^0.3)', (m, c) => { m.manaRegenAdd += (c.buildings.d8 ?? 0) ** 0.3; }],
    ['꺼지지 않는 밤', '한밤의 행진 효과 x1.5', (m) => { m.assistantsMult *= 1.25; }],
    ['시체 공급', '이번 판 시간에 따라 {assistant} 증가 (0.4·초^0.6 / 10)', (m, c) => { m.assistantsAdd += Math.floor((0.4 * c.runSeconds ** 0.6) / 10); }],
    ['죽음의 조급함', '가장 많이 쓴 주문의 발동 시간에 따라 전체 생산 증가', (m, c) => { const t = Math.max(0, ...Object.values(c.spellTime ?? {})); m.global *= 1 + (2 * ln(1 + t) ** 2) / 100; }],
    ['죽은 들판', '모든 건물이 75% 더 많이 계산돼요', (m) => { m.global *= 1.75; }],
    ['지치지 않는 일꾼', '{mana} 회복량에 따라 {assistant} 생산 증가', (m, c) => { m.assistantsMult *= 1 + c.manaRegen / 20; }],
    ['부정한 의식', '이번 판 시간에 따라 전체·오프라인 생산 증가 (0.4·분^0.8 %)', (m, c) => { const f = 1 + (0.4 * (c.runSeconds / 60) ** 0.8) / 100; m.global *= f; m.offline *= f; }],
  ]),
  ...faction('witch', [
    ['고문실 대신 시험장', '{assistant} 수에 따라 그림자 극장 증가 (6·ln(1+x)^3 %)', (m, c) => { m.building.d9 = (m.building.d9 ?? 1) * (1 + (6 * ln(1 + c.assistants) ** 3) / 100); }],
    ['지옥의 마법', '끝없는 밤의 탑 수에 따라 {mana} 회복 증가', (m, c) => { m.manaRegenAdd += 0.5 * (c.buildings.d10 ?? 0) ** 0.5; }],
    ['불타는 군단', '끝없는 밤의 탑 수에 따라 {assistant} 증가', (m, c) => { m.assistantsAdd += Math.floor(2 * (c.buildings.d10 ?? 0) ** 0.5); }],
    ['용암 구덩이', '그림자 극장 기본 생산 +900,000, 끝없는 밤의 탑 +8,800,000', (m) => { m.baseAdd.d9 = (m.baseAdd.d9 ?? 0) + 9e5; m.baseAdd.d10 = (m.baseAdd.d10 ?? 0) + 8.8e6; }],
    ['마녀 감독관', '{trophy} 수에 따라 상위 3단계 건물 증가 (5%/개)', (m, c) => highTiers(m, 1 + 0.05 * c.trophies)],
    ['악의 존재감', '이번 판 주문 수에 따라 {mana} 최대치 증가', (m, c) => { m.manaMaxAdd += 10 * c.spellsRun; }],
    ['폭군', '이번 판 {alignDark} 시간에 따라 상위 3단계 건물 증가', (m, c) => highTiers(m, 1 + ((c.alignSeconds ?? 0) / 60) ** 0.7 / 10)],
    ['악의 정복자', '끝없는 밤의 탑 수에 따라 전체 생산 증가 (5·x^0.8 %)', (m, c) => { m.global *= 1 + (5 * (c.buildings.d10 ?? 0) ** 0.8) / 100; }],
    ['아주 나쁜 녀석들', '지옥불 가마솥 발동 시간에 따라 끝없는 밤의 탑 증가', (m, c) => { m.building.d10 = (m.building.d10 ?? 1) * (1 + (4 * ln(1 + (c.spellTime?.witch ?? 0)) ** 2) / 100); }],
  ]),
  // Neutral factions: effect types and formulas modelled on the original's Titan / Druid / Faceless upgrades.
  ...faction('pirate', [
    ['거대한 용광로', '건물 수에 따라 전체 생산 증가 (6·x^0.6 %)', (m, c) => { m.global *= 1 + (6 * c.ownedTotal ** 0.6) / 100; }],
    ['충전된 손길', '이번 판 두드리기 수에 따라 {mana} 회복 증가 (25 + 2.5·log10(1+x)^2.5 + x^0.25 %)', (m, c) => { m.manaRegenMult *= 1 + (25 + 2.5 * Math.log10(1 + c.clicksRun) ** 2.5 + c.clicksRun ** 0.25) / 100; }],
    ['해적의 오벨리스크', '이번 판 {alignLegend} 시간에 따라 {fcShort} 확률 증가 (3·초^0.7 %)', (m, c) => { m.fcChance *= 1 + (3 * (c.alignSeconds ?? 0) ** 0.7) / 100; }],
    ['해적의 드릴', '4단계 건물 기본 생산 +19,635, 7단계 +98,000', (m) => { for (const id of ['b4', 'd4', 'l4']) m.baseAdd[id] = (m.baseAdd[id] ?? 0) + 19635; for (const id of ['b7', 'd7', 'l7']) m.baseAdd[id] = (m.baseAdd[id] ?? 0) + 98000; }],
    ['충전된 건물', '발동 중인 주문 1개당 전체 생산 +15%', (m, c) => { m.global *= 1 + 0.15 * (c.activeSpells ?? 0); }],
    ['거인 크기의 성벽', '{assistant} 수에 따라 이야기의 나무 증가 (20 + 2.15·ln(1+x)^2.15 %)', (m, c) => { m.building.c11 = (m.building.c11 ?? 1) * (1 + (20 + 2.15 * ln(1 + c.assistants) ** 2.15) / 100); }],
    ['외눈 거인의 힘', '{assistant}가 200% 더 계산되고, 이번 판 시간에 따라 생산 증가', (m, c) => { m.assistantsMult *= 3 * (1 + (c.runSeconds / 3600) ** 0.5 / 10); }],
    ['무거운 동전', '{exchange} 보너스 x2', (m) => { m.exchangeBonus *= 2; }],
    ['거대한 전설', '이야기의 나무 수에 따라 {assistant} 생산 증가 (6·x^0.6 %)', (m, c) => { m.assistantsMult *= 1 + (6 * (c.buildings.c11 ?? 0) ** 0.6) / 100; }],
  ]),
  ...faction('sage', [
    ['현자의 어휘', '낮은 단계 건물일수록 크게 증가 (6·1.8^(12-단계) %)', (m) => { for (let t = 1; t <= 11; t++) m.tier[t] *= 1 + (6 * 1.8 ** (12 - t)) / 100; }],
    ['동물 친구들', '{assistant} +3, 이번 판 시간에 따라 더 늘어요', (m, c) => { m.assistantsAdd += 3 + Math.floor((Math.sqrt(1 + 12 * (c.runSeconds / 3600)) - 1) / 2); }],
    ['자연의 순환', '건물 수에 따라 {fcShort} 확률 증가 (0.4·x^0.4 %)', (m, c) => { m.fcChance *= 1 + (0.4 * c.ownedTotal ** 0.4) / 100; }],
    ['대지의 유대', '돌다리 요새 수에 따라 {mana} 최대치 증가 (+2/채)', (m, c) => { m.manaMaxAdd += 2 * (c.buildings.l5 ?? 0); }],
    ['음유시인의 지식', '{mana} 최대치에 따라 전체 생산 증가 (16·ln(1+x)^2 %)', (m, c) => { m.global *= 1 + (16 * ln(1 + (c.manaMax ?? 1000)) ** 2) / 100; }],
    ['변신술', '{assistant} 수에 따라 {mana} 회복 증가 (1.3·x^0.7)', (m, c) => { m.manaRegenAdd += 1.3 * c.assistants ** 0.7; }],
    ['고대 서사시', '낮은 단계 건물일수록 크게 증가 (12·1.8^(12-단계) %)', (m) => { for (let t = 1; t <= 11; t++) m.tier[t] *= 1 + (12 * 1.8 ** (12 - t)) / 100; }],
    ['대지의 영혼', '돌다리 요새 수에 따라 {mana} 회복 증가 (x^0.25)', (m, c) => { m.manaRegenAdd += (c.buildings.l5 ?? 0) ** 0.25; }],
    ['건물 정글', '같은 종류 건물 수에 따라 각 건물 증가 (1.5·x^0.9 %)', (m, c) => { for (const [id, n] of Object.entries(c.buildings)) if (n > 0) m.building[id] = (m.building[id] ?? 1) * (1 + (1.5 * n ** 0.9) / 100); }],
  ]),
  ...faction('puppet', [
    ['영역 확장', '{assistant} 수에 따라 시간의 미로 증가 (50·ln(1+x)^2 %)', (m, c) => { m.building.l8 = (m.building.l8 ?? 1) * (1 + (50 * ln(1 + c.assistants) ** 2) / 100); }],
    ['진화하는 변이', '시간의 미로 수에 따라 {fcShort} 확률 증가 (3·x^0.6 %)', (m, c) => { m.fcChance *= 1 + Math.floor(3 * (c.buildings.l8 ?? 0) ** 0.6) / 100; }],
    ['깊은 기억', '이번 판 시간에 따라 {assistant} 배율 증가 (0.3·초^0.7 %)', (m, c) => { m.assistantsMult *= 1 + (0.3 * c.runSeconds ** 0.7) / 100; }],
    ['황금 합성', '보유 {coin}에 따라 {alignLegend} 건물 증가 (0.2·ln(1+x)^2 %)', (m, c) => { m.align.legend *= 1 + (0.2 * ((c.coinsLog10 ?? 0) * Math.LN10) ** 2) / 100; }],
    ['세포 분열', '건물 수에 따라 {assistant} 증가 (0.5·x^0.5)', (m, c) => { m.assistantsAdd += Math.floor(0.5 * c.ownedTotal ** 0.5); }],
    ['무성한 성장', '건물 수에 따라 전체 생산 증가 (0.8·x^0.8 %)', (m, c) => { m.global *= 1 + (0.8 * c.ownedTotal ** 0.8) / 100; }],
    ['마법의 보물', '{assistant} 수에 따라 {mana} 회복 증가 (2.5·x^0.5)', (m, c) => { m.manaRegenAdd += 2.5 * c.assistants ** 0.5; }],
    ['기괴한 존재', '발동 중인 주문 수에 따라 {assistant} 생산 증가 (20·x^0.9 %)', (m, c) => { m.assistantsMult *= 1 + (20 * (c.activeSpells ?? 0) ** 0.9) / 100; }],
    ['군체 정신', '이번 판 시간에 따라 전체 생산 증가 (√초 %)', (m, c) => { m.global *= 1 + Math.sqrt(c.runSeconds) / 100; }],
  ]),
  ...faction('clockmaker', [
    ['톱니 맥주', '3단계 건물 수에 따라 {fcShort} 발견 확률 +(2·√x)%', (m, c) => { m.fcChance *= 1 + 0.02 * Math.sqrt(c.buildings.c3 ?? 0); }],
    ['정밀 석공술', '건물 가격 -10%', (m) => { m.costMult *= 0.9; }],
    ['깊은 갱도', '탐사 깊이에 따라 전체 생산 증가 (40·x^0.4 %)', (m, c) => { m.global *= 1 + (40 * (c.excavations ?? 0) ** 0.4) / 100; }],
    ['지하 성채', '{gem}에 따라 {mana} 회복 증가', (m, c) => { m.manaRegenMult *= 1 + (1.5 * Math.log10(1 + c.gems) ** 1.5) / 100; }],
    ['부서지지 않는 보물', '이번 판 건물 수에 따라 두드리기 보상 증가', (m, c) => { m.click *= 1 + (0.5 * c.ownedTotal ** 0.65) / 100; }],
    ['수염 난 {assistant}', '이번 판 시간에 따라 {assistant} 생산 증가', (m, c) => { m.assistantsMult *= 1 + c.runSeconds ** 0.7 / 100; }],
    ['전투 망치', '이번 판 {fcShort} 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + (2 * ln(1 + c.fcFoundRun) ** 2) / 100; }],
    ['마법 저항', '두드리기 위력 x3', (m) => { m.click *= 3; }],
    ['파수꾼', '{mana} 최대치 +500', (m) => { m.manaMaxAdd += 500; }],
  ]),
  ...faction('shadow', [
    ['지하의 폭정', '이번 판 시간에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + (0.7 * c.runSeconds) ** 0.7 / 100; }],
    ['암살자의 의리', '{assistant} 수에 따라 {fcShort} 발견 확률 증가', (m, c) => { m.fcChance *= 2 + 0.005 * Math.sqrt(c.assistants); }],
    ['그림자 진격', '{mana} 최대치에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + (2 * Math.log10(1 + (c.manaMax ?? 1000)) ** 2) / 100; }],
    ['마력 중독', '이번 판 시간에 따라 {mana} 회복 증가', (m, c) => { m.manaRegenAdd += 2.5 + 0.25 * c.runSeconds ** 0.5; }],
    ['피의 제물', '마녀의 오두막 수에 따라 전체 생산 +3%/채', (m, c) => { m.global *= 1 + 0.03 * (c.buildings.d6 ?? 0); }],
    ['협박', '{exchange} 보너스 +3%p', (m) => { m.exchangeBonus += 0.03; }],
    ['거미의 신', '건물 수에 따라 {assistant} 배율 증가', (m, c) => { m.assistantsMult *= 1 + (0.5 * Math.sqrt(c.ownedTotal)) / 100; }],
    ['전문 암살자', '{exchange} 수에 따라 {gem} 보너스 증가', (m, c) => { m.gemBonusMult *= 1 + (0.6 * c.exchanges ** 0.6) / 100; }],
    ['칼날의 춤', '주문 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + 0.05 * c.spellsRun; }],
  ]),
  ...faction('phoenix', [
    ['불꽃 비늘', '{alignLegend} 건물 생산 x5', (m) => { m.align.legend *= 5; }],
    ['재의 비행', '용의 보물고 생산 x21', (m) => { m.building.l9 = (m.building.l9 ?? 1) * 21; }],
    ['영원한 지혜', '{exchange} 보너스에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + (2 * (c.exchanges * 10) ** 1.15) / 100; }],
    ['불사조의 후예', '이번 판 시간에 따라 {assistant} 생산 증가', (m, c) => { m.assistantsMult *= 1 + (0.75 * c.runSeconds ** 0.55) / 100; }],
    ['풍요의 보물더미', '전체 생산 x3', (m) => { m.global *= 3; }],
    ['날카로운 발톱', '두드리기 수에 따라 {assistant} 추가', (m, c) => { m.assistantsAdd += Math.floor(0.1 * ln(1 + c.clicksRun) ** 2.75); }],
    ['고대의 허기', '전체 생산 x4', (m) => { m.global *= 4; }],
    ['압도적 존재감', '{mana} 회복 x2', (m) => { m.manaRegenMult *= 2; }],
    ['무지개 비늘', '전체 생산 x5', (m) => { m.global *= 5; }],
  ]),
];
