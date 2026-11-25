// 미니게임(벌목 타이밍·채광 힘 모으기·함정 피하기)과 토템 디펜스의 규칙·보상.
// 점수는 기기에서 나오므로 서버는 하루 판수·시간 창·점수 상한으로만 막는다(보상은 점수에 비례, 상한 있음).
import type { Account, Character } from './state';
import { addItemSome, gainSkillXp, today } from './state';

export type GameKind = 'chop' | 'mine' | 'spike';
export const GAMES: Record<GameKind, { name: string; desc: string; daily: number; max: number }> = {
  chop: { name: '벌목 타이밍', desc: '움직이는 표시가 초록 구간에 왔을 때 누르세요. 가운데일수록 점수가 높습니다(10번).', daily: 5, max: 100 },
  mine: { name: '채광 힘 모으기', desc: '누르고 있으면 힘이 차오릅니다. 노란 구간에서 손을 떼세요(10번).', daily: 5, max: 100 },
  spike: { name: '함정 피하기', desc: '매시 정각부터 10분 동안만 열립니다. 왼쪽·오른쪽을 눌러 떨어지는 가시를 피하세요(40초).', daily: 24, max: 100 },
};
/** 함정 피하기가 열리는 시간(매시 정각부터 몇 분) */
export const SPIKE_WINDOW = 10;

export interface MiniState { day: string; plays: Record<string, number>; best: Record<string, number>; spikeKey: string }
export const newMini = (): MiniState => ({ day: '', plays: {}, best: {}, spikeKey: '' });
const hourKey = (now: number) => `${today(now)}T${new Date(now).getHours()}`;

function roll(acc: Account, now: number) { const d = today(now); if (acc.mini.day !== d) acc.mini = { ...acc.mini, day: d, plays: {} }; }
export function playsLeft(acc: Account, kind: GameKind, now: number): number {
  roll(acc, now);
  return Math.max(0, GAMES[kind].daily - (acc.mini.plays[kind] ?? 0));
}
/** 함정 피하기를 지금 할 수 있는가(시간 창 안, 이번 시간에 아직 안 함) */
export const spikeOpen = (acc: Account, now: number) => new Date(now).getMinutes() < SPIKE_WINDOW && acc.mini.spikeKey !== hourKey(now);

/** 점수 → 보상(기술 경험치·재료·코인). 미리보기에도 쓴다 */
export function gameReward(c: Character, kind: GameKind, score: number): { coins: number; items: [string, number][]; skill?: { key: 'mining' | 'chopping'; xp: number } } {
  const s = Math.max(0, Math.min(GAMES[kind].max, Math.floor(score)));
  if (kind === 'chop') {
    const lv = c.skills.chopping.lv, log = lv >= 22 ? 'moonlog' : lv >= 12 ? 'willowlog' : lv >= 5 ? 'silverlog' : 'log';
    return { coins: s * 2, items: s ? [[log, Math.ceil(s / 8)]] : [], skill: { key: 'chopping', xp: Math.round(s * (4 + lv * 1.5)) } };
  }
  if (kind === 'mine') {
    const lv = c.skills.mining.lv, ore = lv >= 20 ? 'ore_gold' : lv >= 10 ? 'ore_blue' : 'ore';
    return { coins: s * 2, items: s ? [[ore, Math.ceil(s / 8)]] : [], skill: { key: 'mining', xp: Math.round(s * (4 + lv * 1.5)) } };
  }
  return { coins: s * 8, items: s >= 60 ? [['arena_ticket', 1]] : s >= 30 ? [['forge_oil', 2]] : [] };
}

/** 한 판 끝: 판수·시간 창을 확인하고 보상을 준다 */
export function finishGame(acc: Account, c: Character, kind: GameKind, score: number, now: number): string | null {
  if (!GAMES[kind]) return '없는 미니게임';
  if (playsLeft(acc, kind, now) <= 0) return '오늘은 더 할 수 없습니다';
  if (kind === 'spike') { if (!spikeOpen(acc, now)) return '지금은 열리지 않았습니다'; acc.mini.spikeKey = hourKey(now); }
  const s = Math.max(0, Math.min(GAMES[kind].max, Math.floor(score)));
  acc.mini.plays[kind] = (acc.mini.plays[kind] ?? 0) + 1;
  acc.mini.best[kind] = Math.max(acc.mini.best[kind] ?? 0, s);
  const r = gameReward(c, kind, s);
  acc.coins += r.coins;
  for (const [id, n] of r.items) addItemSome(c, id, n);
  if (r.skill) gainSkillXp(c, r.skill.key, r.skill.xp);
  return null;
}

// ───────── (옛) 수호 토템: 기도 시스템으로 합쳐짐. 저장 데이터 옮기기에만 쓴다 ─────────
export const TOTEM = { daily: 3, seconds: 60, maxKills: 90, hp: 5 };
export type BlessKey = 'dmg' | 'afk' | 'xp';
export const BLESS: Record<BlessKey, { name: string; per: number; unit: string; cost: number; grow: number; max: number }> = {
  dmg: { name: '수호의 축복', per: 1, unit: '% 공격력', cost: 20, grow: 1.35, max: 25 },
  xp: { name: '지혜의 축복', per: 1, unit: '% 경험치', cost: 20, grow: 1.35, max: 25 },
  afk: { name: '평온의 축복', per: 0.3, unit: '%p 방치 효율', cost: 35, grow: 1.4, max: 20 },
};
export interface TotemState { day: string; runs: number; souls: number; best: number; bless: Record<BlessKey, number> }
export const newTotem = (): TotemState => ({ day: '', runs: 0, souls: 0, best: 0, bless: { dmg: 0, xp: 0, afk: 0 } });
/** 예전 수호 토템(1월드)의 영혼과 축복은 기도 시스템의 이끼 영혼으로 옮긴다(축복에 쓴 영혼도 돌려준다) */
export function legacyTotemSouls(t: TotemState | undefined): number {
  if (!t) return 0;
  let n = t.souls;
  for (const k of Object.keys(BLESS) as BlessKey[]) for (let lv = 0; lv < (t.bless?.[k] ?? 0); lv++) n += Math.round(BLESS[k].cost * Math.pow(BLESS[k].grow, lv));
  return n;
}
