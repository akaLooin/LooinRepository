// 연구실(4월드, 계정 공용): 성운 정거장의 연구실. 원작처럼:
//  · 연구판 어디에나(촘촘한 격자) 캐릭터를 세운다. 장치는 대부분 다른 시스템의 배수(우표 ×1.5, 정제소 ×2 …).
//  · 칩: 캐릭터마다 끼우는 작은 부품(연결 범위·능력치). 보석: 매주 바뀌는 상점에 나온 것만 향신료로 연다.
//  · 연구판 위 자리(12곳)에 캐릭터를 세운다. 본체(왼쪽)의 신호 범위 안에 있거나, 이미 연결된 캐릭터의 범위 안에 있으면 연결된다(사슬).
//  · 캐릭터의 연결 범위는 그 캐릭터의 연구 레벨만큼 넓어진다. 연결된 캐릭터는 시간마다 연구 경험치를 얻는다.
//  · 연구판의 장치·보석은 연결된 캐릭터의 범위 안에 들어오면 켜진다. 장치는 처음부터 있고, 보석은 향신료로 연다.
//  · 장치 중에는 주방·둥지·향신료를 빠르게 하는 것도 있다(요리·번식과 이어짐).
import { BonusKey, classSkillMult } from './data';
import type { Account, Character } from './state';
import { gainSkillXp } from './state';

export const LAB = { w: 320, h: 180, main: { x: 26, y: 90 }, mainRange: 64, baseRange: 48, perLv: 1.6, linkBonus: 20, xpPerHour: 24 };
/** 캐릭터가 설 수 있는 자리: 판 전체의 촘촘한 격자(원작처럼 거의 자유롭게) */
export const LAB_SPOTS: { x: number; y: number }[] = [];
for (let y = 10; y <= 170; y += 20) for (let x = 50; x <= 310; x += 20) LAB_SPOTS.push({ x, y });
/** 예전 12자리 → 가장 가까운 격자 자리 */
const OLD_SPOTS = [[80, 60], [80, 124], [128, 28], [134, 92], [128, 154], [186, 58], [190, 124], [236, 26], [242, 90], [236, 156], [292, 56], [292, 126]];
export const nearestSpot = (x: number, y: number) => LAB_SPOTS.reduce((bi, p, i) => (Math.hypot(p.x - x, p.y - y) < Math.hypot(LAB_SPOTS[bi].x - x, LAB_SPOTS[bi].y - y) ? i : bi), 0);
export type LabSpecial = 'kitchen' | 'nest' | 'spice' | 'link' | 'labxp' | 'stamps' | 'refinery' | 'bubbles' | 'shrines';
export interface LabNodeDef { id: string; name: string; x: number; y: number; eff?: BonusKey; v?: number; unit?: string; special?: LabSpecial; desc: string; jewel?: boolean; cost?: [string, number][] }
export const LAB_NODES: LabNodeDef[] = [
  { id: 'n_xp', name: '우표 증폭기', x: 104, y: 92, special: 'stamps', desc: '모든 우표 효과 ×1.5' },
  { id: 'n_kitchen', name: '자동 국자', x: 106, y: 20, special: 'kitchen', desc: '모든 주방 요리 속도 ×1.25' },
  { id: 'n_drop', name: '정제 촉매', x: 160, y: 124, special: 'refinery', desc: '정제소 소금 ×2' },
  { id: 'n_nest', name: '부화 온열기', x: 160, y: 58, special: 'nest', desc: '알 낳는 속도 ×1.25' },
  { id: 'n_link', name: '신호 증폭탑', x: 214, y: 92, special: 'link', desc: '모든 연결 범위 +20' },
  { id: 'n_dmg', name: '거품 압축기', x: 214, y: 160, special: 'bubbles', desc: '모든 연금 거품 효과 ×1.25' },
  { id: 'n_spice', name: '향신료 수집기', x: 266, y: 58, special: 'spice', desc: '향신료 모이는 속도 ×1.5' },
  { id: 'n_afk', name: '사당 공명기', x: 300, y: 92, special: 'shrines', desc: '모든 사당 효과 ×1.5' },
  // 보석(향신료로 연다)
  { id: 'j_amethyst', name: '자수정 보석', x: 56, y: 22, jewel: true, eff: 'coins', v: 10, unit: '%', desc: '코인 획득 +10%', cost: [['sp_dust', 200], ['sp_salt', 100]] },
  { id: 'j_ruby', name: '홍옥 보석', x: 56, y: 160, jewel: true, eff: 'hpPct', v: 10, unit: '%', desc: '최대 체력 +10%', cost: [['sp_salt', 200], ['sp_honey', 120]] },
  { id: 'j_topaz', name: '황옥 보석', x: 186, y: 10, jewel: true, eff: 'mining', v: 15, unit: '%', desc: '채광 효율 +15%', cost: [['sp_honey', 200], ['sp_pepper', 120]] },
  { id: 'j_emerald', name: '녹옥 보석', x: 186, y: 172, jewel: true, eff: 'chopping', v: 15, unit: '%', desc: '벌목 효율 +15%', cost: [['sp_pepper', 200], ['sp_cinna', 120]] },
  { id: 'j_sapphire', name: '청옥 보석', x: 268, y: 172, jewel: true, eff: 'catching', v: 15, unit: '%', desc: '곤충 채집 효율 +15%', cost: [['sp_cinna', 200], ['sp_mint', 120]] },
  { id: 'j_pearl', name: '별진주 보석', x: 300, y: 18, jewel: true, special: 'labxp', desc: '연구 경험치 ×1.5', cost: [['sp_mint', 200], ['sp_vanilla', 150]] },
];
export const LAB_NODE: Record<string, LabNodeDef> = Object.fromEntries(LAB_NODES.map((n) => [n.id, n]));

