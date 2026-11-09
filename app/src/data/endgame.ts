// Late-game systems, structured like the original (replica/recon.md): reincarnation power,
// heritages, bloodlines, excavation & artifacts, challenges, research.
// Formulas marked WIKI follow the original's wiki; names/text are our own. GUESS = unverified.
import type { CoinType, FactionId } from './types';
import { type Ctx, type Mods, ln, lowTiers } from '../engine/mods';

export interface EndCtx extends Ctx {
  reincarnations: number; excavations: number; artifacts: number; hoursTotal: number; maxOwned: number;
  fcChance: number; manaMax: number; exchangesRun: number; c11: number;
}
type Eff = (m: Mods, c: EndCtx) => void;

// ---------------------------------------------------------------- reincarnation (WIKI)
export const REINCARNATION_BASE = 1e27;  // first reincarnation needs 1e27 gems, x1000 each time
export interface RPerk { r: number; ko: string; effect: Eff }
export const REINCARNATION_PERKS: RPerk[] = [
  { r: 1, ko: '전체 생산 +50%·R, 오프라인 생산 +500%·R, 조각 확률 +R%, 영감 회복 증가', effect: (m, c) => {
    const x = c.reincarnations; m.global *= 1 + 0.5 * x; m.offline *= 1 + 5 * x; m.fcChance *= 1 + 0.01 * x * 10;
    m.manaRegenAdd += Math.floor(6.25 * (Math.sqrt(1 + 8 * x) - 1)) / 10; } },
  { r: 2, ko: '전설 보너스 +0.2%p·R (시작 0.4%p)', effect: (m, c) => { m.gemBonusMult *= 1 + (0.002 * c.reincarnations) / 0.02; } },
  { r: 5, ko: '견습생 +R, 견습생 생산 +2%·R', effect: (m, c) => { m.assistantsAdd += c.reincarnations; m.assistantsMult *= 1 + 0.02 * c.reincarnations; } },
  { r: 10, ko: '총 플레이 시간과 R에 따라 전체 생산 증가', effect: (m, c) => { m.global *= 1 + (c.reincarnations ** 1.75 * c.hoursTotal ** 0.65) / 100; } },
  { r: 12, ko: '영감 최대치 +35·R', effect: (m, c) => { m.manaMaxAdd += 35 * c.reincarnations; } },
  { r: 20, ko: '같은 건물 1채당 그 건물 생산 +0.01%·R', effect: (m, c) => {
    for (const [id, n] of Object.entries(c.buildings)) if (n) m.building[id] = (m.building[id] ?? 1) * (1 + 0.0001 * c.reincarnations * n); } },
  { r: 25, ko: '출판 계약 보너스 +0.5%p·R', effect: (m, c) => { m.exchangeBonus += 0.005 * c.reincarnations; } },
  { r: 45, ko: '영감 최대치 +70·R^1.2', effect: (m, c) => { m.manaMaxAdd += 70 * c.reincarnations ** 1.2; } },
  { r: 100, ko: '영감 회복 +1%·R', effect: (m, c) => { m.manaRegenMult *= 1 + 0.01 * c.reincarnations; } },
];
export const UNLOCKS = { challenges: 2, mercenary: 3, bloodline: 7, spiritual: 14, research: 16 };

