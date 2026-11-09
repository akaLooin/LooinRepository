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
  { r: 1, ko: '전체 생산 +50%·R, 오프라인 생산 +500%·R, {fcShort} 확률 +R%, {mana} 회복 증가', effect: (m, c) => {
    const x = c.reincarnations; m.global *= 1 + 0.5 * x; m.offline *= 1 + 5 * x; m.fcChance *= 1 + 0.01 * x * 10;
    m.manaRegenAdd += Math.floor(6.25 * (Math.sqrt(1 + 8 * x) - 1)) / 10; } },
  { r: 2, ko: '{gem} 보너스 +0.2%p·R (시작 0.4%p)', effect: (m, c) => { m.gemBonusMult *= 1 + (0.002 * c.reincarnations) / 0.02; } },
  { r: 5, ko: '{assistant} +R, {assistant} 생산 +2%·R', effect: (m, c) => { m.assistantsAdd += c.reincarnations; m.assistantsMult *= 1 + 0.02 * c.reincarnations; } },
  { r: 10, ko: '총 플레이 시간과 R에 따라 전체 생산 증가', effect: (m, c) => { m.global *= 1 + (c.reincarnations ** 1.75 * c.hoursTotal ** 0.65) / 100; } },
  { r: 12, ko: '{mana} 최대치 +35·R', effect: (m, c) => { m.manaMaxAdd += 35 * c.reincarnations; } },
  { r: 20, ko: '같은 건물 1채당 그 건물 생산 +0.01%·R', effect: (m, c) => {
    for (const [id, n] of Object.entries(c.buildings)) if (n) m.building[id] = (m.building[id] ?? 1) * (1 + 0.0001 * c.reincarnations * n); } },
  { r: 25, ko: '{exchange} 보너스 +0.5%p·R', effect: (m, c) => { m.exchangeBonus += 0.005 * c.reincarnations; } },
  { r: 45, ko: '{mana} 최대치 +70·R^1.2', effect: (m, c) => { m.manaMaxAdd += 70 * c.reincarnations ** 1.2; } },
  { r: 100, ko: '{mana} 회복 +1%·R', effect: (m, c) => { m.manaRegenMult *= 1 + 0.01 * c.reincarnations; } },
];
export const UNLOCKS = { challenges: 2, mercenary: 3, bloodline: 7, spiritual: 14, research: 16 };

// ---------------------------------------------------------------- ascension (WIKI)
// At R39, R99, R159, R219 the reincarnation button becomes Ascension. Keeps the reincarnation count,
// opens a new main currency, makes gold upgrades free and shifts every production bonus to a smaller range.
export const ASCENSION = {
  at: [39, 99, 159, 219],
  valueShift: 0.1,          // production multipliers are raised to this power after ascending (WIKI: x^(1/10))
  costGrowth: 1.03,         // building price growth after ascending (WIKI: 1.03^x)
  excavationBase: 1e27 ** 0.75, excavationGrowth: 1.04, // WIKI: 1e27^0.75 * 1.04^x
  gemDivisor: [5e11, 5e11, 5e3, 5e3, 5e26],              // WIKI: [5e3 in A2, 5e26 in A4]; A3 GUESS
};
/** Reincarnation (or ascension) gem requirement. A0: 1e27*1000^R. After: 1e27^(A^0.75)*100^(R-firstR) (WIKI). */
export function reincarnationGems(r: number, a: number): { mant: number; exp10: number } {
  if (a === 0) return { mant: 1, exp10: 27 + 3 * r };
  const first = ASCENSION.at[a - 1] + 1;
  return { mant: 1, exp10: 27 * a ** 0.75 + 2 * Math.max(0, r - first) };
}

