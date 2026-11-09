// Trophy-linked upgrades and rewards, structured like the original (Fandom "Upgrades" page):
// mana upgrades (unlocked by total mana produced), automatic casting, gem upgrades, ruby upgrades,
// secret trophies that unlock reward upgrades, and spell trophies that unlock spell upgrades.
// Costs/thresholds marked WIKI follow the original; names and secret conditions are our own.
import type { Mods, Ctx } from '../engine/mods';
import type { SaveState } from '../engine/state';
import type { ActiveSpell } from './spells';
import { FACTIONS } from './factions';

const M = 1e6, B = 1e9, T = 1e12, Qa = 1e15, Qi = 1e18, Sx = 1e21, Sp = 1e24, Oc = 1e27, No = 1e30;

export interface TrophyUpgrade {
  id: string; ko: string; desc: string; icon: string; cost: number;
  visible: (s: SaveState) => boolean;
  effect: (m: Mods, s: SaveState) => void;
}

// ---------------------------------------------------------------- mana upgrades (WIKI costs and unlocks)
const mana = (id: string, ko: string, cost: number, need: number, regen: number): TrophyUpgrade => ({
  id, ko, desc: `{mana} 회복 +${regen} (누적 {mana} ${need.toLocaleString()} 생산 시 열림)`, icon: 'mana', cost,
  visible: (s) => s.stats.manaProduced >= need, effect: (m) => { m.manaRegenAdd += regen; },
});
// WIKI: Mana Wave and later are post-ascension upgrades
const pa = (u: TrophyUpgrade): TrophyUpgrade => ({ ...u, desc: u.desc + ' — 승천 후', visible: (s) => s.perm.ascensions > 0 && u.visible(s) });
export const MANA_UPGRADES: TrophyUpgrade[] = [
  mana('mana1', '{mana}의 이슬', 10000, 200, 0.5), mana('mana2', '{mana}의 비', 20 * M, 2000, 0.5), mana('mana3', '{mana}의 소나기', 30 * B, 5000, 0.5),
  mana('mana4', '{mana}의 샘', 40 * T, 10000, 0.5), mana('mana5', '{mana}의 폭포', 50 * Qa, 20000, 0.5), mana('mana6', '{mana}의 시냇물', 60 * Qi, 100000, 0.5),
  mana('mana7', '{mana}의 홍수', 70 * Sx, 200000, 0.5), pa(mana('mana8', '{mana}의 물결', 80 * Sp, 20 * M, 5)), pa(mana('mana9', '{mana}의 강', 90 * Oc, 1 * B, 5)),
  pa(mana('mana10', '{mana}의 호수', 100 * No, 20 * B, 5)),
];

// ---------------------------------------------------------------- automatic casting (WIKI: must be bought to autocast)
export const AUTOCAST_UPGRADES: TrophyUpgrade[] = [
  { id: 'auto1', ko: '자동 낭독', desc: '주문 자동 시전을 쓸 수 있어요. (누적 {mana} 60,000 생산 시 열림)', icon: 'hourglass', cost: 100 * B,
    visible: (s) => s.stats.manaProduced >= 60000, effect: () => {} },
  { id: 'auto2', ko: '능숙한 자동 낭독', desc: '{mana} 회복 +5% (누적 {mana} 2M 생산 시 열림)', icon: 'hourglass', cost: 200 * Qi,
    visible: (s) => s.stats.manaProduced >= 2 * M, effect: (m) => { m.manaRegenMult *= 1.05; } },
  { id: 'auto3', ko: '완벽한 자동 낭독', desc: '{mana} 회복 +10% (누적 {mana} 6M 생산 시 열림)', icon: 'hourglass', cost: 300 * Oc,
    visible: (s) => s.stats.manaProduced >= 6 * M, effect: (m) => { m.manaRegenMult *= 1.1; } },
];

// ---------------------------------------------------------------- gem upgrades (WIKI)
export const GEM_UPGRADES: TrophyUpgrade[] = [
  { id: 'gempower', ko: '{gem}의 힘', desc: '{gem} 보너스를 켜요 ({gem} 1개당 생산 +2%). 매 판 다시 사야 해요.', icon: 'legend', cost: 1,
    visible: (s) => s.gems.gte(1), effect: () => {} },
  { id: 'gem2', ko: '{gem}의 위력', desc: '{gem} 1개당 보너스 +1%p ({gem} 1M 보유 시 열림)', icon: 'legend', cost: 10 * Sp,
    visible: (s) => s.gems.gte(1e6), effect: (m) => { m.gemBonusAdd += 0.01; } },
  { id: 'gem3', ko: '{gem}의 패권', desc: '{gem} 1개당 보너스 +1%p ({gem} 1e39 보유 시 열림)', icon: 'legend', cost: 1e70,
    visible: (s) => s.gems.gte(1e39), effect: (m) => { m.gemBonusAdd += 0.01; } },
  { id: 'gem4', ko: '{gem}의 주권', desc: '{gem} 1개당 보너스 +1%p ({gem} 1e63 보유 시 열림)', icon: 'legend', cost: 1e110,
    visible: (s) => s.gems.gte(1e63), effect: (m) => { m.gemBonusAdd += 0.01; } },
];