// ---------------------------------------------------------------- heritages (WIKI: unlocked by champion trophy, bought with coins each run)
export interface HeritageDef { faction: FactionId; ko: string; desc: string; cost: Partial<Record<CoinType, number>>; effect: Eff }
const V = 5000, N2 = 25000;
export const HERITAGES: HeritageDef[] = [
  { faction: 'woodland', ko: '숲속 친구들의 유산', desc: '1~3단계 건물 1채당 전체 생산 +0.075%', cost: { woodland: V },
    effect: (m, c) => { m.global *= 1 + 0.00075 * ((c.buildings.c1 ?? 0) + (c.buildings.c2 ?? 0) + (c.buildings.c3 ?? 0)); } },
  { faction: 'minstrel', ko: '음유시인의 유산', desc: '조각 발견 확률 +5%, 확률에 따라 두드리기 보상 증가', cost: { minstrel: V },
    effect: (m, c) => { m.fcChance *= 1.05; m.click *= 1 + (c.fcChance * 100) / 2 / 100; } },
  { faction: 'starmage', ko: '별의 마법사의 유산', desc: '영감 회복 +10%', cost: { starmage: V }, effect: (m) => { m.manaRegenMult *= 1.1; } },
  { faction: 'thieves', ko: '도적단의 유산', desc: '보유 전설 수에 따라 전체 생산 증가', cost: { thieves: V },
    effect: (m, c) => { m.global *= 1 + Math.floor(7.5 * Math.log10(1 + c.gems)) / 100; } },
  { faction: 'ghost', ko: '유령의 유산', desc: '이번 판 시간에 따라 견습생 추가', cost: { ghost: V },
    effect: (m, c) => { m.assistantsAdd += Math.floor(1 + 1.5 * (c.runSeconds / 3600) ** 0.5); } },
  { faction: 'witch', ko: '마녀의 유산', desc: '이야기의 나무 1그루당 전체 생산 +0.3%', cost: { witch: V },
    effect: (m, c) => { m.global *= 1 + 0.003 * c.c11; } },
  { faction: 'pirate', ko: '해적의 유산', desc: '출판 계약 보너스 +15%p', cost: { starmage: N2, thieves: N2 }, effect: (m) => { m.exchangeBonus += 0.15; } },
  { faction: 'sage', ko: '현자의 유산', desc: '건물 15채마다 영감 최대치 +1', cost: { minstrel: N2, witch: N2 }, effect: (m, c) => { m.manaMaxAdd += Math.floor(c.ownedTotal / 15); } },
  { faction: 'puppet', ko: '꼭두각시의 유산', desc: '한 판 최대 건물 수에 따라 전체 생산 증가', cost: { woodland: N2, ghost: N2 },
    effect: (m, c) => { m.global *= 1 + (0.25 * c.maxOwned ** 0.75) / 100; } },
];

// ---------------------------------------------------------------- bloodlines (WIKI: R7 + 100 upgrades of that faction in total; free; one per run)
export interface BloodlineDef { faction: FactionId; ko: string; desc: string; effect: Eff; autoclick?: number }
export const BLOODLINES: BloodlineDef[] = [
  { faction: 'woodland', ko: '숲의 혈통', desc: '견습생 수에 따라 1~3단계 건물 증가 (250·x^0.9 %)', effect: (m, c) => lowTiers(m, 1 + (2.5 * c.assistants ** 0.9)) },
  { faction: 'minstrel', ko: '노래의 혈통', desc: '이번 판 조각 수에 따라 발견 확률 증가, 초당 3회 자동 두드리기', autoclick: 3,
    effect: (m, c) => { m.fcChance *= 1 + Math.floor(15 * ln(1 + c.fcFoundRun) ** 1.75) / 100; } },
  { faction: 'starmage', ko: '별의 혈통', desc: '이번 판 시전한 주문 수에 따라 영감 회복 증가', effect: (m, c) => { m.manaRegenMult *= 1 + 0.01 * c.spellsRun; } }, // GUESS (original: spell duration)
  { faction: 'thieves', ko: '도둑의 혈통', desc: '건물 가격 증가율 감소 (1.15 → 최소 1.13)', effect: (m) => { m.costMult *= 0.98; } },
  { faction: 'ghost', ko: '망령의 혈통', desc: '환생 횟수에 따라 견습생 배율 증가 (8·R^0.8)', effect: (m, c) => { m.assistantsMult *= 1 + Math.floor(8 * c.reincarnations ** 0.8); } },
  { faction: 'witch', ko: '마녀의 혈통', desc: '주문 시전 수가 더 크게 계산됨 (GUESS: 전체 생산 +2%/주문)', effect: (m, c) => { m.global *= 1 + 0.02 * c.spellsRun; } },
  { faction: 'pirate', ko: '바다의 혈통', desc: '출판 계약 횟수에 따라 전체 생산 증가 (15·x^0.85 %)', effect: (m, c) => { m.global *= 1 + (15 * c.exchangesRun ** 0.85) / 100; } },
  { faction: 'sage', ko: '지혜의 혈통', desc: '영감 최대치에 따라 영감 회복 증가', effect: (m, c) => { m.manaRegenMult *= 1 + (0.03 * c.manaMax ** 0.9) / 100; } },
  { faction: 'puppet', ko: '가면의 혈통', desc: '영감 최대치 증가 (GUESS)', effect: (m, c) => { m.manaMaxAdd += Math.floor(30 * Math.log10(1 + c.spellsRun * 1000) ** 3.5); } },
];
export const BLOODLINE_UPGRADES_NEEDED = 100;