export interface LabMember { id: number; spot: number; frac: number }
export interface Lab { t: number; members: LabMember[]; jewels: string[]; /** 캐릭터마다 끼운 칩 */ chips: Record<number, string[]>; /** 가진 칩 */ chipBag: string[]; grid?: number }
export const newLab = (): Lab => ({ t: 0, members: [], jewels: [], chips: {}, chipBag: [], grid: 2 });
export function fixLab(l: Lab) {
  l.chips ??= {}; l.chipBag ??= [];
  // 예전 12자리 저장 → 촘촘한 격자로
  if (!l.grid) { for (const m of l.members) { const o = OLD_SPOTS[m.spot]; if (o) m.spot = nearestSpot(o[0], o[1]); } l.grid = 2; }
}

type LabAcc = Pick<Account, 'lab' | 'characters'>;
/** 요리사·연구원은 원작처럼 그 자리(성운 정거장)에 머물러 있어야 일한다. 다른 맵으로 가면 쉬고, 돌아오면 다시 일한다 */
export const STATION_MAP = 'nebtown';
export const atStation = (acc: { characters?: Character[] }, id: number) => (acc.characters ?? []).find((c) => c.id === id)?.mapId === STATION_MAP;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const charOf = (acc: LabAcc, id: number): Character | undefined => acc.characters.find((c) => c.id === id);
export const labRange = (lv: number, link = false) => LAB.baseRange + lv * LAB.perLv + (link ? LAB.linkBonus : 0);

export interface LabState { linked: Set<number>; on: Set<string>; range: Record<number, number> }
/** 지금 연결된 캐릭터와 켜진 장치·보석 */
export function labState(acc: LabAcc | Partial<LabAcc>): LabState {
  const lab = acc.lab, chars = acc.characters ?? [];
  const empty: LabState = { linked: new Set(), on: new Set(), range: {} };
  if (!lab) return empty;
  const members = lab.members.filter((m) => atStation(acc, m.id));
  const pass = (link: boolean): LabState => {
    const range: Record<number, number> = {};
    for (const m of members) range[m.id] = labRange(chars.find((c) => c.id === m.id)?.skills.lab?.lv ?? 1, link) + (lab.chips?.[m.id]?.includes('chip_range') ? CHIP.chip_range.v : 0);
    const linked = new Set<number>();
    // 본체에서 시작해 범위가 닿는 캐릭터를 차례로 잇는다(서로의 범위 중 큰 쪽이 닿으면 연결)
    let grew = true;
    while (grew) {
      grew = false;
      for (const m of members) {
        if (linked.has(m.id)) continue;
        const p = LAB_SPOTS[m.spot];
        const ok = dist(p, LAB.main) <= Math.max(LAB.mainRange, range[m.id]) ||
          [...linked].some((id) => { const o = members.find((x) => x.id === id)!; return dist(p, LAB_SPOTS[o.spot]) <= Math.max(range[id], range[m.id]); });
        if (ok) { linked.add(m.id); grew = true; }
      }
    }
    const on = new Set<string>();
    for (const n of LAB_NODES) {
      if (n.jewel && !lab.jewels.includes(n.id)) continue;
      if ([...linked].some((id) => dist(LAB_SPOTS[members.find((x) => x.id === id)!.spot], n) <= range[id])) on.add(n.id);
    }
    return { linked, on, range };
  };
  const first = pass(false);
  return first.on.has('n_link') ? pass(true) : first;
}
/** 요리·번식과 이어지는 장치 배율 */
export function labMult(acc: Partial<LabAcc>, sp: LabSpecial): number {
  if (!acc.lab || !acc.lab.members.length) return 1;
  const on = labState(acc).on;
  if (sp === 'kitchen') return on.has('n_kitchen') ? 1.25 : 1;
  if (sp === 'nest') return on.has('n_nest') ? 1.25 : 1;
  if (sp === 'spice') return on.has('n_spice') ? 1.5 : 1;
  if (sp === 'labxp') return on.has('j_pearl') ? 1.5 : 1;
  if (sp === 'stamps') return on.has('n_xp') ? 1.5 : 1;
  if (sp === 'refinery') return on.has('n_drop') ? 2 : 1;
  if (sp === 'bubbles') return on.has('n_dmg') ? 1.25 : 1;
  if (sp === 'shrines') return on.has('n_afk') ? 1.5 : 1;
  return 1;
}

