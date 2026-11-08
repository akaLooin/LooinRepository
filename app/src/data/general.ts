// General (non-faction) upgrades and trophies. Numbers are this game's own (GUESS where the original is unverified).
import type { Mods } from '../engine/mods';
import type { SaveState } from '../engine/state';
import { FACTIONS } from './factions';

export interface GeneralUpgrade {
  id: string; ko: string; desc: string; icon: string; cost: number;
  visible: (s: SaveState) => boolean;
  effect: (m: Mods) => void;
}

const click = (n: number, cost: number, share: number): GeneralUpgrade => ({
  id: 'click' + n, ko: `낭독 기술 ${n}`, desc: `두드리기에 초당 생산의 ${share * 100}% 추가`, icon: 'book', cost,
  visible: (s) => s.run.coinsRun.gte(cost / 20), effect: (m) => { m.clickShare += share; },
});
const regen = (n: number, cost: number): GeneralUpgrade => ({
  id: 'regen' + n, ko: `영감의 샘 ${n}`, desc: '영감 회복 +0.5/초', icon: 'mana', cost,
  visible: (s) => s.run.coinsRun.gte(cost / 20), effect: (m) => { m.manaRegenAdd += 0.5; },
});
const cap = (n: number, cost: number): GeneralUpgrade => ({
  id: 'cap' + n, ko: `넓은 서재 ${n}`, desc: '영감 최대치 +250', icon: 'orb', cost,
  visible: (s) => s.run.coinsRun.gte(cost / 20), effect: (m) => { m.manaMaxAdd += 250; },
});

export const GENERAL_UPGRADES: GeneralUpgrade[] = [
  click(1, 500, 0.01), click(2, 5e4, 0.01), click(3, 5e6, 0.02), click(4, 5e9, 0.02), click(5, 5e12, 0.03), click(6, 5e16, 0.05),
  regen(1, 1e4), regen(2, 1e7), regen(3, 1e10), regen(4, 1e14),
  cap(1, 5e4), cap(2, 5e8), cap(3, 5e12),
];

export interface TrophyDef { id: string; ko: string; desc: string; check: (s: SaveState, x: { owned: number; assistants: number }) => boolean }

const SUF = ['1K', '1M', '1B', '1T', '1Qa', '1Qi', '1Sx', '1Sp', '1Oc', '1No', '1Dc', '1UDc', '1DDc', '1TDc', '1QaDc'];
export const TROPHIES: TrophyDef[] = [
  ...SUF.map((name, i) => ({ id: 'coins' + i, ko: `금화 ${name}`, desc: `한 판에 금화 ${name} 벌기`,
    check: (s: SaveState) => s.run.coinsRun.gte(Math.pow(10, 3 * (i + 1))) })),
  ...[100, 1000, 10000, 100000].map((n) => ({ id: 'clk' + n, ko: `두드리기 ${n.toLocaleString()}`, desc: `책을 ${n.toLocaleString()}번 두드리기`,
    check: (s: SaveState) => s.stats.clicks >= n })),
  ...[100, 500, 1000, 2000, 4000].map((n) => ({ id: 'own' + n, ko: `건물 ${n}채`, desc: `한 판에 건물 ${n}채 보유`,
    check: (_s: SaveState, x: { owned: number }) => x.owned >= n })),
  ...[20, 50, 100].map((n) => ({ id: 'ast' + n, ko: `견습생 ${n}명`, desc: `견습생 ${n}명 모으기`,
    check: (_s: SaveState, x: { assistants: number }) => x.assistants >= n })),
  ...[10, 100, 1000].map((n) => ({ id: 'spl' + n, ko: `주문 ${n}번`, desc: `주문을 ${n}번 시전`, check: (s: SaveState) => s.stats.spells >= n })),
  ...[1, 10, 50].map((n) => ({ id: 'abd' + n, ko: `다시 쓰기 ${n}번`, desc: `${n}번 다시 쓰기(퇴위)`, check: (s: SaveState) => s.stats.abdications >= n })),
  ...[1, 1000, 1e6, 1e9].map((n) => ({ id: 'gem' + n, ko: `전설 ${n.toLocaleString()}`, desc: `전설 ${n.toLocaleString()}개 보유`, check: (s: SaveState) => s.gems.gte(n) })),
  ...FACTIONS.map((f) => ({ id: 'ally_' + f.id, ko: `${f.ko}의 친구`, desc: `${f.ko} 진영에 가입`, check: (s: SaveState) => (s.stats.allied[f.id] ?? 0) > 0 })),
  ...FACTIONS.map((f) => ({ id: 'champ_' + f.id, ko: `${f.ko}의 영웅`, desc: `한 판에 ${f.ko} 개선 12개 모두 구매`,
    check: (s: SaveState) => s.run.upgrades.filter((u) => u.startsWith(f.id + '_')).length >= 12 })),
];