// ---------------------------------------------------------------- excavation (WIKI)
export const ARCHAEOLOGY = { gems: 1e9, cost: 1e29 };     // 100 Oc coins, needs 1B gems
export const excavationCost = (x: number) => 1e27 * 1.2 ** x; // coins (number is enough below ~1e308)
export const EXCAVATION_FC_CHANCE = 0.35;
export const excavationCoins = (x: number) => Math.floor(2 * ln(1 + 5e6 * 1.15 ** x) ** 3);
export const rubyAt = (n: number) => 25 * n * (n + 1);    // excavations needed for the n-th ruby

export interface ArtifactDef { id: string; ko: string; desc: string; at?: number; chance?: number; effect?: Eff }
// Our own artifacts (GUESS thresholds). "at" = guaranteed at that excavation count; "chance" = per excavation after 100.
export const ARTIFACTS: ArtifactDef[] = [
  { id: 'a_quill', ko: '부러진 깃펜', desc: '첫 이야기를 쓴 펜. 두드리기 보상 +10%', at: 1, effect: (m) => { m.click *= 1.1; } },
  { id: 'a_map', ko: '찢어진 지도 조각', desc: '조각 발견 확률 +5%', at: 10, effect: (m) => { m.fcChance *= 1.05; } },
  { id: 'a_key', ko: '녹슨 서고 열쇠', desc: '영감 최대치 +100', at: 25, effect: (m) => { m.manaMaxAdd += 100; } },
  { id: 'a_bookmark', ko: '은빛 책갈피', desc: '전체 생산 +10%', at: 50, effect: (m) => { m.global *= 1.1; } },
  { id: 'a_ink', ko: '마르지 않는 잉크병', desc: '영감 회복 +0.5', at: 100, effect: (m) => { m.manaRegenAdd += 0.5; } },
  { id: 'a_seal', ko: '왕실 인장', desc: '출판 계약 보너스 +2%p', at: 200, effect: (m) => { m.exchangeBonus += 0.02; } },
  { id: 'a_globe', ko: '작은 세계 지구본', desc: '견습생 +5', at: 400, effect: (m) => { m.assistantsAdd += 5; } },
  { id: 'a_hourglass', ko: '거꾸로 흐르는 모래시계', desc: '오프라인 생산 x2', at: 800, effect: (m) => { m.offline *= 2; } },
  { id: 'a_feather', ko: '불사조의 깃털', chance: 0.01, desc: '전체 생산 +25%', effect: (m) => { m.global *= 1.25; } },
  { id: 'a_scale', ko: '용의 비늘', chance: 0.008, desc: '옛 전설 건물 x2', effect: (m) => { m.align.legend *= 2; } },
  { id: 'a_mirror', ko: '말하는 거울', chance: 0.008, desc: '어두운 이야기 건물 x2', effect: (m) => { m.align.dark *= 2; } },
  { id: 'a_slipper', ko: '유리 구두 한 짝', chance: 0.008, desc: '밝은 이야기 건물 x2', effect: (m) => { m.align.bright *= 2; } },
  { id: 'a_bean', ko: '마지막 마법 콩', chance: 0.006, desc: '1~3단계 건물 x3', effect: (m) => lowTiers(m, 3) },
  { id: 'a_lamp', ko: '소원 램프', chance: 0.004, desc: '전체 생산 x1.5', effect: (m) => { m.global *= 1.5; } },
  { id: 'a_page', ko: '첫 장의 원본', chance: 0.003, desc: '전설 보너스 +10%', effect: (m) => { m.gemBonusMult *= 1.1; } },
  { id: 'a_crown', ko: '이야기 왕의 왕관', chance: 0.002, desc: '전체 생산 x2', effect: (m) => { m.global *= 2; } },
];

