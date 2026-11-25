// 사당(3월드, 계정 공용): 원작처럼 공방 마당에서 사당을 지어 아무 맵(마을 제외)에 놓는다.
//  · 놓인 맵에 있는 캐릭터만 그 사당의 효과를 받는다(어디에 놓을지가 핵심).
//  · 사당은 놓여 있는 동안 시간마다 경험치를 얻어 자라고, 그 맵에 캐릭터가 있으면 그 수만큼 더 빨리 자란다.
//  · 옮기면 레벨은 그대로, 다시 자라기 시작한다.
import { BonusKey, MAPS, TOWNS, ITEMS } from './data';
import type { Account, Character } from './state';
import { haveMat, mapUnlocked, spendMat } from './state';

export interface ShrineDef { id: string; name: string; eff: BonusKey; per: number; unit: string; base: number; mats: [string, number][]; coins: number }
export const SHRINES: ShrineDef[] = [
  { id: 'sh_valor', name: '용사의 사당', eff: 'dmg', per: 1, unit: '%', base: 5, mats: [['pinelog', 40], ['bar_frost', 10]], coins: 20000 },
  { id: 'sh_life', name: '생명의 사당', eff: 'hpPct', per: 1, unit: '%', base: 5, mats: [['snow_tuft', 40], ['bar_amber', 10]], coins: 20000 },
  { id: 'sh_sage', name: '현자의 사당', eff: 'xp', per: 1, unit: '%', base: 4, mats: [['pine_cone', 40], ['plank', 60]], coins: 30000 },
  { id: 'sh_clover', name: '네잎 사당', eff: 'drop', per: 0.8, unit: '%', base: 3, mats: [['peng_feather', 30], ['moss', 200]], coins: 30000 },
  { id: 'sh_harvest', name: '풍년의 사당', eff: 'mining', per: 2, unit: '%', base: 8, mats: [['ore_frost', 40], ['twine', 200]], coins: 25000 },
  { id: 'sh_grove', name: '숲지기 사당', eff: 'chopping', per: 2, unit: '%', base: 8, mats: [['pinelog', 80], ['leaf', 200]], coins: 25000 },
  { id: 'sh_ward', name: '방패 사당', eff: 'def', per: 1, unit: '', base: 6, mats: [['icicle_shard', 30], ['bar_frost', 20]], coins: 40000 },
  { id: 'sh_dream', name: '단꿈 사당', eff: 'afk', per: 0.2, unit: '%p', base: 1, mats: [['aurora_dust', 20], ['cr_hare', 40]], coins: 60000 },
];
export const SHRINE: Record<string, ShrineDef> = Object.fromEntries(SHRINES.map((s) => [s.id, s]));
export const SHRINE_MAX = 50;
/** 다음 레벨까지 경험치(시간 단위로 쌓인다) */
export const shrineNeed = (lv: number) => Math.ceil(4 * Math.pow(1.22, lv));
export interface ShrineState { map: string | null; lv: number; xp: number }
export interface Shrines { t: number; own: Record<string, ShrineState> }
export const newShrines = (): Shrines => ({ t: 0, own: {} });

/** 이 맵에 있는 캐릭터 수 */
const charsOn = (acc: Pick<Account, 'characters'>, map: string) => acc.characters.filter((c) => c.mapId === map).length;
/** 시간당 사당 경험치: 기본 1 + 그 맵의 캐릭터마다 1 */
export const shrineRate = (acc: Pick<Account, 'characters'>, s: ShrineState) => (s.map ? 1 + charsOn(acc, s.map) : 0);
export const shrineValue = (d: ShrineDef, lv: number) => (lv > 0 ? d.base + (lv - 1) * d.per : 0);

export function shrineSettle(acc: Account, now: number) {
  const sh = acc.shrines;
  if (!sh.t) { sh.t = now; return; }
  if (now <= sh.t) return;
  const h = (now - sh.t) / 3_600_000;
  sh.t = now;
  for (const s of Object.values(sh.own)) {
    if (!s.map || s.lv >= SHRINE_MAX) continue;
    s.xp += h * shrineRate(acc, s);
    while (s.lv < SHRINE_MAX && s.xp >= shrineNeed(s.lv)) { s.xp -= shrineNeed(s.lv); s.lv++; }
    if (s.lv >= SHRINE_MAX) s.xp = 0;
  }
}
/** 사당 짓기(처음엔 Lv.1, 어디에도 놓이지 않음) */
export function buildShrine(acc: Account, c: Character, id: string, now: number): string | null {
  shrineSettle(acc, now);
  const d = SHRINE[id];
  if (!d) return '없는 사당';
  if (acc.shrines.own[id]) return '이미 지은 사당입니다';
  if (acc.coins < d.coins) return '코인이 부족합니다';
  for (const [m, n] of d.mats) if (haveMat(acc, c, m) < n) return `${ITEMS[m]?.name ?? m}이(가) 부족합니다`;
  for (const [m, n] of d.mats) spendMat(acc, c, m, n);
  acc.coins -= d.coins;
  acc.shrines.own[id] = { map: null, lv: 1, xp: 0 };
  return null;
}
/** 지금 캐릭터가 서 있는 맵에 사당을 놓는다(마을 제외). 이미 놓인 사당은 옮겨진다 */
export function placeShrine(acc: Account, c: Character, id: string, now: number): string | null {
  shrineSettle(acc, now);
  const s = acc.shrines.own[id];
  if (!s) return '아직 짓지 않은 사당입니다';
  if (TOWNS.includes(c.mapId) || !MAPS[c.mapId]?.spawns.length) return '사냥터에만 놓을 수 있습니다';
  if (!mapUnlocked(c, c.mapId)) return '갈 수 없는 맵';
  s.map = c.mapId;
  return null;
}
export function pickShrine(acc: Account, id: string, now: number): string | null {
  shrineSettle(acc, now);
  const s = acc.shrines.own[id];
  if (!s?.map) return '놓여 있지 않은 사당입니다';
  s.map = null;
  return null;
}
/** 이 캐릭터가 서 있는 맵의 사당 효과 */
export function shrineBonus(c: Character, a: Partial<Pick<Account, 'shrines'>>, add: (k: BonusKey, v: number) => void) {
  for (const [id, s] of Object.entries(a.shrines?.own ?? {})) if (s.map && s.map === c.mapId && SHRINE[id]) add(SHRINE[id].eff, shrineValue(SHRINE[id], s.lv));
}