// ---------------------------------------------------------------- ruby upgrades (WIKI: bought with rubies, persist through every reset)
export interface RubyUpgrade { id: string; ko: string; desc: string; effect: (m: Mods, n: number) => void }
export const RUBY_UPGRADES: RubyUpgrade[] = [
  { id: 'r_assistant', ko: '{ruby} 견습 계약', desc: '{assistant} +1', effect: (m, n) => { m.assistantsAdd += n; } },
  { id: 'r_regen', ko: '{ruby} 샘물', desc: '{mana} 회복 +0.5', effect: (m, n) => { m.manaRegenAdd += 0.5 * n; } },
  { id: 'r_mana', ko: '{ruby} 잔', desc: '{mana} 최대치 +25', effect: (m, n) => { m.manaMaxAdd += 25 * n; } },
  { id: 'r_gem', ko: '{ruby} 왕관', desc: '{gem} 1개당 보너스 +0.5%p', effect: (m, n) => { m.gemBonusAdd += 0.005 * n; } },
  { id: 'r_exchange', ko: '{ruby} 인장', desc: '{exchange} 보너스 +1.5%p', effect: (m, n) => { m.exchangeBonus += 0.015 * n; } },
];
/** Ruby Power (WIKI): +100% production once a ruby is found, +200% from 50 rubies found. */
export const rubyPower = (found: number) => (found >= 50 ? 3 : found >= 1 ? 2 : 1);
export const rubyUpgradeCost = (bought: number) => bought + 1; // WIKI: 1 ruby, +1 per purchase

// ---------------------------------------------------------------- secret trophies with reward upgrades (structure WIKI, own conditions)
export interface SecretDef {
  id: string; ko: string; hint: string; reward: string; cost: number;
  check: (s: SaveState, x: { owned: number; assistants: number; visibleTiers: number[] }) => boolean;
  effect: (m: Mods, s: SaveState) => void;
}
const allAligned = (s: SaveState, a: string, min: number) => (s.stats.alignTime[a] ?? 0) >= min * 60;
export const SECRETS: SecretDef[] = [
  { id: 'lucky', ko: '행운의 숫자', hint: '어느 순간 {coin}을 정확히 777개 가지고 있기', reward: '전체 생산 +7.77%', cost: 777,
    check: (s) => Math.floor(s.run.coins.toNumber()) === 777, effect: (m) => { m.global *= 1.0777; } },
  { id: 'unitary', ko: '하나씩 골고루', hint: '보이는 모든 단계 건물을 정확히 1채씩 가지기', reward: '전체 생산 +11.1%', cost: 1111,
    check: (s, x) => x.visibleTiers.length >= 11 && x.visibleTiers.every((n) => n === 1), effect: (m) => { m.global *= 1.111; } },
  { id: 'nobuild', ko: '건물은 싫어', hint: '건물 없이 {coin} 100,000 벌기', reward: '두드리기 보상 +25%', cost: 1,
    check: (s, x) => x.owned === 0 && s.run.coinsRun.gte(1e5), effect: (m) => { m.click *= 1.25; } },
  { id: 'diplomat', ko: '위대한 외교관', hint: '기본 6진영과 프리스티지 2진영에 한 번씩 가입', reward: '{fcShort} 발견 확률 +2%p', cost: 10,
    check: (s) => ['woodland', 'minstrel', 'starmage', 'thieves', 'ghost', 'witch', 'clockmaker', 'shadow'].every((f) => (s.stats.allied[f as never] ?? 0) > 0),
    effect: (m) => { m.fcChance *= 1.2; } },
  { id: 'exchanger', ko: '계약의 달인', hint: '한 판에 {exchange} 500번', reward: '{exchange} 보너스 +5%p', cost: 500 * 1e33,
    check: (s) => Object.values(s.run.exchanges).reduce((a, b) => a + (b ?? 0), 0) >= 500, effect: (m) => { m.exchangeBonus += 0.05; } },
  { id: 'bright', ko: '언제나 밝게', hint: '{alignBright}로 누적 333분 보내기', reward: '{alignBright} 건물 +50%', cost: 30 * No,
    check: (s) => allAligned(s, 'bright', 333), effect: (m) => { m.align.bright *= 1.5; } },
  { id: 'dark', ko: '깊은 어둠', hint: '{alignDark}로 누적 666분 보내기', reward: '{alignDark} 건물 +50%', cost: 30 * No,
    check: (s) => allAligned(s, 'dark', 666), effect: (m) => { m.align.dark *= 1.5; } },
  { id: 'legend', ko: '오래된 전설', hint: '{alignLegend}로 누적 777분 보내기', reward: '{alignLegend} 건물 +50%', cost: 30 * No,
    check: (s) => allAligned(s, 'legend', 777), effect: (m) => { m.align.legend *= 1.5; } },
  { id: 'rewind', ko: '되감기', hint: '{coin} 1Oc 이상 번 판에서 {abdicate}', reward: '전체 생산 +8%', cost: 1 * Oc,
    check: (s) => !!s.stats.flags.rewind, effect: (m) => { m.global *= 1.08; } },
  { id: 'fury', ko: '주문 폭주', hint: '다른 주문 3개가 발동 중일 때 인세 정산 시전', reward: '{mana} 회복 +5%', cost: 4333,
    check: (s) => !!s.stats.flags.fury, effect: (m) => { m.manaRegenMult *= 1.05; } },
  { id: 'speedrun', ko: '빠른 이야기꾼', hint: '한 판 시작 5분 안에 {coin} 1M 벌기', reward: '두드리기 기본 보상 +1M', cost: 10,
    check: (s) => !!s.stats.flags.speedrun, effect: (m) => { m.clickBase += 1e6; } },
  { id: 'heirs', ko: '모든 유산', hint: '한 판에 기본 6진영의 {heritage}을 모두 사기', reward: '{fcShort} 발견 확률 +1%p', cost: 1 * M,
    check: (s) => FACTIONS.filter((f) => f.kind === 'vanilla').every((f) => s.run.upgrades.includes('her_' + f.id)), effect: (m) => { m.fcChance *= 1.1; } },
];