// ---------------------------------------------------------------- heritages (WIKI: unlocked by champion trophy, bought with coins each run)
export interface HeritageDef { faction: FactionId; ko: string; desc: string; cost: Partial<Record<CoinType, number>>; effect: Eff }
const V = 5000, N2 = 25000;
export const HERITAGES: HeritageDef[] = [
  { faction: 'woodland', ko: '숲속 친구들의 유산', desc: '1~3단계 건물 1채당 전체 생산 +0.075%', cost: { woodland: V },
    effect: (m, c) => { m.global *= 1 + 0.00075 * ((c.buildings.c1 ?? 0) + (c.buildings.c2 ?? 0) + (c.buildings.c3 ?? 0)); } },
  { faction: 'minstrel', ko: '음유시인의 유산', desc: '{fcShort} 발견 확률 +5%, 확률에 따라 두드리기 보상 증가', cost: { minstrel: V },
    effect: (m, c) => { m.fcChance *= 1.05; m.click *= 1 + (c.fcChance * 100) / 2 / 100; } },
  { faction: 'starmage', ko: '별의 마법사의 유산', desc: '{mana} 회복 +10%', cost: { starmage: V }, effect: (m) => { m.manaRegenMult *= 1.1; } },
  { faction: 'thieves', ko: '도적단의 유산', desc: '보유 {gem} 수에 따라 전체 생산 증가', cost: { thieves: V },
    effect: (m, c) => { m.global *= 1 + Math.floor(7.5 * Math.log10(1 + c.gems)) / 100; } },
  { faction: 'ghost', ko: '유령의 유산', desc: '이번 판 시간에 따라 {assistant} 추가', cost: { ghost: V },
    effect: (m, c) => { m.assistantsAdd += Math.floor(1 + 1.5 * (c.runSeconds / 3600) ** 0.5); } },
  { faction: 'witch', ko: '마녀의 유산', desc: '이야기의 나무 1그루당 전체 생산 +0.3%', cost: { witch: V },
    effect: (m, c) => { m.global *= 1 + 0.003 * c.c11; } },
  { faction: 'pirate', ko: '해적의 유산', desc: '{exchange} 보너스 +15%p', cost: { starmage: N2, thieves: N2 }, effect: (m) => { m.exchangeBonus += 0.15; } },
  { faction: 'sage', ko: '현자의 유산', desc: '건물 15채마다 {mana} 최대치 +1', cost: { minstrel: N2, witch: N2 }, effect: (m, c) => { m.manaMaxAdd += Math.floor(c.ownedTotal / 15); } },
  { faction: 'puppet', ko: '꼭두각시의 유산', desc: '한 판 최대 건물 수에 따라 전체 생산 증가', cost: { woodland: N2, ghost: N2 },
    effect: (m, c) => { m.global *= 1 + (0.25 * c.maxOwned ** 0.75) / 100; } },
];

// ---------------------------------------------------------------- bloodlines (WIKI: R7 + 100 upgrades of that faction in total; free; one per run)
export interface BloodlineDef { faction: FactionId; ko: string; desc: string; effect: Eff; autoclick?: number }
export const BLOODLINES: BloodlineDef[] = [
  { faction: 'woodland', ko: '숲의 혈통', desc: '{assistant} 수에 따라 1~3단계 건물 증가 (250·x^0.9 %)', effect: (m, c) => lowTiers(m, 1 + (2.5 * c.assistants ** 0.9)) },
  { faction: 'minstrel', ko: '노래의 혈통', desc: '이번 판 {fcShort} 수에 따라 발견 확률 증가, 초당 3회 자동 두드리기', autoclick: 3,
    effect: (m, c) => { m.fcChance *= 1 + Math.floor(15 * ln(1 + c.fcFoundRun) ** 1.75) / 100; } },
  { faction: 'starmage', ko: '별의 혈통', desc: '이번 판 시전한 주문 수에 따라 {mana} 회복 증가', effect: (m, c) => { m.manaRegenMult *= 1 + 0.01 * c.spellsRun; } }, // GUESS (original: spell duration)
  { faction: 'thieves', ko: '도둑의 혈통', desc: '건물 가격 증가율 감소 (1.15 → 최소 1.13)', effect: (m) => { m.costMult *= 0.98; } },
  { faction: 'ghost', ko: '망령의 혈통', desc: '환생 횟수에 따라 {assistant} 배율 증가 (8·R^0.8)', effect: (m, c) => { m.assistantsMult *= 1 + Math.floor(8 * c.reincarnations ** 0.8); } },
  { faction: 'witch', ko: '마녀의 혈통', desc: '주문 시전 수가 더 크게 계산됨 (GUESS: 전체 생산 +2%/주문)', effect: (m, c) => { m.global *= 1 + 0.02 * c.spellsRun; } },
  { faction: 'pirate', ko: '바다의 혈통', desc: '{exchange} 횟수에 따라 전체 생산 증가 (15·x^0.85 %)', effect: (m, c) => { m.global *= 1 + (15 * c.exchangesRun ** 0.85) / 100; } },
  { faction: 'sage', ko: '지혜의 혈통', desc: '{mana} 최대치에 따라 {mana} 회복 증가', effect: (m, c) => { m.manaRegenMult *= 1 + (0.03 * c.manaMax ** 0.9) / 100; } },
  { faction: 'puppet', ko: '가면의 혈통', desc: '{mana} 최대치 증가 (GUESS)', effect: (m, c) => { m.manaMaxAdd += Math.floor(30 * Math.log10(1 + c.spellsRun * 1000) ** 3.5); } },
];
export const BLOODLINE_UPGRADES_NEEDED = 100;