export function labSettle(acc: Account, now: number) {
  const lab = acc.lab;
  if (!lab.t) { lab.t = now; return; }
  if (now <= lab.t) return;
  const h = (now - lab.t) / 3_600_000;
  lab.t = now;
  const st = labState(acc), mult = labMult(acc, 'labxp');
  for (const m of lab.members) {
    if (!st.linked.has(m.id)) continue;
    const c = charOf(acc, m.id);
    if (!c) continue;
    const x = h * LAB.xpPerHour * mult * classSkillMult(c, 'lab') + m.frac, whole = Math.floor(x);
    m.frac = x - whole;
    if (whole > 0) gainSkillXp(c, 'lab', whole);
  }
}
export function placeInLab(acc: Account, c: Character, spot: number, now: number): string | null {
  labSettle(acc, now);
  if (!Number.isInteger(spot) || !LAB_SPOTS[spot]) return '없는 자리';
  if (c.mapId !== STATION_MAP) return '성운 정거장에 있어야 연구할 수 있습니다';
  const lab = acc.lab, other = lab.members.find((m) => m.spot === spot);
  if (other && other.id !== c.id) return '다른 캐릭터가 서 있는 자리입니다';
  const me = lab.members.find((m) => m.id === c.id);
  if (me) me.spot = spot; else lab.members.push({ id: c.id, spot, frac: 0 });
  // 한 캐릭터는 한 곳에서만 일한다: 연구실에 서면 식탁에서 물러난다
  const ci = acc.cook.chefs.indexOf(c.id);
  if (ci >= 0) acc.cook.chefs.splice(ci, 1);
  if (acc.breed?.keepers) acc.breed.keepers = acc.breed.keepers.filter((x) => x !== c.id);
  return null;
}
export function leaveLab(acc: Account, c: Character, now: number): string | null {
  labSettle(acc, now);
  const n = acc.lab.members.length;
  acc.lab.members = acc.lab.members.filter((m) => m.id !== c.id);
  return acc.lab.members.length < n ? null : '연구실에 있지 않습니다';
}
/** 이번 주 보석 상점에 나온 보석(주마다 3개, 계정 씨앗으로 정해진다) */
export function weeklyJewels(seed: number, now: number): string[] {
  const week = Math.floor(now / (7 * 86_400_000));
  const all = LAB_NODES.filter((n) => n.jewel).map((n) => n.id);
  const out: string[] = [];
  let h = (seed ^ (week * 2654435761)) >>> 0;
  while (out.length < 3 && out.length < all.length) { h = Math.imul(h ^ (h >>> 15), 2246822519) >>> 0; const id = all[h % all.length]; if (!out.includes(id)) out.push(id); }
  return out;
}
export function unlockJewel(acc: Account, id: string, now: number): string | null {
  labSettle(acc, now);
  const n = LAB_NODE[id];
  if (!n?.jewel || !n.cost) return '없는 보석';
  if (acc.lab.jewels.includes(id)) return '이미 연 보석입니다';
  if (!weeklyJewels(acc.petSeed, now).includes(id)) return '이번 주 보석 상점에 없는 보석입니다(매주 바뀝니다)';
  const sp = acc.cook.spices;
  for (const [s, k] of n.cost) if ((sp[s] ?? 0) < k) return '향신료가 부족합니다';
  for (const [s, k] of n.cost) sp[s] -= k;
  acc.lab.jewels.push(id);
  return null;
}
export function labBonus(a: Partial<LabAcc>, add: (k: BonusKey, v: number) => void) {
  if (!a.lab || !a.lab.members.length) return;
  const on = labState(a).on;
  for (const n of LAB_NODES) if (n.eff && n.v && on.has(n.id)) add(n.eff, n.v);
}

