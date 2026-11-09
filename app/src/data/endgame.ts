// Late-game systems, structured like the original (replica/recon.md): reincarnation power,
// heritages, bloodlines, excavation & artifacts, challenges, research.
// Formulas marked WIKI follow the original's wiki; names/text are our own. GUESS = unverified.
import type { CoinType, FactionId } from './types';
import { type Ctx, type Mods, ln, lowTiers } from '../engine/mods';

export interface EndCtx extends Ctx {
  reincarnations: number; excavations: number; artifacts: number; hoursTotal: number; maxOwned: number;
  fcChance: number; manaMax: number; exchangesRun: number; c11: number; uniques: string[];
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
  // prestige bloodlines (WIKI formulas)
  { faction: 'clockmaker', ko: '태엽의 혈통', desc: '{excavation} 깊이에 따라 전체 생산 증가 (10·x^0.8 %)', effect: (m, c) => { m.global *= 1 + (10 * c.excavations ** 0.8) / 100; } },
  { faction: 'shadow', ko: '그림자의 혈통', desc: '이번 판 시간에 따라 {fcShort} 발견 확률 배율 증가', effect: (m, c) => { m.fcChance *= 1 + (1.6 * c.runSeconds ** 0.6) / 100; } },
  { faction: 'phoenix', ko: '불꽃의 혈통', desc: '{fcShort} 발견 확률에 따라 전체 생산 증가 (4·x^0.4)', effect: (m, c) => { m.global *= 1 + 4 * (c.fcChance * 100) ** 0.4 / 100; } },
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
  { id: 'l_35', ko: '낡은 책갈피', desc: '이야기 깊은 곳에서 나온 흔적.', at: 4000 },
  { id: 'l_36', ko: '빛나는 왕관', desc: '이야기 깊은 곳에서 나온 흔적.', at: 4500 },
  { id: 'l_37', ko: '속삭이는 인형', desc: '이야기 깊은 곳에서 나온 흔적.', at: 5000 },
  { id: 'l_38', ko: '잠든 거울', desc: '이야기 깊은 곳에서 나온 흔적.', at: 5500 },
  { id: 'l_39', ko: '부서진 지도', desc: '이야기 깊은 곳에서 나온 흔적.', at: 6000 },
  { id: 'l_40', ko: '은빛 촛대', desc: '이야기 깊은 곳에서 나온 흔적.', at: 6500 },
  { id: 'l_41', ko: '황금빛 깃펜', desc: '이야기 깊은 곳에서 나온 흔적.', at: 7000 },
  { id: 'l_42', ko: '잊힌 종', desc: '이야기 깊은 곳에서 나온 흔적.', at: 7500 },
  { id: 'l_43', ko: '작은 두루마리', desc: '이야기 깊은 곳에서 나온 흔적.', at: 8000 },
  { id: 'l_44', ko: '거대한 조개', desc: '이야기 깊은 곳에서 나온 흔적.', at: 8500 },
  { id: 'l_45', ko: '투명한 열쇠', desc: '이야기 깊은 곳에서 나온 흔적.', at: 9000 },
  { id: 'l_46', ko: '노래하는 등불', desc: '이야기 깊은 곳에서 나온 흔적.', at: 9500 },
  { id: 'l_47', ko: '차가운 책갈피', desc: '이야기 깊은 곳에서 나온 흔적.', at: 10000 },
  { id: 'l_48', ko: '따뜻한 왕관', desc: '이야기 깊은 곳에서 나온 흔적.', at: 10500 },
  { id: 'l_49', ko: '낡은 인형', desc: '이야기 깊은 곳에서 나온 흔적.', at: 11000 },
  { id: 'l_50', ko: '빛나는 거울', desc: '이야기 깊은 곳에서 나온 흔적.', at: 11500 },
  { id: 'l_51', ko: '속삭이는 지도', desc: '이야기 깊은 곳에서 나온 흔적.', at: 12000 },
  { id: 'l_52', ko: '잠든 촛대', desc: '이야기 깊은 곳에서 나온 흔적.', at: 12500 },
  { id: 'l_53', ko: '부서진 깃펜', desc: '이야기 깊은 곳에서 나온 흔적.', at: 13000 },
  { id: 'l_54', ko: '은빛 종', desc: '이야기 깊은 곳에서 나온 흔적.', at: 13500 },
  { id: 'l_55', ko: '황금빛 두루마리', desc: '이야기 깊은 곳에서 나온 흔적.', at: 14000 },
  { id: 'l_56', ko: '잊힌 조개', desc: '이야기 깊은 곳에서 나온 흔적.', at: 14500 },
  { id: 'l_57', ko: '작은 열쇠', desc: '이야기 깊은 곳에서 나온 흔적.', at: 15000 },
  { id: 'l_58', ko: '거대한 등불', desc: '이야기 깊은 곳에서 나온 흔적.', at: 15500 },
  { id: 'l_59', ko: '투명한 책갈피', desc: '이야기 깊은 곳에서 나온 흔적.', at: 16000 },
  { id: 'l_60', ko: '노래하는 왕관', desc: '이야기 깊은 곳에서 나온 흔적.', at: 16500 },
  { id: 'l_61', ko: '차가운 인형', desc: '이야기 깊은 곳에서 나온 흔적.', at: 17000 },
  { id: 'l_62', ko: '따뜻한 거울', desc: '이야기 깊은 곳에서 나온 흔적.', at: 17500 },
  { id: 'l_63', ko: '낡은 지도', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_64', ko: '빛나는 촛대', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_65', ko: '속삭이는 깃펜', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_66', ko: '잠든 종', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_67', ko: '부서진 두루마리', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_68', ko: '은빛 조개', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_69', ko: '황금빛 열쇠', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_70', ko: '잊힌 등불', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_71', ko: '작은 책갈피', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_72', ko: '거대한 왕관', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_73', ko: '투명한 인형', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_74', ko: '노래하는 거울', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_75', ko: '차가운 지도', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_76', ko: '따뜻한 촛대', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_77', ko: '낡은 깃펜', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_78', ko: '빛나는 종', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_79', ko: '속삭이는 두루마리', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_80', ko: '잠든 조개', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_81', ko: '부서진 열쇠', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_82', ko: '은빛 등불', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_83', ko: '황금빛 책갈피', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_84', ko: '잊힌 왕관', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_85', ko: '작은 인형', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_86', ko: '거대한 거울', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_87', ko: '투명한 지도', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_88', ko: '노래하는 촛대', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_89', ko: '차가운 깃펜', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
  { id: 'l_90', ko: '따뜻한 종', desc: '아주 드물게 나오는 흔적.', chance: 0.003 },
];

// ---------------------------------------------------------------- challenges (structure WIKI: per-faction tiers, met during a run as that faction)
export interface ChallengeDef { id: string; faction: FactionId; tier: number; ko: string; clue: string; minR: number;
  check: (s: ChallengeView) => boolean; reward: string; effect: Eff }
export interface ChallengeView { faction: FactionId | null; runSeconds: number; coinsRun: number; clicksRun: number; spellsRun: number;
  owned: Record<string, number>; ownedTotal: number; upgradesRun: number; assistants: number; fcFoundRun: number; exchangesRun: number; excavations?: number }
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
  { id: 'ch_clockmaker5', faction: 'clockmaker', tier: 5, minR: 33, ko: '천 번의 발굴', clue: '{excavation} 깊이 1,000을 넘겨라.', check: (c) => (c.excavations ?? 0) >= 1000, reward: '시계장인: 전체 생산 x4', effect: (m) => { m.global *= 4; } },
  { id: 'ch_shadow5', faction: 'shadow', tier: 5, minR: 33, ko: '침묵의 연출', clue: '두드리지 않고 주문 500번을 시전하라.', check: (c) => c.clicksRun === 0 && c.spellsRun >= 500, reward: '그림자 극단: 전체 생산 x4', effect: (m) => { m.global *= 4; } },
  { id: 'ch_phoenix3', faction: 'phoenix', tier: 3, minR: 55, ko: '다섯 숨결', clue: '한 판에 주문을 500번 시전하라.', check: (c) => c.spellsRun >= 500, reward: '불사조: 전체 생산 x3', effect: (m) => { m.global *= 3; } },
  { id: 'ch_phoenix4', faction: 'phoenix', tier: 4, minR: 65, ko: '재 속의 왕국', clue: '건물 10,000채를 모아라.', check: (c) => c.ownedTotal >= 10000, reward: '불사조: {assistant} 생산 x3', effect: (m) => { m.assistantsMult *= 3; } },
  { id: 'ch_phoenix5', faction: 'phoenix', tier: 5, minR: 75, ko: '끝없는 비상', clue: '한 판을 5일 이상 이어가라.', check: (c) => c.runSeconds >= 5 * 86400, reward: '불사조: 전체 생산 x4', effect: (m) => { m.global *= 4; } },
  { id: 'ch_phoenix6', faction: 'phoenix', tier: 6, minR: 90, ko: '태양을 삼킨 새', clue: '{exchange}을 1,000번 맺어라.', check: (c) => c.exchangesRun >= 1000, reward: '불사조: 전체 생산 x5', effect: (m) => { m.global *= 5; } },
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
/** WIKI: each research point costs coins 1e126*1.5^x (after ascension 1e42*1.147^(x-780)) and (x+1)^3 faction coins; x = points already in the facility. */
export const RESEARCH_COST = { base: 1e126, growth: 1.5, ascBase: 1e42, ascGrowth: 1.147, ascOffset: 780, fcPower: 3 };
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

// ---------------------------------------------------------------- unique buildings (WIKI: one building per faction, R16 vanilla / R22 neutral / R28 prestige / R46 dragon / R75 mercenary)
// Leges (A2, R100+) give each faction a second one. Requirement counts and the x10 production are GUESS.
export interface UniqueDef { id: string; faction: FactionId; building: string; ko: string; minR: number; need: number; lex?: boolean; buildingByAlign?: Record<string, string> }
export const UNIQUE_MULT = 10;
export const UNIQUES: UniqueDef[] = [
  { id: 'uq_woodland', faction: 'woodland', building: 'c1', ko: '요정의 꽃밭', minR: 16, need: 1500 },
  { id: 'uq_minstrel', faction: 'minstrel', building: 'b4', ko: '노래하는 콩나무', minR: 16, need: 1500 },
  { id: 'uq_starmage', faction: 'starmage', building: 'b10', ko: '별이 열리는 정원', minR: 16, need: 1500 },
  { id: 'uq_thieves', faction: 'thieves', building: 'd6', ko: '도적단의 금고', minR: 16, need: 1500 },
  { id: 'uq_ghost', faction: 'ghost', building: 'd8', ko: '잠들지 않는 미궁', minR: 16, need: 1500 },
  { id: 'uq_witch', faction: 'witch', building: 'd10', ko: '영원한 밤의 왕좌', minR: 16, need: 1500 },
  { id: 'uq_pirate', faction: 'pirate', building: 'c11', ko: '해적왕의 책나무', minR: 22, need: 500 },
  { id: 'uq_sage', faction: 'sage', building: 'l5', ko: '돌의 원', minR: 22, need: 1500 },
  { id: 'uq_puppet', faction: 'puppet', building: 'l8', ko: '가라앉은 무대', minR: 22, need: 1500 },
  { id: 'uq_clockmaker', faction: 'clockmaker', building: 'c3', ko: '태엽 대장간', minR: 28, need: 2000 },
  { id: 'uq_shadow', faction: 'shadow', building: 'd7', ko: '그림자 선착장', minR: 28, need: 1500 },
  { id: 'uq_phoenix', faction: 'phoenix', building: 'l9', ko: '불사조의 둥지', minR: 46, need: 1500 },
  { id: 'uq_freelancer', faction: 'freelancer', building: 'b5', ko: '작가들의 막사', minR: 75, need: 1500, buildingByAlign: { bright: 'b5', dark: 'd9', legend: 'l6' } },
  // second unique buildings with the Leges proofs (R100+)
  { id: 'uq2_starmage', faction: 'starmage', building: 'b7', ko: '구름 위 성당', minR: 100, need: 2000, lex: true },
  { id: 'uq2_woodland', faction: 'woodland', building: 'b6', ko: '날개 달린 도서관', minR: 100, need: 2000, lex: true },
  { id: 'uq2_minstrel', faction: 'minstrel', building: 'b8', ko: '나무 위 유리 성', minR: 100, need: 2000, lex: true },
  { id: 'uq2_ghost', faction: 'ghost', building: 'd5', ko: '살아 있는 숲', minR: 100, need: 2000, lex: true },
  { id: 'uq2_witch', faction: 'witch', building: 'c11', ko: '저주받은 책나무', minR: 100, need: 1000, lex: true },
  { id: 'uq2_thieves', faction: 'thieves', building: 'd4', ko: '검은 물레방아 시장', minR: 100, need: 2000, lex: true },
  { id: 'uq2_pirate', faction: 'pirate', building: 'l4', ko: '산속 궁전', minR: 100, need: 2000, lex: true },
  { id: 'uq2_puppet', faction: 'puppet', building: 'l7', ko: '금지된 서고', minR: 100, need: 2000, lex: true },
  { id: 'uq2_sage', faction: 'sage', building: 'l10', ko: '지구라트 석상', minR: 100, need: 2000, lex: true },
];

// ---------------------------------------------------------------- Leges (WIKI: A2 / R100, extra alignment on top of the main one, proof 1Qa)
export type Lex = 'order' | 'chaos' | 'balance';
export interface LexDef { id: Lex; ko: string; desc: string; cost: number; factions: FactionId[]; color: string; icon: string }
export const LEGES: LexDef[] = [
  { id: 'order', ko: '정석의 증표', desc: '잘 짜인 계획으로 왕국을 다스려요. 별의 마법사·유령·해적과 함께해요.', cost: 1e15, factions: ['starmage', 'ghost', 'pirate'], color: '#d8c070', icon: 'hourglass' },
  { id: 'chaos', ko: '반전의 증표', desc: '예측할 수 없는 운명의 폭발에 몸을 맡겨요. 숲속 친구들·마녀·꼭두각시와 함께해요.', cost: 1e15, factions: ['woodland', 'witch', 'puppet'], color: '#c05ac8', icon: 'mask' },
  { id: 'balance', ko: '균형의 증표', desc: '얻을 수 있는 모든 것을 고루 살려요. 음유시인·도적단·현자와 함께해요.', cost: 1e15, factions: ['minstrel', 'thieves', 'sage'], color: '#6ac0a0', icon: 'owl' },
];
export const LEGES_MIN_R = 100;

// ---------------------------------------------------------------- spell tiers (WIKI: after the first ascension, tiers 2-6, tier 7 after A2)
export const SPELL_TIERS = {
  maxTier: (a: number) => (a >= 2 ? 7 : a >= 1 ? 6 : 1),
  /** seconds of total active time needed to unlock tier n+1 (WIKI formula, without Arcane Brilliance) */
  /** WIKI: 43200*((n-0.5A)^2-(n-0.5A))*0.98^(R-(n-0.5(A+1))-42), A = Arcane Brilliance trophies */
  unlockSeconds: (n: number, r: number, a = 0) => { const m = n - 0.5 * a; return Math.max(0, 43200 * (m * m - m) * 0.98 ** (r - (n - 0.5 * (a + 1)) - 42)); },
  tieredAutocast: { cost: 1e33, mana: 2e8 },   // WIKI: 200M mana produced unlocks Tiered Autocasting (cost GUESS)
  coinBase: { call: 5.1e52, surge: 6.6e67, alignment: 5.4e55, faction: 5.4e55, lex: 5.4e55 } as Record<string, number>,
  fcBase: { call: 0, surge: 1e13, alignment: 1e9, faction: 1e9, lex: 1e9 } as Record<string, number>,
  coins: (x: number, k: number) => (k >= 7 ? 0 : x ** (1 + 0.25 * (k - 2))),     // WIKI: x^(1+0.25(n-1)); tier 7 free
  fc: (y: number, k: number) => (y ? y ** (1 + 0.15 * (k - 2)) : 0),               // WIKI: x^(1+0.15(n-1))
};

// ---------------------------------------------------------------- lineages (WIKI: R60+, levels bought with faction coins 2.5e(15+L), kept forever)
export interface LineageDef { faction: FactionId; ko: string; perLevel: string; level: (m: Mods, L: number) => void }
export const LINEAGE = { minR: 60, exchangesNeeded: 400, cost: (level: number) => 2.5 * 10 ** (15 + level), perk1: 5, fc100: 10, spell: 15, perk3: 20, perk4: 30 };
export const LINEAGES: LineageDef[] = [
  { faction: 'woodland', ko: '숲의 계보', perLevel: '1~3단계 건물 +18%/레벨', level: (m, L) => lowTiers(m, 1 + 0.18 * L) },
  { faction: 'minstrel', ko: '노래의 계보', perLevel: '두드리기 +20%/레벨', level: (m, L) => { m.click *= 1 + 0.2 * L; } },
  { faction: 'starmage', ko: '별의 계보', perLevel: '{mana} 회복 +5%/레벨', level: (m, L) => { m.manaRegenMult *= 1 + 0.05 * L; } },
  { faction: 'thieves', ko: '도둑의 계보', perLevel: '건물 가격 -1%/레벨', level: (m, L) => { m.costMult *= 0.99 ** L; } },
  { faction: 'ghost', ko: '망령의 계보', perLevel: '{assistant} 생산 +10%/레벨', level: (m, L) => { m.assistantsMult *= 1 + 0.1 * L; } },
  { faction: 'witch', ko: '마녀의 계보', perLevel: '9·10단계 건물 +20%/레벨', level: (m, L) => { m.tier[9] *= 1 + 0.2 * L; m.tier[10] *= 1 + 0.2 * L; } },
  { faction: 'pirate', ko: '바다의 계보', perLevel: '{exchange} 보너스 +0.5%p/레벨', level: (m, L) => { m.exchangeBonus += 0.005 * L; } },
  { faction: 'sage', ko: '지혜의 계보', perLevel: '{mana} 최대치 +2%/레벨', level: (m, L) => { m.manaMaxAdd += 20 * L; } },
  { faction: 'puppet', ko: '가면의 계보', perLevel: '전체 생산 +5%/레벨', level: (m, L) => { m.global *= 1 + 0.05 * L; } },
  { faction: 'clockmaker', ko: '태엽의 계보', perLevel: '두드리기 +15%/레벨', level: (m, L) => { m.click *= 1 + 0.15 * L; } },
  { faction: 'shadow', ko: '그림자의 계보', perLevel: '전체 생산 +5%/레벨', level: (m, L) => { m.global *= 1 + 0.05 * L; } },
  { faction: 'phoenix', ko: '불꽃의 계보', perLevel: '전체 생산 +7%/레벨', level: (m, L) => { m.global *= 1 + 0.07 * L; } },
];

// ---------------------------------------------------------------- faction unions (WIKI: after A2, needs the faction's Leges proof and its Leges unique building)
export interface UnionDef { faction: FactionId; ko: string; desc: string; building: string; effect: (m: Mods, c: EndCtx, x: number) => void }
export const UNION = { fcCost: 1e18, coinCost: 1e60 };   // WIKI: union 1 Qi of the faction's coins, upgrade 1 Nod coins
export const UNIONS: UnionDef[] = [
  { faction: 'woodland', ko: '거품 무리', building: 'b6', desc: '날개 달린 도서관 수에 따라 {mana} 최대치 증가 (100·x^0.45)', effect: (m, _c, x) => { m.manaMaxAdd += 100 * x ** 0.45; } },
  { faction: 'minstrel', ko: '나무 주사위', building: 'b8', desc: '나무 위 유리 성 수에 따라 생산(6·x^0.6 %)과 {fcShort} 확률(x^0.7 %) 증가', effect: (m, _c, x) => { m.global *= 1 + (6 * x ** 0.6) / 100; m.fcChance *= 1 + x ** 0.7 / 100; } },
  { faction: 'starmage', ko: '천사의 인내', building: 'b7', desc: '구름 위 성당 수에 따라 주문 배율 증가 (0.6·x^0.6)', effect: (m, _c, x) => { m.global *= 1 + (0.6 * x ** 0.6) / 100; } },
  { faction: 'thieves', ko: '검은 시장', building: 'd4', desc: '검은 물레방아 시장 수에 따라 {gem} 보너스 증가 (x^0.5 %)', effect: (m, _c, x) => { m.gemBonusMult *= 1 + x ** 0.5 / 100; } },
  { faction: 'ghost', ko: '살아 있는 하인', building: 'd5', desc: '살아 있는 숲 수에 따라 {assistant} 증가 (1.2·x^0.65)', effect: (m, _c, x) => { m.assistantsAdd += Math.floor(1.2 * x ** 0.65); } },
  { faction: 'witch', ko: '심연의 화로', building: 'c11', desc: '책나무 수에 따라 모든 건물 증가, 높은 단계일수록 더 큼 (t²·x^0.5 %)', effect: (m, _c, x) => { for (let t = 1; t <= 11; t++) m.tier[t] *= 1 + (t * t * x ** 0.5) / 100; } },
  { faction: 'pirate', ko: '거인의 시장', building: 'l4', desc: '산속 궁전 수에 따라 {exchange} 횟수 증가 (1.5·x^0.5)', effect: (m, _c, x) => { m.global *= 1 + m.exchangeBonus * 1.5 * x ** 0.5; } },
  { faction: 'sage', ko: '덩굴 건물', building: 'l10', desc: '지구라트 석상 수에 따라 고유 건물이 아닌 건물 수가 늘어난 효과 (1.5·x^0.5)', effect: (m, c, x) => { const add = 1.5 * x ** 0.5; for (const [id, n] of Object.entries(c.buildings)) if (n > 0 && !c.uniques.includes(id)) m.building[id] = (m.building[id] ?? 1) * ((n + add) / n); } },
  { faction: 'puppet', ko: '태고의 지식', building: 'l7', desc: '금지된 서고 수에 따라 {fcShort} 확률 배율 증가, 15분마다 다시 자라요', effect: (m, c, x) => { m.fcChance *= 1 + (((c.runSeconds % 900) / 60) * x ** 0.4) / 100; } },
];
