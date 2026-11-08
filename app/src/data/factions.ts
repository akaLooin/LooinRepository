// Alignments, factions and their 12 upgrades each (3 tiers x 4), structured like the original.
// Effects are written for this game (same roles as the original factions, own numbers).
// Costs marked GUESS are not verified against the original yet.
import type { Alignment, CoinType, FactionId } from './types';
import { type Ctx, type Mods, ln, lowTiers, highTiers } from '../engine/mods';

export interface AlignmentDef { id: Alignment; ko: string; cost: number; color: string; desc: string; needsGems?: number }
export const ALIGNMENTS: AlignmentDef[] = [
  { id: 'bright', ko: '밝은 이야기의 증표', cost: 25000, color: '#4f78c8', desc: '능동 플레이: 주문과 두드리기 중심. 밝은 이야기 건물과 진영이 열려요.' },
  { id: 'dark', ko: '어두운 이야기의 증표', cost: 25000, color: '#b0413e', desc: '방치 플레이: 꾸준한 건물 생산 중심. 어두운 이야기 건물과 진영이 열려요.' },
  { id: 'legend', ko: '옛 전설의 증표', cost: 1e16, color: '#6f6a5e', desc: '혼합형. 전설(보석) 10억 개 이상 필요.', needsGems: 1e9 },
];

export interface UpgradeEffect { (m: Mods, c: Ctx): void }
export interface FactionUpgrade {
  id: string; faction: FactionId; tier: 1 | 2 | 3; slot: 0 | 1 | 2 | 3;
  ko: string; desc: string; cost: number; fcCost?: Partial<Record<CoinType, number>>;
  effect?: UpgradeEffect;
}
export interface FactionDef {
  id: FactionId; alignment: Alignment; ko: string; role: string; color: string; emblem: string;
  treatyCost: Partial<Record<CoinType, number>>; coinTypes: CoinType[]; spell: string;
}

export const FACTIONS: FactionDef[] = [
  { id: 'woodland', alignment: 'bright', ko: '숲속 친구들', role: '견습생(조수)과 하위 3단계 건물', color: '#7fbf6a', emblem: 'leaf', treatyCost: { woodland: 20 }, coinTypes: ['woodland'], spell: 'woodland' },
  { id: 'minstrel', alignment: 'bright', ko: '음유시인', role: '두드리기와 이야기 조각', color: '#d8b04a', emblem: 'lute', treatyCost: { minstrel: 20 }, coinTypes: ['minstrel'], spell: 'minstrel' },
  { id: 'starmage', alignment: 'bright', ko: '별의 마법사', role: '주문과 영감 회복', color: '#7cc0ff', emblem: 'wand', treatyCost: { starmage: 20 }, coinTypes: ['starmage'], spell: 'starmage' },
  { id: 'thieves', alignment: 'dark', ko: '도적단', role: '싼 건물과 금화 욕심', color: '#a8a060', emblem: 'dagger', treatyCost: { thieves: 20 }, coinTypes: ['thieves'], spell: 'thieves' },
  { id: 'ghost', alignment: 'dark', ko: '유령', role: '오래 켜둘수록 강해지는 생산·견습생', color: '#8c6cc8', emblem: 'ghost', treatyCost: { ghost: 20 }, coinTypes: ['ghost'], spell: 'ghost' },
  { id: 'witch', alignment: 'dark', ko: '마녀', role: '상위 단계 건물과 명장면', color: '#d4553a', emblem: 'cauldron', treatyCost: { witch: 20 }, coinTypes: ['witch'], spell: 'witch' },
  { id: 'pirate', alignment: 'legend', ko: '해적', role: '운이 좋으면 아주 강함 (별의 마법사+도적단)', color: '#e0c060', emblem: 'anchor', treatyCost: { starmage: 250, thieves: 250 }, coinTypes: ['starmage', 'thieves'], spell: 'pirate' },
  { id: 'sage', alignment: 'legend', ko: '현자', role: '마법과 균형 (음유시인+마녀)', color: '#9a7a4a', emblem: 'owl', treatyCost: { minstrel: 250, witch: 250 }, coinTypes: ['minstrel', 'witch'], spell: 'sage' },
  { id: 'puppet', alignment: 'legend', ko: '꼭두각시', role: '시간이 갈수록 강해짐 (숲속 친구들+유령)', color: '#b090e0', emblem: 'mask', treatyCost: { woodland: 250, ghost: 250 }, coinTypes: ['woodland', 'ghost'], spell: 'puppet' },
];
export const FACTION_BY_ID = Object.fromEntries(FACTIONS.map((f) => [f.id, f])) as Record<FactionId, FactionDef>;

