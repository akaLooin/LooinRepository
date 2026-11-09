// General (non-faction) upgrades and trophies. Numbers are this game's own (GUESS where the original is unverified).
import type { Mods } from '../engine/mods';
import type { SaveState } from '../engine/state';
import { FACTIONS } from './factions';
import { BUILDINGS } from './buildings';
import { SECRETS, SPELL_UPGRADES } from './trophyups';
import { SPELL_BY_ID, SPELLS } from './spells';
import { SPELL_TIERS } from './endgame';

export interface GeneralUpgrade {
  id: string; ko: string; desc: string; icon: string; cost: number;
  visible: (s: SaveState) => boolean;
  effect: (m: Mods) => void;
}

const click = (n: number, cost: number, share: number): GeneralUpgrade => ({
  id: 'click' + n, ko: `낭독 기술 ${n}`, desc: `두드리기에 초당 생산의 ${share * 100}% 추가`, icon: 'book', cost,
  visible: (s) => s.run.coinsRun.gte(cost / 20), effect: (m) => { m.clickShare += share; },
});
const cap = (n: number, cost: number): GeneralUpgrade => ({
  id: 'cap' + n, ko: `넓은 서재 ${n}`, desc: '{mana} 최대치 +250', icon: 'orb', cost,
  visible: (s) => s.run.coinsRun.gte(cost / 20), effect: (m) => { m.manaMaxAdd += 250; },
});

export const GENERAL_UPGRADES: GeneralUpgrade[] = [
  click(1, 500, 0.01), click(2, 5e4, 0.01), click(3, 5e6, 0.02), click(4, 5e9, 0.02), click(5, 5e12, 0.03), click(6, 5e16, 0.05),
  cap(1, 5e4), cap(2, 5e8), cap(3, 5e12),
];

export interface TrophyDef { id: string; ko: string; desc: string; secret?: boolean; check: (s: SaveState, x: { owned: number; assistants: number; visibleTiers: number[] }) => boolean }