// ---------------------------------------------------------------- challenges (structure WIKI: per-faction tiers, met during a run as that faction)
export interface ChallengeDef { id: string; faction: FactionId; tier: number; ko: string; clue: string; minR: number;
  check: (s: ChallengeView) => boolean; reward: string; effect: Eff }
export interface ChallengeView { faction: FactionId | null; runSeconds: number; coinsRun: number; clicksRun: number; spellsRun: number;
  owned: Record<string, number>; ownedTotal: number; upgradesRun: number; assistants: number; fcFoundRun: number; exchangesRun: number }
const fast = (c: ChallengeView, coins: number, sec: number) => c.coinsRun >= coins && c.runSeconds <= sec;
export const CHALLENGES: ChallengeDef[] = [
  { id: 'ch_woodland1', faction: 'woodland', tier: 1, minR: 2, ko: '작은 손의 기적', clue: '작은 친구들은 빠르다. 10분 안에 금화 1B를 벌어라.', check: (c) => fast(c, 1e9, 600), reward: '숲속 친구들: 1~3단계 건물 x2', effect: (m) => lowTiers(m, 2) },
  { id: 'ch_woodland2', faction: 'woodland', tier: 2, minR: 2, ko: '숲의 잔치', clue: '견습생 40명을 모아라.', check: (c) => c.assistants >= 40, reward: '숲속 친구들: 견습생 +10', effect: (m) => { m.assistantsAdd += 10; } },
  { id: 'ch_minstrel1', faction: 'minstrel', tier: 1, minR: 2, ko: '천 번의 노래', clue: '한 판에 2,000번 두드려라.', check: (c) => c.clicksRun >= 2000, reward: '음유시인: 두드리기 x3', effect: (m) => { m.click *= 3; } },
  { id: 'ch_minstrel2', faction: 'minstrel', tier: 2, minR: 2, ko: '조각 사냥꾼', clue: '한 판에 조각 500개를 찾아라.', check: (c) => c.fcFoundRun >= 500, reward: '음유시인: 조각 확률 x1.5', effect: (m) => { m.fcChance *= 1.5; } },
  { id: 'ch_starmage1', faction: 'starmage', tier: 1, minR: 2, ko: '별비', clue: '한 판에 주문을 50번 시전하라.', check: (c) => c.spellsRun >= 50, reward: '별의 마법사: 영감 회복 +50%', effect: (m) => { m.manaRegenMult *= 1.5; } },
  { id: 'ch_starmage2', faction: 'starmage', tier: 2, minR: 2, ko: '고요한 밤', clue: '주문 없이 금화 1T를 벌어라.', check: (c) => c.spellsRun === 0 && c.coinsRun >= 1e12, reward: '별의 마법사: 영감 최대 +500', effect: (m) => { m.manaMaxAdd += 500; } },
  { id: 'ch_thieves1', faction: 'thieves', tier: 1, minR: 2, ko: '싼값에 사들이기', clue: '건물 1,000채를 모아라.', check: (c) => c.ownedTotal >= 1000, reward: '도적단: 건물 가격 -10%', effect: (m) => { m.costMult *= 0.9; } },
  { id: 'ch_thieves2', faction: 'thieves', tier: 2, minR: 2, ko: '큰 거래', clue: '출판 계약을 30번 맺어라.', check: (c) => c.exchangesRun >= 30, reward: '도적단: 출판 계약 +3%p', effect: (m) => { m.exchangeBonus += 0.03; } },
  { id: 'ch_ghost1', faction: 'ghost', tier: 1, minR: 2, ko: '긴 밤', clue: '한 판을 6시간 이상 이어가라.', check: (c) => c.runSeconds >= 6 * 3600, reward: '유령: 오프라인 생산 x3', effect: (m) => { m.offline *= 3; } },
  { id: 'ch_ghost2', faction: 'ghost', tier: 2, minR: 2, ko: '손대지 않은 책', clue: '두드리지 않고 금화 1T를 벌어라.', check: (c) => c.clicksRun === 0 && c.coinsRun >= 1e12, reward: '유령: 견습생 생산 x2', effect: (m) => { m.assistantsMult *= 2; } },
  { id: 'ch_witch1', faction: 'witch', tier: 1, minR: 2, ko: '높은 탑', clue: '끝없는 밤의 탑을 50채 지어라.', check: (c) => (c.owned.d10 ?? 0) >= 50, reward: '마녀: 8~10단계 x2', effect: (m) => { m.tier[8] *= 2; m.tier[9] *= 2; m.tier[10] *= 2; } },
  { id: 'ch_witch2', faction: 'witch', tier: 2, minR: 2, ko: '빈 서랍', clue: '개선을 20개 이하로 사고 금화 1Qa를 벌어라.', check: (c) => c.upgradesRun <= 20 && c.coinsRun >= 1e15, reward: '마녀: 전체 생산 x1.5', effect: (m) => { m.global *= 1.5; } },
  { id: 'ch_pirate1', faction: 'pirate', tier: 1, minR: 4, ko: '보물섬', clue: '한 판에 조각 2,000개를 찾아라.', check: (c) => c.fcFoundRun >= 2000, reward: '해적: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_sage1', faction: 'sage', tier: 1, minR: 4, ko: '완벽한 균형', clue: '모든 건물을 같은 수(100채 이상)로 맞춰라.', check: (c) => { const v = Object.values(c.owned).filter((x) => x > 0); return v.length >= 11 && Math.min(...v) >= 100 && Math.min(...v) === Math.max(...v); }, reward: '현자: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_puppet1', faction: 'puppet', tier: 1, minR: 4, ko: '하루 공연', clue: '한 판을 24시간 이상 이어가라.', check: (c) => c.runSeconds >= 24 * 3600, reward: '꼭두각시: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
];

// ---------------------------------------------------------------- research (WIKI: R16, 6 facilities, facility bonus 350*x^0.75 %)
export interface FacilityDef { id: string; ko: string; factions: FactionId[] }
export const FACILITIES: FacilityDef[] = [
  { id: 'spell', ko: '주문학', factions: ['woodland', 'puppet'] },
  { id: 'craft', ko: '공예학', factions: ['minstrel', 'pirate'] },
  { id: 'divine', ko: '신성학', factions: ['starmage', 'puppet'] },
  { id: 'econ', ko: '경제학', factions: ['thieves', 'sage'] },
  { id: 'alchemy', ko: '연금학', factions: ['ghost', 'sage'] },
  { id: 'war', ko: '전략학', factions: ['witch', 'pirate'] },
];
export const researchPointsFor = (r: number) => (r < UNLOCKS.research ? 0 : Math.floor(5 * (r - UNLOCKS.research + 1) ** 1.2)); // GUESS
export const facilityBonus = (rp: number) => (rp > 0 ? 3.5 * rp ** 0.75 : 0); // multiplier add: 350*x^0.75 %
