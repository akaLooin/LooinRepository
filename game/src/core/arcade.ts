// 2월드 오아시스 마을의 오락실과 낚시꾼 포피(원작의 2월드 방치 놀이).
//  · 오락실: 공이 시간마다 하나씩 쌓인다(최대 100). 공 하나를 쏘면 열두 가지 오락실 보너스 가운데 하나가 1 오르거나 코인이 나온다.
//    어떤 보너스가 오를지는 계정 씨앗과 쏜 횟수로 정해진다(기기와 서버가 같다).
//  · 포피: 오아시스 샘에서 저절로 물고기를 낚는다(접속하지 않아도). 물고기로 포피의 낚시 도구를 올리면 계정 보너스가 생긴다.
import { BonusKey } from './data';
import type { Account } from './state';
import { hash } from './companions';

export interface ArcadeBonus { id: string; name: string; eff: BonusKey; per: number; unit: string; max: number }
export const ARCADE: ArcadeBonus[] = [
  { id: 'ar_dmg', name: '두더지 잡기', eff: 'dmg', per: 0.5, unit: '%', max: 50 },
  { id: 'ar_hp', name: '펀치 기계', eff: 'hpPct', per: 0.5, unit: '%', max: 50 },
  { id: 'ar_xp', name: '퀴즈 상자', eff: 'xp', per: 0.4, unit: '%', max: 50 },
  { id: 'ar_drop', name: '집게 뽑기', eff: 'drop', per: 0.4, unit: '%', max: 50 },
  { id: 'ar_coins', name: '동전 밀기', eff: 'coins', per: 0.8, unit: '%', max: 50 },
  { id: 'ar_card', name: '카드 뒤집기', eff: 'card', per: 0.4, unit: '%', max: 50 },
  { id: 'ar_str', name: '망치 내려치기', eff: 'str', per: 1, unit: '', max: 50 },
  { id: 'ar_agi', name: '공 피하기', eff: 'agi', per: 1, unit: '', max: 50 },
  { id: 'ar_wis', name: '기억력 게임', eff: 'wis', per: 1, unit: '', max: 50 },
  { id: 'ar_luk', name: '룰렛', eff: 'luk', per: 1, unit: '', max: 50 },
  { id: 'ar_mine', name: '보석 맞추기', eff: 'mining', per: 1, unit: '%', max: 50 },
  { id: 'ar_afk', name: '졸음 참기', eff: 'afk', per: 0.08, unit: '%p', max: 50 },
];
export const ARC = { ballMins: 30, ballMax: 100, coinChance: 0.25 };
export interface Arcade { balls: number; frac: number; t: number; shots: number; up: Record<string, number> }
export const newArcade = (): Arcade => ({ balls: 5, frac: 0, t: 0, shots: 0, up: {} });

export function arcadeSettle(acc: Pick<Account, 'arcade'>, now: number) {
  const a = acc.arcade;
  if (!a.t) { a.t = now; return; }
  if (now <= a.t) return;
  a.frac += (now - a.t) / 60_000 / ARC.ballMins; a.t = now;
  const n = Math.floor(a.frac);
  if (n > 0) { a.balls = Math.min(ARC.ballMax, a.balls + n); a.frac -= n; }
  if (a.balls >= ARC.ballMax) a.frac = 0;
}
/** 공 하나 쏘기: 오른 보너스 id 또는 'coins' */
export function shootBall(acc: Account, now: number): { hit: string; coins: number } | string {
  arcadeSettle(acc, now);
  const a = acc.arcade;
  if (a.balls < 1) return '공이 없습니다(30분마다 하나)';
  a.balls--; a.shots++;
  const r = hash((acc.petSeed ^ (a.shots * 2654435761)) >>> 0);
  if ((r % 1000) / 1000 < ARC.coinChance) {
    const coins = 100 * Math.max(1, acc.characters.reduce((m, c) => Math.max(m, c.level), 1));
    acc.coins += coins;
    return { hit: 'coins', coins };
  }
  const open = ARCADE.filter((b) => (a.up[b.id] ?? 0) < b.max);
  if (!open.length) { acc.coins += 1000; return { hit: 'coins', coins: 1000 }; }
  const b = open[(r >>> 10) % open.length];
  a.up[b.id] = (a.up[b.id] ?? 0) + 1;
  return { hit: b.id, coins: 0 };
}
export function arcadeBonus(a: Arcade | undefined, add: (k: BonusKey, v: number) => void) {
  if (!a) return;
  for (const b of ARCADE) { const lv = a.up[b.id] ?? 0; if (lv) add(b.eff, lv * b.per); }
}

// ───────── 낚시꾼 포피 ─────────
export interface PoppyUp { id: string; name: string; desc: string; eff?: BonusKey; per: number; unit: string; cost: number; grow: number; max: number }
export const POPPY: PoppyUp[] = [
  { id: 'pp_rod', name: '튼튼한 낚싯대', desc: '시간당 물고기 +40%', per: 40, unit: '%', cost: 20, grow: 1.4, max: 25 },
  { id: 'pp_bait', name: '반짝 미끼', desc: '시간당 물고기 ×(단계마다 +25%)', per: 25, unit: '%', cost: 60, grow: 1.6, max: 15 },
  { id: 'pp_fish', name: '물고기 요리', desc: '최대 체력', eff: 'hpPct', per: 1, unit: '%', cost: 40, grow: 1.35, max: 40 },
  { id: 'pp_tales', name: '낚시 이야기', desc: '경험치', eff: 'xp', per: 1, unit: '%', cost: 50, grow: 1.35, max: 40 },
  { id: 'pp_lucky', name: '행운의 찌', desc: '드롭률', eff: 'drop', per: 0.8, unit: '%', cost: 70, grow: 1.4, max: 40 },
  { id: 'pp_net', name: '그물 수선', desc: '낚시 효율', eff: 'fishing', per: 3, unit: '%', cost: 30, grow: 1.3, max: 40 },
];
export interface Poppy { fish: number; t: number; up: Record<string, number> }
export const newPoppy = (): Poppy => ({ fish: 0, t: 0, up: {} });
export const poppyRate = (p: Poppy) => 6 * (1 + (p.up.pp_rod ?? 0) * 0.4) * (1 + (p.up.pp_bait ?? 0) * 0.25);
export const poppyCost = (u: PoppyUp, lv: number) => Math.ceil(u.cost * Math.pow(u.grow, lv));
export function poppySettle(acc: Pick<Account, 'poppy'>, now: number) {
  const p = acc.poppy;
  if (!p.t) { p.t = now; return; }
  if (now <= p.t) return;
  p.fish += (poppyRate(p) * (now - p.t)) / 3_600_000; p.t = now;
}
export function upPoppy(acc: Account, id: string, now: number): string | null {
  poppySettle(acc, now);
  const u = POPPY.find((x) => x.id === id), p = acc.poppy;
  if (!u) return '없는 항목';
  const lv = p.up[id] ?? 0;
  if (lv >= u.max) return '최대 단계입니다';
  const cost = poppyCost(u, lv);
  if (p.fish < cost) return '물고기가 부족합니다';
  p.fish -= cost; p.up[id] = lv + 1;
  return null;
}
export function poppyBonus(p: Poppy | undefined, add: (k: BonusKey, v: number) => void) {
  if (!p) return;
  for (const u of POPPY) { const lv = p.up[u.id] ?? 0; if (lv && u.eff) add(u.eff, lv * u.per); }
}
