// Spells. Mana cost / duration / formulas follow the original's verified spell table (replica/recon.md).
import type { Alignment, FactionId } from './types';
import { type Ctx, type Mods, ln, lowTiers } from '../engine/mods';

export interface ActiveSpell { start: number; end: number; target?: string; n?: number }
export interface SpellDef {
  id: string; ko: string; icon: string; mana: number; duration: number;
  alignment?: Alignment; faction?: FactionId; minR?: number; lex?: 'order' | 'chaos' | 'balance';
  desc: string;
  effect?: (m: Mods, c: Ctx, a: ActiveSpell, now: number) => void;
}

export const SPELLS: SpellDef[] = [
  { id: 'tax', ko: '인세 정산', icon: 'coin', mana: 200, duration: 0, desc: '건물과 {assistant} 생산 30초 분량을 즉시 얻어요.' },
  { id: 'call', ko: '총동원령', icon: 'hammer', mana: 400, duration: 20, desc: '20초 동안 보유 건물 수에 비례해 건물 생산 증가.',
    effect: (m, c) => { m.global *= 1 + 0.003 * c.ownedTotal ** 0.975; } },
  { id: 'surge', ko: '영혼의 물결', icon: 'star', mana: 2500, duration: 20, minR: 14, desc: '20초 동안 환생 횟수에 따라 건물 생산이 크게 증가 (R14부터).',
    effect: (m, c) => { m.global *= 1 + (10000 * 1.05 ** ((c as unknown as { reincarnations?: number }).reincarnations ?? 0)) / 100; } },
  { id: 'holy', ko: '낭독의 빛', icon: 'book', mana: 900, duration: 10, alignment: 'bright', desc: '10초 동안 두드리기 보상 +2,500%.',
    effect: (m) => { m.click *= 26; } },
  { id: 'frenzy', ko: '피의 축제', icon: 'moon', mana: 600, duration: 20, alignment: 'dark', desc: '20초 동안 {alignDark} 건물 생산 +1,000%.',
    effect: (m) => { m.align.dark *= 11; } },
  { id: 'grind', ko: '{gem}의 메아리', icon: 'legend', mana: 1000, duration: 20, alignment: 'legend', desc: '20초 동안 {gem} 보너스 +5,000%.',
    effect: (m) => { m.gemBonusMult *= 51; } },
  { id: 'woodland', ko: '숲의 합창', icon: 'leaf', mana: 1000, duration: 10, faction: 'woodland', desc: '10초 동안 1~3단계 건물 생산 +50,000%.',
    effect: (m) => lowTiers(m, 501) },
  { id: 'minstrel', ko: '달빛 세레나데', icon: 'lute', mana: 700, duration: 20, faction: 'minstrel', desc: '20초 동안 누적 두드리기 수에 따라 전체 생산 증가.',
    effect: (m, c) => { m.global *= 1 + 0.0175 * ln(1 + c.clicksTotal) ** 3.1; } },
  { id: 'starmage', ko: '별의 손길', icon: 'wand', mana: 900, duration: 20, faction: 'starmage', desc: '20초 동안 전체 생산 + ({mana} 회복량 x 150)%.',
    effect: (m, c) => { m.global *= 1 + 1.5 * c.manaRegen; } },
  { id: 'thieves', ko: '도적의 탐욕', icon: 'dagger', mana: 800, duration: 10, faction: 'thieves', desc: '{gem} 수에 따라 {fcShort}을 즉시 얻고, 10초 동안 이번 판 {fcShort} 수에 따라 생산 증가.',
    effect: (m, c) => { m.global *= 1 + 0.0075 * ln(1 + c.fcFoundRun) ** 3.15; } },
  { id: 'ghost', ko: '한밤의 행진', icon: 'ghost', mana: 1000, duration: 20, faction: 'ghost', desc: '20초 동안 해골 선착장 1채당 {assistant} 생산 +30%.',
    effect: (m, c) => { m.assistantsMult *= 1 + 0.3 * (c.buildings['d7'] ?? 0); } },
  { id: 'witch', ko: '지옥불 가마솥', icon: 'cauldron', mana: 1000, duration: 20, faction: 'witch', desc: '20초 동안 {trophy} 수에 따라 어두운 9·10단계 건물 증가.',
    effect: (m, c) => { const f = 1 + Math.round(200 * c.trophies ** 0.8) / 100; m.building['d9'] = (m.building['d9'] ?? 1) * f; m.building['d10'] = (m.building['d10'] ?? 1) * f; } },
  { id: 'pirate', ko: '번개 약탈', icon: 'anchor', mana: 900, duration: 20, faction: 'pirate', desc: '무작위 건물 1종이 용의 보물고 1채당 +300%. {fcShort}도 얻어요.',
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
  { id: 'clockmaker', ko: '다이아몬드 곡괭이', icon: 'shovel', mana: 1000, duration: 12, faction: 'clockmaker', desc: '12초 동안 탐사 깊이 1당 두드리기 +25%, {fcShort} 발견 확률 +200%.',
    effect: (m, c) => { m.click *= 1 + 0.25 * (c.excavations ?? 0); m.fcChance *= 3; } },
  { id: 'shadow', ko: '연속 공연', icon: 'mask', mana: 800, duration: 20, faction: 'shadow', desc: '20초 동안 전체 생산 증가. 이번 판에 이 주문을 많이 쓸수록 강해져요 (30·x^0.9 %).',
    effect: (m, _c, a) => { m.global *= 1 + (30 * (a.n ?? 1) ** 0.9) / 100; } },
  { id: 'phoenix', ko: '불사조의 숨결', icon: 'sun', mana: 1500, duration: 20, faction: 'phoenix', desc: '20초 동안 다섯 가지 숨결 중 하나가 무작위로 발동해요.',
    effect: (m, _c, a) => { switch (a.target) { case 'b1': m.global *= 3; break; case 'b2': m.click *= 10; break; case 'b3': m.manaRegenMult *= 3; break; case 'b4': m.fcChance *= 3; break; default: m.assistantsMult *= 3; } } },
  // Leges spells (A2, R100+) — WIKI: Temporal Flux 5000/12s, Maelstrom 3500/12s, All Creation 6000/12s
  { id: 'flux', ko: '시간의 소용돌이', icon: 'hourglass', mana: 5000, duration: 12, lex: 'order', desc: '12초 동안 이번 판 시간에 따라 고유 건물 생산과 {mana} 회복 증가 (5·(분)^0.7 %).',
    effect: (m, c) => { const f = 1 + (5 * (c.runSeconds / 60) ** 0.7) / 100; m.manaRegenMult *= f; for (const id of (c as unknown as { uniques?: string[] }).uniques ?? []) m.building[id] = (m.building[id] ?? 1) * f; } },
  { id: 'maelstrom', ko: '혼돈의 소용돌이', icon: 'mask', mana: 3500, duration: 12, lex: 'chaos', desc: '12초 동안 무작위 건물 3종의 생산이 이번 판 기록에 따라 크게 증가.',
    effect: (m, c, a) => { const f = 1 + (0.075 * ln(1 + c.clicksRun) ** 2.5 + 0.01 * ln(1 + c.fcFoundRun) ** 4) / 100 * 10; for (const id of (a.target ?? '').split(',').filter(Boolean)) m.building[id] = (m.building[id] ?? 1) * f; } },
  { id: 'creation', ko: '만물의 조화', icon: 'owl', mana: 6000, duration: 12, lex: 'balance', desc: '12초 동안 {mana} 회복량에 따라 모든 건물 생산과 {fcShort} 발견 확률 증가.',
    effect: (m, c) => { const f = 1 + Math.floor(0.2 * c.manaRegen ** 0.6) / 10; m.global *= f; m.fcChance *= f; } },
];
export const SPELL_BY_ID = Object.fromEntries(SPELLS.map((s) => [s.id, s]));
