// Spells. Mana cost / duration / formulas follow the original's verified spell table (replica/recon.md).
import type { Alignment, FactionId } from './types';
import { type Ctx, type Mods, ln, lowTiers } from '../engine/mods';

export interface ActiveSpell { start: number; end: number; target?: string }
export interface SpellDef {
  id: string; ko: string; icon: string; mana: number; duration: number;
  alignment?: Alignment; faction?: FactionId;
  desc: string;
  effect?: (m: Mods, c: Ctx, a: ActiveSpell, now: number) => void;
}

export const SPELLS: SpellDef[] = [
  { id: 'tax', ko: '인세 정산', icon: 'coin', mana: 200, duration: 0, desc: '건물과 견습생 생산 30초 분량을 즉시 얻어요.' },
  { id: 'call', ko: '총동원령', icon: 'hammer', mana: 400, duration: 20, desc: '20초 동안 보유 건물 수에 비례해 건물 생산 증가.',
    effect: (m, c) => { m.global *= 1 + 0.003 * c.ownedTotal ** 0.975; } },
  { id: 'holy', ko: '낭독의 빛', icon: 'book', mana: 900, duration: 10, alignment: 'bright', desc: '10초 동안 두드리기 보상 +2,500%.',
    effect: (m) => { m.click *= 26; } },
  { id: 'frenzy', ko: '피의 축제', icon: 'moon', mana: 600, duration: 20, alignment: 'dark', desc: '20초 동안 어두운 이야기 건물 생산 +1,000%.',
    effect: (m) => { m.align.dark *= 11; } },
  { id: 'grind', ko: '전설의 메아리', icon: 'legend', mana: 1000, duration: 20, alignment: 'legend', desc: '20초 동안 전설 보너스 +5,000%.',
    effect: (m) => { m.gemBonusMult *= 51; } },
  { id: 'woodland', ko: '숲의 합창', icon: 'leaf', mana: 1000, duration: 10, faction: 'woodland', desc: '10초 동안 1~3단계 건물 생산 +50,000%.',
    effect: (m) => lowTiers(m, 501) },
  { id: 'minstrel', ko: '달빛 세레나데', icon: 'lute', mana: 700, duration: 20, faction: 'minstrel', desc: '20초 동안 누적 두드리기 수에 따라 전체 생산 증가.',
    effect: (m, c) => { m.global *= 1 + 0.0175 * ln(1 + c.clicksTotal) ** 3.1; } },
  { id: 'starmage', ko: '별의 손길', icon: 'wand', mana: 900, duration: 20, faction: 'starmage', desc: '20초 동안 전체 생산 + (영감 회복량 x 150)%.',
    effect: (m, c) => { m.global *= 1 + 1.5 * c.manaRegen; } },
  { id: 'thieves', ko: '도적의 탐욕', icon: 'dagger', mana: 800, duration: 10, faction: 'thieves', desc: '전설 수에 따라 조각을 즉시 얻고, 10초 동안 이번 판 조각 수에 따라 생산 증가.',
    effect: (m, c) => { m.global *= 1 + 0.0075 * ln(1 + c.fcFoundRun) ** 3.15; } },
  { id: 'ghost', ko: '한밤의 행진', icon: 'ghost', mana: 1000, duration: 20, faction: 'ghost', desc: '20초 동안 해골 선착장 1채당 견습생 생산 +30%.',
    effect: (m, c) => { m.assistantsMult *= 1 + 0.3 * (c.buildings['d7'] ?? 0); } },
  { id: 'witch', ko: '지옥불 가마솥', icon: 'cauldron', mana: 1000, duration: 20, faction: 'witch', desc: '20초 동안 명장면 수에 따라 어두운 9·10단계 건물 증가.',
    effect: (m, c) => { const f = 1 + Math.round(200 * c.trophies ** 0.8) / 100; m.building['d9'] = (m.building['d9'] ?? 1) * f; m.building['d10'] = (m.building['d10'] ?? 1) * f; } },
  { id: 'pirate', ko: '번개 약탈', icon: 'anchor', mana: 900, duration: 20, faction: 'pirate', desc: '무작위 건물 1종이 용의 보물고 1채당 +300%. 조각도 얻어요.',
    effect: (m, c, a) => { if (a.target) m.building[a.target] = (m.building[a.target] ?? 1) * (1 + 3 * (c.buildings['l9'] ?? 0)); } },
  { id: 'sage', ko: '대균형', icon: 'owl', mana: 1000, duration: 20, faction: 'sage', desc: '가장 많은 건물 3종을 바탕으로 가장 약한 건물을 강화.',
    effect: (m, c, a) => {
      const top = Object.values(c.buildings).sort((x, y) => y - x).slice(0, 3);
      while (top.length < 3) top.push(0);
      const v = Math.round(0.25 * ((top[0] * top[1] * top[2]) / 729) ** 0.9);
      if (a.target) m.building[a.target] = (m.building[a.target] ?? 1) * (1 + v);
    } },
  { id: 'puppet', ko: '파도치는 생각', icon: 'mask', mana: 600, duration: 600, faction: 'puppet', desc: '600초 동안 전체 생산이 초당 2%씩 누적 증가.',
    effect: (m, _c, a, now) => { m.global *= 1 + 0.02 * Math.max(0, (now - a.start) / 1000); } },
];
export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s]));