// ---------------------------------------------------------------- spell trophies → spell upgrades (structure WIKI, adapted conditions)
export interface SpellUpgradeDef {
  spell: string; ko: string; hint: string; desc: string; cost: number;
  /** checked on every cast; true unlocks the spell's trophy */
  castCheck: (s: SaveState, x: { assistants: number; active: number; now: number; owned: number; gems: number }) => boolean;
  extra?: (m: Mods, c: Ctx, a: ActiveSpell) => void;
  manaDelta?: number;
}
const hour = (now: number) => new Date(now).getHours();
const casts = (s: SaveState, id: string) => s.run.spellCasts[id] ?? 0;
export const SPELL_UPGRADES: SpellUpgradeDef[] = [
  { spell: 'tax', ko: '인세 약탈', hint: '한 판에 인세 정산 150번', desc: '인세 정산이 {fcShort}도 함께 찾아요.', cost: 1e33, castCheck: (s) => casts(s, 'tax') >= 150 },
  { spell: 'call', ko: '대동원령', hint: '건물 1,000채를 가지고 총동원령 시전', desc: '총동원령 효과 x2', cost: 1e15, castCheck: (s, x) => x.owned >= 1000,
    extra: (m, c) => { m.global *= 1 + 0.003 * c.ownedTotal ** 0.975; } },
  { spell: 'holy', ko: '눈부신 낭독', hint: '한 판에 낭독의 빛 100번', desc: '낭독의 빛 동안 두드리기에 초당 생산의 5% 추가', cost: 1 * M, castCheck: (s) => casts(s, 'holy') >= 100,
    extra: (m) => { m.clickShare += 0.05; } },
  { spell: 'frenzy', ko: '끝없는 축제', hint: '{alignDark} 건물 500채를 가지고 피의 축제 시전', desc: '피의 축제가 공통 건물도 x5', cost: 1 * M,
    castCheck: (s) => ['d4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10'].reduce((a, k) => a + (s.run.buildings[k] ?? 0), 0) >= 500,
    extra: (m) => { m.align.common *= 5; } },
  { spell: 'grind', ko: '전설 분쇄기', hint: '{gem} 1T 이상 보유하고 전설의 메아리 시전', desc: '전설의 메아리 효과 x2', cost: 1e30, castCheck: (_s, x) => x.gems >= 1e12,
    extra: (m) => { m.gemBonusMult *= 2; } },
  { spell: 'woodland', ko: '숲의 대합창', hint: '{assistant} 45명 이상일 때 숲의 합창 시전', desc: '숲의 합창 동안 {assistant} 생산 x3', cost: 1 * M, castCheck: (_s, x) => x.assistants >= 45,
    extra: (m) => { m.assistantsMult *= 3; } },
  { spell: 'minstrel', ko: '햇빛 세레나데', hint: '오전 6시~정오에 달빛 세레나데 시전', desc: '달빛 세레나데 동안 초당 15회 자동 두드리기', cost: 1 * M, castCheck: (_s, x) => hour(x.now) >= 6 && hour(x.now) < 12 },
  { spell: 'starmage', ko: '별의 안식', hint: '일요일에 별의 손길 시전', desc: '별의 손길 동안 다른 주문을 쓰면 {fcShort}을 얻어요.', cost: 1 * M, castCheck: (_s, x) => new Date(x.now).getDay() === 0 },
  { spell: 'thieves', ko: '탐욕의 질주', hint: '도적의 탐욕을 연속 100번 (다른 주문 없이)', desc: '도적의 탐욕 {mana} 비용 -150', cost: 1 * M, castCheck: (s) => (s.stats.spellStreak.id === 'thieves' ? s.stats.spellStreak.n : 0) >= 100, manaDelta: -150 },
  { spell: 'ghost', ko: '진짜 밤', hint: '밤 11시~새벽 6시에 한밤의 행진 시전', desc: '한밤의 행진: 해골 선착장 1채당 +40%', cost: 1 * M, castCheck: (_s, x) => hour(x.now) >= 23 || hour(x.now) < 6,
    extra: (m, c) => { m.assistantsMult *= (1 + 0.4 * (c.buildings['d7'] ?? 0)) / (1 + 0.3 * (c.buildings['d7'] ?? 0)); } },
  { spell: 'witch', ko: '지옥 질주', hint: '판 시작 60초 안에 지옥불 가마솥 시전', desc: '지옥불 가마솥이 이야기의 나무도 강화', cost: 1 * M, castCheck: (s, x) => x.now - s.run.start <= 60000,
    extra: (m, c) => { m.building.c11 = (m.building.c11 ?? 1) * (1 + Math.round(200 * c.trophies ** 0.8) / 100); } },
  { spell: 'pirate', ko: '번개 폭풍', hint: '한 판에 번개 약탈 100번', desc: '번개 약탈 배율 x5/채', cost: 1e40, castCheck: (s) => casts(s, 'pirate') >= 100,
    extra: (m, c, a) => { if (a.target) m.building[a.target] = (m.building[a.target] ?? 1) * ((1 + 5 * (c.buildings.l9 ?? 0)) / (1 + 3 * (c.buildings.l9 ?? 0))); } },
  { spell: 'sage', ko: '균형의 전당', hint: '모든 건물을 100채 이상 가지고 대균형 시전', desc: '대균형 효과 x2', cost: 1e40,
    castCheck: (s) => Object.values(s.run.buildings).filter((n) => n > 0).every((n) => n >= 100), extra: (m, _c, a) => { if (a.target) m.building[a.target] = (m.building[a.target] ?? 1) * 2; } },
  { spell: 'puppet', ko: '폭풍 같은 생각', hint: '한 판에 파도치는 생각 10번', desc: '파도치는 생각: 초당 +3%', cost: 1e40, castCheck: (s) => casts(s, 'puppet') >= 10,
    extra: (m, _c, a) => { m.global *= 1 + 0.01 * Math.max(0, (Date.now() - a.start) / 1000); } },
  { spell: 'clockmaker', ko: '광산 장인', hint: '한 판에 다이아몬드 곡괭이 50번', desc: '{fcShort} 발견 확률 보너스 +300% (+200% 대신)', cost: 1e46, castCheck: (s) => casts(s, 'clockmaker') >= 50,
    extra: (m) => { m.fcChance *= 4 / 3; } },
  { spell: 'shadow', ko: '완벽한 연속 공연', hint: '연속 공연을 연속 100번', desc: '연속 공연 공식 40·x^0.9 % (30 대신)', cost: 1e46, castCheck: (s) => (s.stats.spellStreak.id === 'shadow' ? s.stats.spellStreak.n : 0) >= 100,
    extra: (m, _c, a) => { m.global *= (1 + (40 * (a.n ?? 1) ** 0.9) / 100) / (1 + (30 * (a.n ?? 1) ** 0.9) / 100); } },
  { spell: 'phoenix', ko: '불사조의 포효', hint: '다른 주문 4개가 발동 중일 때 불사조의 숨결 시전', desc: '불사조의 숨결이 {fcShort}도 만들어요.', cost: 1e66, castCheck: (_s, x) => x.active >= 4 },
];