// ---------------------------------------------------------------- excavation (WIKI)
/** Every artifact found adds +2% production (GUESS; the original's lore artifacts mostly count toward totals). */
export const ARTIFACT_TOTAL_BONUS = 0.02;
export const ARCHAEOLOGY = { gems: 1e9, cost: 1e29 };     // 100 Oc coins, needs 1B gems
export const excavationCost = (x: number, a = 0) => (a > 0 ? ASCENSION.excavationBase * ASCENSION.excavationGrowth ** x : 1e27 * 1.2 ** x);
export const EXCAVATION_FC_CHANCE = 0.35;
export const excavationCoins = (x: number) => Math.floor(2 * ln(1 + 5e6 * 1.15 ** x) ** 3);
export const rubyAt = (n: number) => 25 * n * (n + 1);    // excavations needed for the n-th ruby

export interface ArtifactDef { id: string; ko: string; desc: string; at?: number; chance?: number; effect?: Eff }
// Our own artifacts (GUESS thresholds). "at" = guaranteed at that excavation count; "chance" = per excavation after 100.
export const ARTIFACTS: ArtifactDef[] = [
  { id: 'a_quill', ko: '부러진 깃펜', desc: '첫 이야기를 쓴 펜. 두드리기 보상 +10%', at: 1, effect: (m) => { m.click *= 1.1; } },
  { id: 'a_map', ko: '찢어진 지도 조각', desc: '{fcShort} 발견 확률 +5%', at: 10, effect: (m) => { m.fcChance *= 1.05; } },
  { id: 'a_key', ko: '녹슨 서고 열쇠', desc: '{mana} 최대치 +100', at: 25, effect: (m) => { m.manaMaxAdd += 100; } },
  { id: 'a_bookmark', ko: '은빛 책갈피', desc: '전체 생산 +10%', at: 50, effect: (m) => { m.global *= 1.1; } },
  { id: 'a_ink', ko: '마르지 않는 잉크병', desc: '{mana} 회복 +0.5', at: 100, effect: (m) => { m.manaRegenAdd += 0.5; } },
  { id: 'a_seal', ko: '왕실 인장', desc: '{exchange} 보너스 +2%p', at: 200, effect: (m) => { m.exchangeBonus += 0.02; } },
  { id: 'a_globe', ko: '작은 세계 지구본', desc: '{assistant} +5', at: 400, effect: (m) => { m.assistantsAdd += 5; } },
  { id: 'a_hourglass', ko: '거꾸로 흐르는 모래시계', desc: '오프라인 생산 x2', at: 800, effect: (m) => { m.offline *= 2; } },
  { id: 'a_feather', ko: '불사조의 깃털', chance: 0.01, desc: '전체 생산 +25%', effect: (m) => { m.global *= 1.25; } },
  { id: 'a_scale', ko: '용의 비늘', chance: 0.008, desc: '{alignLegend} 건물 x2', effect: (m) => { m.align.legend *= 2; } },
  { id: 'a_mirror', ko: '말하는 거울', chance: 0.008, desc: '{alignDark} 건물 x2', effect: (m) => { m.align.dark *= 2; } },
  { id: 'a_slipper', ko: '유리 구두 한 짝', chance: 0.008, desc: '{alignBright} 건물 x2', effect: (m) => { m.align.bright *= 2; } },
  { id: 'a_bean', ko: '마지막 마법 콩', chance: 0.006, desc: '1~3단계 건물 x3', effect: (m) => lowTiers(m, 3) },
  { id: 'a_lamp', ko: '소원 램프', chance: 0.004, desc: '전체 생산 x1.5', effect: (m) => { m.global *= 1.5; } },
  { id: 'a_page', ko: '첫 장의 원본', chance: 0.003, desc: '{gem} 보너스 +10%', effect: (m) => { m.gemBonusMult *= 1.1; } },
  { id: 'a_crown', ko: '이야기 왕의 왕관', chance: 0.002, desc: '전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'l_01', ko: '빛바랜 표지', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 150 },
  { id: 'l_02', ko: '잃어버린 첫 문장', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 250 },
  { id: 'l_03', ko: '고양이 발자국 책갈피', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 300 },
  { id: 'l_04', ko: '마녀의 장보기 목록', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 350 },
  { id: 'l_05', ko: '용의 비늘 한 조각', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 450 },
  { id: 'l_06', ko: '물에 젖은 동화책', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 500 },
  { id: 'l_07', ko: '유리 펜촉', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 600 },
  { id: 'l_08', ko: '먼지 쌓인 지구의', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 700 },
  { id: 'l_09', ko: '은하수 지도', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 900 },
  { id: 'l_10', ko: '반쯤 탄 촛대', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 1000 },
  { id: 'l_11', ko: '말라붙은 잉크병', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 1200 },
  { id: 'l_12', ko: '작은 왕관 장식', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 1500 },
  { id: 'l_13', ko: '부엉이 깃털 펜', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 2000 },
  { id: 'l_14', ko: '금이 간 모래시계', desc: '책 속 오래된 이야기의 흔적. ({artifact} 수 보너스에 더해져요)', at: 3000 },
  { id: 'l_15', ko: '거꾸로 쓰인 편지', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_16', ko: '이름 없는 열쇠', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_17', ko: '달빛 리본', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_18', ko: '요정 날개 비늘', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_19', ko: '멈춘 회중시계', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_20', ko: '해적의 나침반', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_21', ko: '현자의 안경', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_22', ko: '꼭두각시 실타래', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_23', ko: '그림자 극장 표', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_24', ko: '불사조의 재', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.01 },
  { id: 'l_25', ko: '첫 번째 판본', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_26', ko: '마지막 페이지', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_27', ko: '도서관 출입증', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_28', ko: '별사탕 포장지', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_29', ko: '작은 세계수 씨앗', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_30', ko: '비밀 서가 지도', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_31', ko: '오래된 필사본', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_32', ko: '봉인된 두루마리', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_33', ko: '노래하는 조개', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
  { id: 'l_34', ko: '시간의 책갈피', desc: '깊은 곳에서만 드물게 나오는 이야기의 흔적.', chance: 0.005 },
];

// ---------------------------------------------------------------- challenges (structure WIKI: per-faction tiers, met during a run as that faction)
export interface ChallengeDef { id: string; faction: FactionId; tier: number; ko: string; clue: string; minR: number;
  check: (s: ChallengeView) => boolean; reward: string; effect: Eff }
export interface ChallengeView { faction: FactionId | null; runSeconds: number; coinsRun: number; clicksRun: number; spellsRun: number;
  owned: Record<string, number>; ownedTotal: number; upgradesRun: number; assistants: number; fcFoundRun: number; exchangesRun: number }
const fast = (c: ChallengeView, coins: number, sec: number) => c.coinsRun >= coins && c.runSeconds <= sec;
export const CHALLENGES: ChallengeDef[] = [
  { id: 'ch_woodland1', faction: 'woodland', tier: 1, minR: 2, ko: '작은 손의 기적', clue: '작은 친구들은 빠르다. 10분 안에 {coin} 1B를 벌어라.', check: (c) => fast(c, 1e9, 600), reward: '숲속 친구들: 1~3단계 건물 x2', effect: (m) => lowTiers(m, 2) },
  { id: 'ch_woodland2', faction: 'woodland', tier: 2, minR: 2, ko: '숲의 잔치', clue: '{assistant} 40명을 모아라.', check: (c) => c.assistants >= 40, reward: '숲속 친구들: {assistant} +10', effect: (m) => { m.assistantsAdd += 10; } },
  { id: 'ch_minstrel1', faction: 'minstrel', tier: 1, minR: 2, ko: '천 번의 노래', clue: '한 판에 2,000번 두드려라.', check: (c) => c.clicksRun >= 2000, reward: '음유시인: 두드리기 x3', effect: (m) => { m.click *= 3; } },
  { id: 'ch_minstrel2', faction: 'minstrel', tier: 2, minR: 2, ko: '{fcShort} 사냥꾼', clue: '한 판에 {fcShort} 500개를 찾아라.', check: (c) => c.fcFoundRun >= 500, reward: '음유시인: {fcShort} 확률 x1.5', effect: (m) => { m.fcChance *= 1.5; } },
  { id: 'ch_starmage1', faction: 'starmage', tier: 1, minR: 2, ko: '별비', clue: '한 판에 주문을 50번 시전하라.', check: (c) => c.spellsRun >= 50, reward: '별의 마법사: {mana} 회복 +50%', effect: (m) => { m.manaRegenMult *= 1.5; } },
  { id: 'ch_starmage2', faction: 'starmage', tier: 2, minR: 2, ko: '고요한 밤', clue: '주문 없이 {coin} 1T를 벌어라.', check: (c) => c.spellsRun === 0 && c.coinsRun >= 1e12, reward: '별의 마법사: {mana} 최대 +500', effect: (m) => { m.manaMaxAdd += 500; } },
  { id: 'ch_thieves1', faction: 'thieves', tier: 1, minR: 2, ko: '싼값에 사들이기', clue: '건물 1,000채를 모아라.', check: (c) => c.ownedTotal >= 1000, reward: '도적단: 건물 가격 -10%', effect: (m) => { m.costMult *= 0.9; } },
  { id: 'ch_thieves2', faction: 'thieves', tier: 2, minR: 2, ko: '큰 거래', clue: '{exchange}을 30번 맺어라.', check: (c) => c.exchangesRun >= 30, reward: '도적단: {exchange} +3%p', effect: (m) => { m.exchangeBonus += 0.03; } },
  { id: 'ch_ghost1', faction: 'ghost', tier: 1, minR: 2, ko: '긴 밤', clue: '한 판을 6시간 이상 이어가라.', check: (c) => c.runSeconds >= 6 * 3600, reward: '유령: 오프라인 생산 x3', effect: (m) => { m.offline *= 3; } },
  { id: 'ch_ghost2', faction: 'ghost', tier: 2, minR: 2, ko: '손대지 않은 책', clue: '두드리지 않고 {coin} 1T를 벌어라.', check: (c) => c.clicksRun === 0 && c.coinsRun >= 1e12, reward: '유령: {assistant} 생산 x2', effect: (m) => { m.assistantsMult *= 2; } },
  { id: 'ch_witch1', faction: 'witch', tier: 1, minR: 2, ko: '높은 탑', clue: '끝없는 밤의 탑을 50채 지어라.', check: (c) => (c.owned.d10 ?? 0) >= 50, reward: '마녀: 8~10단계 x2', effect: (m) => { m.tier[8] *= 2; m.tier[9] *= 2; m.tier[10] *= 2; } },
  { id: 'ch_witch2', faction: 'witch', tier: 2, minR: 2, ko: '빈 서랍', clue: '개선을 20개 이하로 사고 {coin} 1Qa를 벌어라.', check: (c) => c.upgradesRun <= 20 && c.coinsRun >= 1e15, reward: '마녀: 전체 생산 x1.5', effect: (m) => { m.global *= 1.5; } },
  { id: 'ch_pirate1', faction: 'pirate', tier: 1, minR: 4, ko: '보물섬', clue: '한 판에 {fcShort} 2,000개를 찾아라.', check: (c) => c.fcFoundRun >= 2000, reward: '해적: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_sage1', faction: 'sage', tier: 1, minR: 4, ko: '완벽한 균형', clue: '모든 건물을 같은 수(100채 이상)로 맞춰라.', check: (c) => { const v = Object.values(c.owned).filter((x) => x > 0); return v.length >= 11 && Math.min(...v) >= 100 && Math.min(...v) === Math.max(...v); }, reward: '현자: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_puppet1', faction: 'puppet', tier: 1, minR: 4, ko: '하루 공연', clue: '한 판을 24시간 이상 이어가라.', check: (c) => c.runSeconds >= 24 * 3600, reward: '꼭두각시: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  // tier 3 of the vanilla factions
  { id: 'ch_woodland3', faction: 'woodland', tier: 3, minR: 6, ko: '숲 전체의 잔치', clue: '1~3단계 건물을 각각 500채 이상 지어라.', check: (c) => (c.owned.c1 ?? 0) >= 500 && (c.owned.c2 ?? 0) >= 500 && (c.owned.c3 ?? 0) >= 500, reward: '숲속 친구들: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_minstrel3', faction: 'minstrel', tier: 3, minR: 6, ko: '만 번의 박수', clue: '한 판에 10,000번 두드려라.', check: (c) => c.clicksRun >= 10000, reward: '음유시인: 두드리기 x5', effect: (m) => { m.click *= 5; } },
  { id: 'ch_starmage3', faction: 'starmage', tier: 3, minR: 6, ko: '천 개의 별', clue: '한 판에 주문을 300번 시전하라.', check: (c) => c.spellsRun >= 300, reward: '별의 마법사: {mana} 회복 x2', effect: (m) => { m.manaRegenMult *= 2; } },
  { id: 'ch_thieves3', faction: 'thieves', tier: 3, minR: 6, ko: '왕실 금고', clue: '{exchange}을 100번 맺어라.', check: (c) => c.exchangesRun >= 100, reward: '도적단: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_ghost3', faction: 'ghost', tier: 3, minR: 6, ko: '사흘 밤', clue: '한 판을 72시간 이상 이어가라.', check: (c) => c.runSeconds >= 72 * 3600, reward: '유령: {assistant} 생산 x3', effect: (m) => { m.assistantsMult *= 3; } },
  { id: 'ch_witch3', faction: 'witch', tier: 3, minR: 6, ko: '백 개의 탑', clue: '끝없는 밤의 탑을 100채 지어라.', check: (c) => (c.owned.d10 ?? 0) >= 100, reward: '마녀: 8~10단계 x3', effect: (m) => { m.tier[8] *= 3; m.tier[9] *= 3; m.tier[10] *= 3; } },
  // neutral tiers 2-4
  { id: 'ch_pirate2', faction: 'pirate', tier: 2, minR: 8, ko: '폭풍 속 항해', clue: '한 판에 주문을 100번 시전하라.', check: (c) => c.spellsRun >= 100, reward: '해적: {fcShort} 확률 x2', effect: (m) => { m.fcChance *= 2; } },
  { id: 'ch_pirate3', faction: 'pirate', tier: 3, minR: 12, ko: '전설의 보물', clue: '용의 보물고를 300채 지어라.', check: (c) => (c.owned.l9 ?? 0) >= 300, reward: '해적: 옛 전설 건물 x3', effect: (m) => { m.align.legend *= 3; } },
  { id: 'ch_pirate4', faction: 'pirate', tier: 4, minR: 16, ko: '일곱 바다의 왕', clue: '한 판에 {fcShort} 20,000개를 찾아라.', check: (c) => c.fcFoundRun >= 20000, reward: '해적: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  { id: 'ch_sage2', faction: 'sage', tier: 2, minR: 8, ko: '느린 사색', clue: '두드리지 않고 금화 1Sx를 벌어라.', check: (c) => c.clicksRun === 0 && c.coinsRun >= 1e21, reward: '현자: {mana} 회복 x2', effect: (m) => { m.manaRegenMult *= 2; } },
  { id: 'ch_sage3', faction: 'sage', tier: 3, minR: 12, ko: '천 채의 조화', clue: '건물 3,000채를 모아라.', check: (c) => c.ownedTotal >= 3000, reward: '현자: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_sage4', faction: 'sage', tier: 4, minR: 16, ko: '현자의 침묵', clue: '주문 없이 금화 1Oc를 벌어라.', check: (c) => c.spellsRun === 0 && c.coinsRun >= 1e27, reward: '현자: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  { id: 'ch_puppet2', faction: 'puppet', tier: 2, minR: 8, ko: '무대 인사', clue: '{assistant} 100명을 모아라.', check: (c) => c.assistants >= 100, reward: '꼭두각시: {assistant} +20', effect: (m) => { m.assistantsAdd += 20; } },
  { id: 'ch_puppet3', faction: 'puppet', tier: 3, minR: 12, ko: '일주일 공연', clue: '한 판을 7일 이상 이어가라.', check: (c) => c.runSeconds >= 7 * 86400, reward: '꼭두각시: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_puppet4', faction: 'puppet', tier: 4, minR: 16, ko: '끝나지 않는 막', clue: '개선 30개 이하로 금화 1No를 벌어라.', check: (c) => c.upgradesRun <= 30 && c.coinsRun >= 1e30, reward: '꼭두각시: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  // prestige factions (played on top of a base faction)
  { id: 'ch_clockmaker1', faction: 'clockmaker', tier: 1, minR: 10, ko: '첫 톱니', clue: '시계장인과 함께 금화 1Qad를 벌어라.', check: (c) => c.coinsRun >= 1e45, reward: '시계장인: 두드리기 x3', effect: (m) => { m.click *= 3; } },
  { id: 'ch_clockmaker2', faction: 'clockmaker', tier: 2, minR: 14, ko: '정밀한 하루', clue: '한 판에 15,000번 두드려라.', check: (c) => c.clicksRun >= 15000, reward: '시계장인: {fcShort} 확률 x2', effect: (m) => { m.fcChance *= 2; } },
  { id: 'ch_clockmaker3', faction: 'clockmaker', tier: 3, minR: 20, ko: '거대한 시계탑', clue: '건물 5,000채를 모아라.', check: (c) => c.ownedTotal >= 5000, reward: '시계장인: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_clockmaker4', faction: 'clockmaker', tier: 4, minR: 27, ko: '영원의 태엽', clue: '한 판을 48시간 이상 이어가라.', check: (c) => c.runSeconds >= 48 * 3600, reward: '시계장인: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  { id: 'ch_shadow1', faction: 'shadow', tier: 1, minR: 10, ko: '첫 연습', clue: '그림자 극단과 함께 주문을 100번 시전하라.', check: (c) => c.spellsRun >= 100, reward: '그림자 극단: 전체 생산 x2', effect: (m) => { m.global *= 2; } },
  { id: 'ch_shadow2', faction: 'shadow', tier: 2, minR: 14, ko: '완벽한 연속 공연', clue: '{exchange}을 200번 맺어라.', check: (c) => c.exchangesRun >= 200, reward: '그림자 극단: {exchange} +5%p', effect: (m) => { m.exchangeBonus += 0.05; } },
  { id: 'ch_shadow3', faction: 'shadow', tier: 3, minR: 20, ko: '어둠 속의 무대', clue: '두드리지 않고 금화 1Qid를 벌어라.', check: (c) => c.clicksRun === 0 && c.coinsRun >= 1e48, reward: '그림자 극단: {assistant} 생산 x3', effect: (m) => { m.assistantsMult *= 3; } },
  { id: 'ch_shadow4', faction: 'shadow', tier: 4, minR: 27, ko: '천 번의 커튼콜', clue: '한 판에 주문을 1,000번 시전하라.', check: (c) => c.spellsRun >= 1000, reward: '그림자 극단: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  { id: 'ch_phoenix1', faction: 'phoenix', tier: 1, minR: 46, ko: '첫 불꽃', clue: '불사조와 함께 금화 1e70을 벌어라.', check: (c) => c.coinsRun >= 1e70, reward: '불사조: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  { id: 'ch_phoenix2', faction: 'phoenix', tier: 2, minR: 50, ko: '다시 태어나는 날개', clue: '한 판을 24시간 이상 이어가라.', check: (c) => c.runSeconds >= 24 * 3600, reward: '불사조: {assistant} 생산 x3', effect: (m) => { m.assistantsMult *= 3; } },
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
export const researchPointsFor = (r: number) => (r < UNLOCKS.research ? 0 : (r * (r + 1)) / 2); // WIKI: R(R+1)/2 (136 at R16)
export const RESEARCH_POINT_CAP = 5000; // WIKI: per facility
export const researchSlots = (r: number) => (r < UNLOCKS.research ? 0 : 4 + (r >= 20 ? 1 : 0) + (r >= 29 ? 1 : 0)); // WIKI: 4 default, +1 around R17-20, prestige +R29
export const facilityBonus = (rp: number) => (rp > 0 ? 3.5 * rp ** 0.75 : 0); // multiplier add: 350*x^0.75 %

// Research upgrades: unlock at facility RP thresholds (WIKI thresholds), placed into limited slots per facility.
export interface ResearchUpgradeDef { id: string; facility: string; rp: number; ko: string; desc: string; effect: Eff }
const RT = [1, 10, 30, 50, 105, 135];
type RU = [string, string, Eff];
const ru = (facility: string, rows: RU[]): ResearchUpgradeDef[] => rows.map(([ko, desc, effect], i) => ({ id: `r_${facility}${i + 1}`, facility, rp: RT[i], ko, desc, effect }));
export const RESEARCH_UPGRADES: ResearchUpgradeDef[] = [
  ...ru('spell', [
    ['마력 엮기', '이번 판 시전한 주문 수에 따라 1~3단계 건물 증가', (m, c) => lowTiers(m, 1 + 0.02 * c.spellsRun)],
    ['고요한 서재', '이번 판 시간에 따라 {mana} 최대치 증가', (m, c) => { m.manaMaxAdd += Math.floor(45 * (c.runSeconds / 3600)); }],
    ['주문 각인', '{mana} 회복 +25%', (m) => { m.manaRegenMult *= 1.25; }],
    ['마력의 숨', '{mana} 최대치에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + (2 * (c.manaMax ?? 1000) ** 0.8) / 100; }],
    ['차가운 마법진', '{mana} 회복 x2', (m) => { m.manaRegenMult *= 2; }],
    ['울림', '주문 수에 따라 전체 생산 증가 (강화)', (m, c) => { m.global *= 1 + 0.05 * c.spellsRun; }],
  ]),
  ...ru('craft', [
    ['장인의 손', '두드리기 보상 x2', (m) => { m.click *= 2; }],
    ['단단한 망치', '건물 수에 따라 두드리기 보상 증가', (m, c) => { m.click *= 1 + (0.5 * c.ownedTotal ** 0.65) / 100; }],
    ['정밀 도구', '건물 가격 -5%', (m) => { m.costMult *= 0.95; }],
    ['명품 공방', '전체 두드리기 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + 0.01 * ln(1 + c.clicksTotal) ** 2; }],
    ['자동 망치', '{assistant} +15', (m) => { m.assistantsAdd += 15; }],
    ['걸작', '전체 생산 x2', (m) => { m.global *= 2; }],
  ]),
  ...ru('divine', [
    ['축복받은 책장', '{gem} 보너스 +10%', (m) => { m.gemBonusMult *= 1.1; }],
    ['빛의 문장', '두드리기 x3', (m) => { m.click *= 3; }],
    ['천상의 합창', '{mana} 회복 +1', (m) => { m.manaRegenAdd += 1; }],
    ['성스러운 인장', '{trophy} 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + 0.02 * c.trophies; }],
    ['신의 손길', '{gem} 보너스 +25%', (m) => { m.gemBonusMult *= 1.25; }],
    ['영원의 빛', '전체 생산 x2', (m) => { m.global *= 2; }],
  ]),
  ...ru('econ', [
    ['복리', '보유 {gem}에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + Math.log10(1 + c.gems) * 0.05; }],
    ['도매 거래', '건물 가격 -5%', (m) => { m.costMult *= 0.95; }],
    ['시간은 금', '이번 판 시간에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + (c.runSeconds / 3600) ** 0.6; }],
    ['계약 전문가', '{exchange} 보너스 +2%p', (m) => { m.exchangeBonus += 0.02; }],
    ['투자 조합', '건물 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + 0.0005 * c.ownedTotal; }],
    ['황금 시대', '전체 생산 x2', (m) => { m.global *= 2; }],
  ]),
  ...ru('alchemy', [
    ['약초 증류', '{assistant} 생산 x1.5', (m) => { m.assistantsMult *= 1.5; }],
    ['현자의 물약', '{assistant} 수에 따라 {mana} 회복 증가', (m, c) => { m.manaRegenAdd += Math.floor(13 * c.assistants ** 0.6) / 10; }],
    ['연금 용광로', '8~10단계 건물 x2', (m) => { m.tier[8] *= 2; m.tier[9] *= 2; m.tier[10] *= 2; }],
    ['변환의 원', '이번 판 {fcShort} 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + 0.02 * ln(1 + c.fcFoundRun) ** 2; }],
    ['영약', '{assistant} +20', (m) => { m.assistantsAdd += 20; }],
    ['황금 변환', '전체 생산 x2', (m) => { m.global *= 2; }],
  ]),
  ...ru('war', [
    ['행군', '건물 수에 따라 전체 생산 증가', (m, c) => { m.global *= 1 + 0.001 * c.ownedTotal; }],
    ['전략 회의', '{exchange} 보너스 +2%p', (m) => { m.exchangeBonus += 0.02; }],
    ['포위', '어두운 건물·옛 전설 건물 x2', (m) => { m.align.dark *= 2; m.align.legend *= 2; }],
    ['정찰', '{fcShort} 발견 확률 x1.5', (m) => { m.fcChance *= 1.5; }],
    ['총공격', '9~10단계 건물 x3', (m) => { m.tier[9] *= 3; m.tier[10] *= 3; }],
    ['승전보', '전체 생산 x2', (m) => { m.global *= 2; }],
  ]),
];