const SUF = ['1K', '1M', '1B', '1T', '1Qa', '1Qi', '1Sx', '1Sp', '1Oc', '1No', '1Dc', '1UDc', '1DDc', '1TDc', '1QaDc'];
export const TROPHIES: TrophyDef[] = [
  ...SUF.map((name, i) => ({ id: 'coins' + i, ko: `{coin} ${name}`, desc: `한 판에 {coin} ${name} 벌기`,
    check: (s: SaveState) => s.run.coinsRun.gte(Math.pow(10, 3 * (i + 1))) })),
  ...[100, 1000, 10000, 100000].map((n) => ({ id: 'clk' + n, ko: `두드리기 ${n.toLocaleString()}`, desc: `책을 ${n.toLocaleString()}번 두드리기`,
    check: (s: SaveState) => s.stats.clicks >= n })),
  ...[100, 500, 1000, 2000, 4000].map((n) => ({ id: 'own' + n, ko: `건물 ${n}채`, desc: `한 판에 건물 ${n}채 보유`,
    check: (_s: SaveState, x: { owned: number }) => x.owned >= n })),
  ...[20, 50, 100].map((n) => ({ id: 'ast' + n, ko: `{assistant} ${n}명`, desc: `{assistant} ${n}명 모으기`,
    check: (_s: SaveState, x: { assistants: number }) => x.assistants >= n })),
  ...[10, 100, 1000].map((n) => ({ id: 'spl' + n, ko: `주문 ${n}번`, desc: `주문을 ${n}번 시전`, check: (s: SaveState) => s.stats.spells >= n })),
  ...[1, 10, 50].map((n) => ({ id: 'abd' + n, ko: `{abdicate} ${n}번`, desc: `${n}번 {abdicate}(퇴위)`, check: (s: SaveState) => s.stats.abdications >= n })),
  ...[1, 1000, 1e6, 1e9].map((n) => ({ id: 'gem' + n, ko: `{gem} ${n.toLocaleString()}`, desc: `{gem} ${n.toLocaleString()}개 보유`, check: (s: SaveState) => s.gems.gte(n) })),
  ...FACTIONS.map((f) => ({ id: 'ally_' + f.id, ko: `${f.ko}의 친구`, desc: `${f.ko} 진영에 가입`, check: (s: SaveState) => (s.stats.allied[f.id] ?? 0) > 0 })),
  ...FACTIONS.filter((f) => f.kind !== 'mercenary').map((f) => ({ id: 'champ_' + f.id, ko: `${f.ko}의 영웅`, desc: `한 판에 ${f.ko} 개선 12개 모두 구매`,
    check: (s: SaveState) => s.run.upgrades.filter((u) => u.startsWith(f.id + '_')).length >= 12 })),
  ...FACTIONS.filter((f) => f.kind !== 'mercenary').map((f) => ({ id: 'grand_' + f.id, ko: `${f.ko}의 대영웅`, desc: `${f.ko} 계보 20레벨 달성`, check: (s: SaveState) => (s.perm.lineage[f.id] ?? 0) >= 20 })),
  // Arcane Brilliance 1-6 (WIKI): unlock tier k+1 for all spells (total active time reaches the unlock time)
  ...[1, 2, 3, 4, 5, 6].map((k) => ({ id: 'brill' + k, ko: `비전의 광휘 ${k}`, desc: `모든 주문의 ${k + 1}등급 해금 (누적 발동 시간) — 다음 등급 해금 시간이 줄어요`,
    check: (s: SaveState) => s.perm.ascensions > 0 && SPELLS.filter((sp) => sp.duration > 0 && !sp.lex).every((sp) =>
      (s.perm.spellActive[sp.id] ?? 0) >= SPELL_TIERS.unlockSeconds(k, s.perm.reincarnations, k - 1)) })),
  // Category trophies modelled on the original's (buildings per type, clicking coins, faction coins, mana, exchanges, play time, spell casts)
  ...BUILDINGS.flatMap((b) => [1, 10, 50, 100, 200, 300, 500, 750, 1000].map((n) => ({ id: `bld_${b.id}_${n}`, ko: `${b.ko} ${n}`, desc: `${b.ko}을(를) ${n}채 가지기`,
    check: (s: SaveState) => (s.run.buildings[b.id] ?? 0) >= n }))),
  ...[1e3, 1e6, 1e9, 1e12, 1e15, 1e18, 1e21, 1e24, 1e30].map((n, i) => ({ id: 'cbc' + i, ko: `손끝의 {coin} ${i + 1}`, desc: `한 판에 두드리기로 {coin} ${n.toExponential(0)} 벌기`,
    check: (s: SaveState) => s.run.coinsByClick.gte(n) })),
  ...[100, 1e3, 1e4, 1e5, 1e6, 1e7].map((n, i) => ({ id: 'fcf' + i, ko: `{fcShort} 사냥꾼 ${i + 1}`, desc: `한 판에 {fc} ${n.toLocaleString()}개 찾기`, check: (s: SaveState) => s.run.fcFound >= n })),
  ...[1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9].map((n, i) => ({ id: 'mana' + i, ko: `{mana}의 흐름 ${i + 1}`, desc: `누적 {mana} ${n.toLocaleString()} 생산`, check: (s: SaveState) => s.stats.manaProduced >= n })),
  ...[10, 25, 50, 100, 200].map((n) => ({ id: 'rex' + n, ko: `{exchange} ${n}`, desc: `한 판에 {exchange} ${n}번`, check: (s: SaveState) => Object.values(s.run.exchanges).reduce((a, b) => a + (b ?? 0), 0) >= n })),
  ...[1, 10, 24, 72, 168, 720].map((h) => ({ id: 'time' + h, ko: `오래된 독자 ${h}시간`, desc: `누적 ${h}시간 플레이`, check: (s: SaveState) => s.stats.playSeconds >= h * 3600 })),
  ...Object.keys(SPELL_BY_ID).flatMap((id) => [10, 100, 1000].map((n) => ({ id: `cast_${id}_${n}`, ko: `${SPELL_BY_ID[id].ko} ${n}`, desc: `${SPELL_BY_ID[id].ko} 누적 ${n}번 시전`,
    check: (s: SaveState) => (s.stats.castTotal?.[id] ?? 0) >= n }))),
  ...SECRETS.map((x) => ({ id: 'sec_' + x.id, ko: x.ko, desc: x.hint, secret: true, check: x.check })),
  ...SPELL_UPGRADES.map((x) => ({ id: 'spt_' + x.spell, ko: `${SPELL_BY_ID[x.spell].ko}의 달인`, desc: x.hint, check: (s: SaveState) => !!s.stats.flags['spt_' + x.spell] })),
];