// GUESS: coin costs per tier/slot (slot 0 of each tier is the gate upgrade).
const COST = [[0, 2e4, 2e5, 2e6], [1e9, 1e10, 1e11, 1e12], [1e15, 1e16, 1e18, 1e20]];
const GATE = ['조약', '우호 협정', '동맹'];

type Row = [string, string, UpgradeEffect];
function faction(id: FactionId, rows: Row[]): FactionUpgrade[] {
  const f = FACTIONS.find((x) => x.id === id)!;
  const out: FactionUpgrade[] = [];
  for (let tier = 1 as 1 | 2 | 3; tier <= 3; tier++) {
    const gate: FactionUpgrade = {
      id: `${id}_g${tier}`, faction: id, tier, slot: 0, ko: `${f.ko} ${GATE[tier - 1]}`,
      desc: tier === 1 ? `${f.ko} 진영에 가입해요. 진영 주문이 열려요.` : `${f.ko}와 더 깊은 관계를 맺어 다음 단계 개선이 열려요.`,
      cost: COST[tier - 1][0],
      fcCost: tier === 1 ? f.treatyCost : Object.fromEntries(f.coinTypes.map((c) => [c, tier === 2 ? 50 : 500])), // GUESS for tiers 2-3
    };
    out.push(gate);
    for (let s = 1; s <= 3; s++) {
      const [ko, desc, effect] = rows[(tier - 1) * 3 + (s - 1)];
      out.push({ id: `${id}_${tier}${s}`, faction: id, tier, slot: s as 1 | 2 | 3, ko, desc, cost: COST[tier - 1][s], effect });
    }
  }
  return out;
}

