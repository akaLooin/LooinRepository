// Buildings. Tier costs/production follow the original's structure (replica/recon.md, verified numbers).
// Names are placeholders (terms get finalised later).
import type { Alignment } from './types';

export interface BuildingDef {
  id: string;
  tier: number;               // 1..11
  alignment: Alignment | null; // null = common (tiers 1-3 and 11)
  ko: string;
  cost: number;
  prod: number;               // coins per second per building (tier 11: per trophy)
  art: string;                // key into art/buildings.ts
}

const TIER_COST = [0, 10, 125, 600, 1800, 5600, 38000, 442000, 7.3e6, 145e6, 3.2e9, 200e9];
const TIER_PROD = [0, 2, 6, 20, 65, 200, 650, 2000, 8500, 1e5, 1.2e6, 250000];

const NAMES: Record<string, string[]> = {
  common: ['', '이야기꾼 오두막', '버섯 여관', '과자 공방'],
  bright: ['', '', '', '', '콩나무 농장', '무도회장', '마법 도서관', '구름 항구', '유리 성', '별빛 극장', '하늘 정원'],
  dark: ['', '', '', '', '저주받은 물레방아', '늑대의 숲', '마녀의 오두막', '해골 선착장', '거울 미궁', '그림자 극장', '끝없는 밤의 탑'],
  legend: ['', '', '', '', '깊은 광산', '돌다리 요새', '연금술 공방', '별점 수도원', '시간의 미로', '용의 보물고', '고대 석상'],
};

function make(tier: number, alignment: Alignment | null, id: string): BuildingDef {
  const ko = tier === 11 ? '이야기의 나무' : NAMES[alignment ?? 'common'][tier];
  return { id, tier, alignment, ko, cost: TIER_COST[tier], prod: TIER_PROD[tier], art: id };
}

export const BUILDINGS: BuildingDef[] = [
  make(1, null, 'c1'), make(2, null, 'c2'), make(3, null, 'c3'),
  ...(['bright', 'dark', 'legend'] as Alignment[]).flatMap((a) =>
    [4, 5, 6, 7, 8, 9, 10].map((t) => make(t, a, a[0] + t))),
  make(11, null, 'c11'),
];
export const BUILDING_BY_ID: Record<string, BuildingDef> = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

export const COST_GROWTH = 1.15;

/** Buildings visible in a run: common tiers + the chosen alignment's tiers (+ tier 11 after choosing). */
export function buildingsFor(alignment: Alignment | null): BuildingDef[] {
  return BUILDINGS.filter((b) =>
    b.tier <= 3 || (alignment && (b.alignment === alignment || b.tier === 11)));
}

// Building upgrades: unlocked at these counts. Multiplier bonus (%) and cost per tier.
export const BU_COUNTS = [5, 25, 75, 150, 200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1250, 1500, 1750, 2000, 2500]; // WIKI (Good building upgrades)
export const BU_BONUS_LOW = [100, 200, 300, 400, 500, 400, 300, 200, 200, 200, 300, 300, 300, 300, 300, 400, 400, 400, 400];   // tiers 1-3 (600+ GUESS = high tiers)
export const BU_BONUS_HIGH = [100, 100, 100, 100, 100, 200, 200, 200, 200, 200, 300, 300, 300, 300, 300, 400, 400, 400, 400];  // tiers 4-10 (WIKI)
export const BU_BONUS_T11 = [75, 75, 75, 75, 75, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150, 150]; // + per-trophy part below
export const BU_T11_PER_TROPHY = [0.25, 0.25, 0.25, 0.25, 0.25, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5];
// cost table [tier][index], from the verified upgrade table (rounded)
export const BU_COST: number[][] = [
  [],
  [200, 6580, 10.7e6, 509e9, 689.5e12, 971.6e18, 1.331e27, 1.787e33],
  [2510, 82300, 133.8e6, 6.363e12, 8.619e15, 12.15e21, 16.64e27, 22.33e33],
  [12070, 395020, 642.1e6, 30.54e12, 41.37e15, 58.3e21, 79.87e27, 107.2e33],
  [36200, 1.185e6, 1.926e9, 91.62e12, 124.1e15, 174.9e21, 239.6e27, 321.6e33],
  [112640, 3.687e6, 5.993e9, 285.1e12, 386.1e15, 544.1e21, 745.5e27, 1e36],
  [764320, 25.02e6, 40.67e9, 1.934e15, 2.62e18, 3.692e24, 5.058e30, 6.789e36],
  [8.89e6, 291e6, 473e9, 22.5e15, 30.48e18, 42.95e24, 58.84e30, 78.96e36],
  [146.8e6, 4.806e9, 7.812e12, 371.6e15, 503.3e18, 709.3e24, 971.8e30, 1.304e39],
  [2.916e9, 95.46e9, 155.2e12, 7.381e18, 9.998e21, 14.09e27, 19.3e33, 25.9e39],
  [64.36e9, 2.107e12, 3.425e15, 162.9e18, 220.6e21, 310.9e27, 426e33, 571.7e39],
  [40e12, 1.3e15, 2.1e18, 100e21, 140e24, 195e30, 265e36, 357e42],
];
// 600..2500 rows: WIKI prices for tier 4 (Warrior Barracks); other tiers scaled by their 500-row price ratio.
const T4_EXT = [4.248e41, 5.543e47, 7.16e53, 9.173e59, 1.167e66, 1.476e72, 2.012e81, 3.207e96, 5.093e111, 8.058e126, 1.899e157];
for (let t = 1; t <= 11; t++) { const k = BU_COST[t][7] / BU_COST[4][7]; BU_COST[t].push(...T4_EXT.map((c) => c * k)); }

// Aligned building upgrades (WIKI "Aligned Building Upgrades"): need N buildings of the alignment, boost all of them.
export interface AlignUpgrade { id: string; alignment: 'bright' | 'dark' | 'legend'; ko: string; need: number; cost: number; pct: number; needHours?: number }
export const ALIGN_UPGRADES: AlignUpgrade[] = [
  { id: 'au_b1', alignment: 'bright', ko: '{alignBright} 인증서', need: 750, cost: 1e14, pct: 100 },
  { id: 'au_b2', alignment: 'bright', ko: '{alignBright} 확인서', need: 1500, cost: 1e20, pct: 300 },
  { id: 'au_d1', alignment: 'dark', ko: '{alignDark} 인증서', need: 750, cost: 1e14, pct: 100 },
  { id: 'au_d2', alignment: 'dark', ko: '{alignDark} 확인서', need: 1500, cost: 1e20, pct: 300 },
  { id: 'au_l1', alignment: 'legend', ko: '{alignLegend} 인증서', need: 3500, cost: 2e30, pct: 100 },
  { id: 'au_l2', alignment: 'legend', ko: '{alignLegend} 확인서', need: 7000, cost: 4e39, pct: 300 },
  { id: 'au_l3', alignment: 'legend', ko: '꾸준한 집필', need: 0, needHours: 7, cost: 5e14, pct: 100 },
];