// ───────── 칩 ─────────
export interface ChipDef { id: string; name: string; eff?: BonusKey; v: number; unit: string; desc: string; cost: [string, number][] }
export const CHIPS: ChipDef[] = [
  { id: 'chip_range', name: '안테나 칩', v: 15, unit: '', desc: '이 캐릭터의 연구실 연결 범위 +15', cost: [['sp_dust', 300], ['sp_salt', 150]] },
  { id: 'chip_dmg', name: '전투 칩', eff: 'dmg', v: 6, unit: '%', desc: '공격력 +6%', cost: [['sp_salt', 300], ['sp_honey', 150]] },
  { id: 'chip_hp', name: '방호 칩', eff: 'hpPct', v: 8, unit: '%', desc: '최대 체력 +8%', cost: [['sp_honey', 300], ['sp_pepper', 150]] },
  { id: 'chip_xp', name: '기억 칩', eff: 'xp', v: 6, unit: '%', desc: '경험치 +6%', cost: [['sp_pepper', 300], ['sp_cinna', 150]] },
  { id: 'chip_drop', name: '탐지 칩', eff: 'drop', v: 5, unit: '%', desc: '드롭률 +5%', cost: [['sp_cinna', 300], ['sp_mint', 150]] },
  { id: 'chip_card', name: '수집 칩', eff: 'card', v: 6, unit: '%', desc: '카드 드롭률 +6%', cost: [['sp_mint', 300], ['sp_vanilla', 150]] },
  { id: 'chip_luk', name: '행운 칩', eff: 'luk', v: 25, unit: '', desc: '행운 +25', cost: [['sp_vanilla', 300], ['sp_dust', 300]] },
  { id: 'chip_afk', name: '수면 칩', eff: 'afk', v: 2, unit: '%p', desc: '방치 효율 +2%p', cost: [['sp_honey', 500], ['sp_vanilla', 300]] },
];
export const CHIP: Record<string, ChipDef> = Object.fromEntries(CHIPS.map((x) => [x.id, x]));
/** 칩 칸: 연구 Lv.1 1칸, Lv.40 2칸, Lv.80 3칸 */
export const chipSlots = (c: Character) => 1 + ((c.skills.lab?.lv ?? 1) >= 40 ? 1 : 0) + ((c.skills.lab?.lv ?? 1) >= 80 ? 1 : 0);
export function buyChip(acc: Account, id: string): string | null {
  fixLab(acc.lab);
  const d = CHIP[id];
  if (!d) return '없는 칩';
  const sp = acc.cook.spices;
  for (const [s, k] of d.cost) if ((sp[s] ?? 0) < k) return '향신료가 부족합니다';
  for (const [s, k] of d.cost) sp[s] -= k;
  acc.lab.chipBag.push(id);
  return null;
}
/** 가진 칩을 이 캐릭터에 끼우거나 빼기 */
export function toggleChip(acc: Account, c: Character, id: string): string | null {
  fixLab(acc.lab);
  const mine = (acc.lab.chips[c.id] ??= []), i = mine.indexOf(id);
  if (i >= 0) { mine.splice(i, 1); acc.lab.chipBag.push(id); return null; }
  const bi = acc.lab.chipBag.indexOf(id);
  if (bi < 0) return '그 칩이 없습니다';
  if (mine.length >= chipSlots(c)) return `칩은 ${chipSlots(c)}개까지(연구 Lv.40·80에 한 칸씩)`;
  acc.lab.chipBag.splice(bi, 1); mine.push(id);
  return null;
}
/** 이 캐릭터가 끼운 칩의 효과 */
export function chipBonus(c: Character, a: Partial<Pick<Account, 'lab'>>, add: (k: BonusKey, v: number) => void) {
  for (const id of a.lab?.chips?.[c.id] ?? []) { const d = CHIP[id]; if (d?.eff) add(d.eff, d.v); }
}