export const FACTION_UPGRADES: FactionUpgrade[] = [
  ...faction('woodland', [
    ['버섯 비료', '1~3단계 건물 생산 x5', (m) => lowTiers(m, 5)],
    ['숲속 일꾼', '견습생 +10', (m) => { m.assistantsAdd += 10; }],
    ['작은 손들', '견습생 생산 x2', (m) => { m.assistantsMult *= 2; }],
    ['이슬 축제', '견습생 1명당 1~3단계 건물 +5%', (m, c) => lowTiers(m, 1 + 0.05 * c.assistants)],
    ['친구의 친구', '견습생 +25', (m) => { m.assistantsAdd += 25; }],
    ['숲의 노래', '견습생 1명당 전체 생산 +1%', (m, c) => { m.global *= 1 + 0.01 * c.assistants; }],
    ['고목의 지혜', '명장면 1개당 1~3단계 건물 +10%', (m, c) => lowTiers(m, 1 + 0.1 * c.trophies)],
    ['온 숲이 일한다', '견습생 생산 x3', (m) => { m.assistantsMult *= 3; }],
    ['봄의 귀환', '전체 생산 x2', (m) => { m.global *= 2; }],
  ]),
  ...faction('minstrel', [
    ['첫 공연', '두드리기에 초당 생산의 1% 추가', (m) => { m.clickShare += 0.01; }],
    ['행운의 현', '이야기 조각 발견 확률 x1.5', (m) => { m.fcChance *= 1.5; }],
    ['박수갈채', '전체 두드리기 수 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.002 * ln(1 + c.clicksTotal) ** 2; }],
    ['합창단', '두드리기 위력 x3', (m) => { m.click *= 3; }],
    ['순회 공연', '이야기 조각 발견 확률 x1.5', (m) => { m.fcChance *= 1.5; }],
    ['비밀 연주법', '이번 판 두드리기 수 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.01 * ln(1 + c.clicksRun) ** 1.5; }],
    ['전설의 노래', '두드리기에 초당 생산의 2% 추가', (m) => { m.clickShare += 0.02; }],
    ['조각 수집가', '이번 판 발견한 조각 수 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.05 * ln(1 + c.fcFoundRun) ** 2; }],
    ['기립 박수', '두드리기 위력 x5', (m) => { m.click *= 5; }],
  ]),
  ...faction('starmage', [
    ['별가루', '영감 회복 +40%', (m) => { m.manaRegenMult *= 1.4; }],
    ['주문서', '영감 최대치 +500', (m) => { m.manaMaxAdd += 500; }],
    ['별자리 읽기', '이번 판 시전한 주문 수 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.03 * c.spellsRun; }],
    ['유성우', '영감 회복 +1/초', (m) => { m.manaRegenAdd += 1; }],
    ['마력 공명', '영감 회복량 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.5 * c.manaRegen; }],
    ['은하 서고', '영감 최대치 +1000', (m) => { m.manaMaxAdd += 1000; }],
    ['천체의 음악', '영감 회복 x2', (m) => { m.manaRegenMult *= 2; }],
    ['별의 축복', '주문 수 기반 전체 생산 증가 (강화)', (m, c) => { m.global *= 1 + 0.1 * c.spellsRun; }],
    ['새벽별', '전체 생산 x3', (m) => { m.global *= 3; }],
  ]),
  ...faction('thieves', [
    ['장물 시장', '건물 가격 -10%', (m) => { m.costMult *= 0.9; }],
    ['두둑한 주머니', '보유 조각 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.02 * ln(1 + c.fcFoundRun) ** 2; }],
    ['검은 장부', '이번 판 구매한 개선 수 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.05 * c.upgradesRun; }],
    ['뒷골목 상인', '건물 가격 -10%', (m) => { m.costMult *= 0.9; }],
    ['금고털이', '이야기 조각 발견 확률 x2', (m) => { m.fcChance *= 2; }],
    ['위조 증서', '출판 계약 보너스 +5%p', (m) => { m.exchangeBonus += 0.05; }],
    ['도적 왕의 몫', '건물 가격 -20%', (m) => { m.costMult *= 0.8; }],
    ['황금 탐욕', '전체 건물 수 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.001 * c.ownedTotal; }],
    ['큰 한탕', '전체 생산 x3', (m) => { m.global *= 3; }],
  ]),
  ...faction('ghost', [
    ['오래된 저택', '이번 판 흐른 시간 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.5 * (c.runSeconds / 3600) ** 0.8; }],
    ['떠도는 혼', '견습생 +10', (m) => { m.assistantsAdd += 10; }],
    ['잠들지 않는 밤', '오프라인 생산 x3', (m) => { m.offline *= 3; }],
    ['안개 낀 묘지', '시간 기반 견습생 생산 증가', (m, c) => { m.assistantsMult *= 1 + (c.runSeconds / 3600) ** 0.7; }],
    ['영혼의 등불', '영감 회복 +20%', (m) => { m.manaRegenMult *= 1.2; }],
    ['백 년의 기다림', '시간 기반 전체 생산 증가 (강화)', (m, c) => { m.global *= 1 + (c.runSeconds / 3600); }],
    ['유령 행렬', '견습생 +30', (m) => { m.assistantsAdd += 30; }],
    ['영원한 밤', '오프라인 생산 x5', (m) => { m.offline *= 5; }],
    ['저승의 문', '전체 생산 x3', (m) => { m.global *= 3; }],
  ]),
  ...faction('witch', [
    ['검은 고양이', '8~10단계 건물 생산 x3', (m) => highTiers(m, 3)],
    ['마녀의 수집품', '명장면 1개당 전체 생산 +2%', (m, c) => { m.global *= 1 + 0.02 * c.trophies; }],
    ['저주받은 상자', '어두운 이야기 건물 생산 x2', (m) => { m.align.dark *= 2; }],
    ['보름달 의식', '명장면 기반 8~10단계 건물 증가', (m, c) => highTiers(m, 1 + 0.1 * c.trophies)],
    ['독사과', '전체 생산 x1.5', (m) => { m.global *= 1.5; }],
    ['마녀의 집회', '8~10단계 건물 생산 x5', (m) => highTiers(m, 5)],
    ['금지된 주문서', '명장면 1개당 전체 생산 +5%', (m, c) => { m.global *= 1 + 0.05 * c.trophies; }],
    ['영원의 가마솥', '어두운 이야기 건물 생산 x3', (m) => { m.align.dark *= 3; }],
    ['마녀의 왕관', '전체 생산 x3', (m) => { m.global *= 3; }],
  ]),
  ...faction('pirate', [
    ['보물 지도', '이야기 조각 발견 확률 x2', (m) => { m.fcChance *= 2; }],
    ['럼주 통', '두드리기 위력 x5', (m) => { m.click *= 5; }],
    ['폭풍의 항해', '영감 회복 +50%', (m) => { m.manaRegenMult *= 1.5; }],
    ['해적 깃발', '옛 전설 건물 생산 x3', (m) => { m.align.legend *= 3; }],
    ['약탈선', '두드리기에 초당 생산의 2% 추가', (m) => { m.clickShare += 0.02; }],
    ['행운의 동전', '전체 생산 x2', (m) => { m.global *= 2; }],
    ['크라켄의 눈', '조각 발견 확률 x2', (m) => { m.fcChance *= 2; }],
    ['해적왕의 보물', '옛 전설 건물 생산 x5', (m) => { m.align.legend *= 5; }],
    ['일곱 바다', '전체 생산 x4', (m) => { m.global *= 4; }],
  ]),
  ...faction('sage', [
    ['명상', '영감 최대치 +1000', (m) => { m.manaMaxAdd += 1000; }],
    ['균형의 저울', '가장 많은 건물과 가장 적은 건물 차이가 작을수록 생산 증가', (m, c) => {
      const v = Object.values(c.buildings).filter((x) => x > 0); if (v.length) m.global *= 1 + 2 * Math.min(...v) / Math.max(...v); }],
    ['약초 정원', '영감 회복 +1/초', (m) => { m.manaRegenAdd += 1; }],
    ['고서 해독', '전체 생산 x2', (m) => { m.global *= 2; }],
    ['올빼미의 눈', '두드리기 위력 x3', (m) => { m.click *= 3; }],
    ['자연의 조화', '옛 전설 건물 생산 x3', (m) => { m.align.legend *= 3; }],
    ['현자의 돌', '영감 회복 x2', (m) => { m.manaRegenMult *= 2; }],
    ['만물의 이치', '전체 생산 x3', (m) => { m.global *= 3; }],
    ['세계수의 뿌리', '옛 전설 건물 생산 x5', (m) => { m.align.legend *= 5; }],
  ]),
  ...faction('puppet', [
    ['실 끊긴 인형', '이번 판 시간 기반 전체 생산 증가', (m, c) => { m.global *= 1 + 0.8 * (c.runSeconds / 3600) ** 0.8; }],
    ['무대 뒤', '견습생 +20', (m) => { m.assistantsAdd += 20; }],
    ['가면 무도회', '전체 생산 x2', (m) => { m.global *= 2; }],
    ['인형사의 손', '견습생 생산 x3', (m) => { m.assistantsMult *= 3; }],
    ['끝없는 공연', '시간 기반 생산 증가 (강화)', (m, c) => { m.global *= 1 + 1.5 * (c.runSeconds / 3600) ** 0.8; }],
    ['얼굴 없는 배우', '옛 전설 건물 생산 x3', (m) => { m.align.legend *= 3; }],
    ['꿈의 극장', '오프라인 생산 x5', (m) => { m.offline *= 5; }],
    ['막이 오르면', '견습생 1명당 전체 생산 +1%', (m, c) => { m.global *= 1 + 0.01 * c.assistants; }],
    ['영원한 커튼콜', '전체 생산 x4', (m) => { m.global *= 4; }],
  ]),
];
