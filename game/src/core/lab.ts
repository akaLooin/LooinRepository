// 연구실(4월드, 계정 공용): 성운 정거장의 연구실.
//  · 연구판 위 자리(12곳)에 캐릭터를 세운다. 본체(왼쪽)의 신호 범위 안에 있거나, 이미 연결된 캐릭터의 범위 안에 있으면 연결된다(사슬).
//  · 캐릭터의 연결 범위는 그 캐릭터의 연구 레벨만큼 넓어진다. 연결된 캐릭터는 시간마다 연구 경험치를 얻는다.
//  · 연구판의 장치·보석은 연결된 캐릭터의 범위 안에 들어오면 켜진다. 장치는 처음부터 있고, 보석은 향신료로 연다.
//  · 장치 중에는 주방·둥지·향신료를 빠르게 하는 것도 있다(요리·번식과 이어짐).
import { BonusKey } from './data';
import type { Account, Character } from './state';
import { gainSkillXp } from './state';

export const LAB = { w: 320, h: 180, main: { x: 26, y: 90 }, mainRange: 64, baseRange: 48, perLv: 1.6, linkBonus: 20, xpPerHour: 24 };
/** 캐릭터가 설 수 있는 자리 */
export const LAB_SPOTS: { x: number; y: number }[] = [
  { x: 80, y: 60 }, { x: 80, y: 124 }, { x: 128, y: 28 }, { x: 134, y: 92 }, { x: 128, y: 154 }, { x: 186, y: 58 },
  { x: 190, y: 124 }, { x: 236, y: 26 }, { x: 242, y: 90 }, { x: 236, y: 156 }, { x: 292, y: 56 }, { x: 292, y: 126 },
];
export type LabSpecial = 'kitchen' | 'nest' | 'spice' | 'link' | 'labxp';
export interface LabNodeDef { id: string; name: string; x: number; y: number; eff?: BonusKey; v?: number; unit?: string; special?: LabSpecial; desc: string; jewel?: boolean; cost?: [string, number][] }
export const LAB_NODES: LabNodeDef[] = [
  { id: 'n_xp', name: '기억 증폭기', x: 104, y: 92, eff: 'xp', v: 10, unit: '%', desc: '경험치 +10%' },
  { id: 'n_kitchen', name: '자동 국자', x: 106, y: 20, special: 'kitchen', desc: '모든 주방 요리 속도 ×1.25' },
  { id: 'n_drop', name: '행운 탐지기', x: 160, y: 124, eff: 'drop', v: 8, unit: '%', desc: '드롭률 +8%' },
  { id: 'n_nest', name: '부화 온열기', x: 160, y: 58, special: 'nest', desc: '알 낳는 속도 ×1.25' },
  { id: 'n_link', name: '신호 증폭탑', x: 214, y: 92, special: 'link', desc: '모든 연결 범위 +20' },
  { id: 'n_dmg', name: '전투 분석기', x: 214, y: 160, eff: 'dmg', v: 8, unit: '%', desc: '공격력 +8%' },
  { id: 'n_spice', name: '향신료 수집기', x: 266, y: 58, special: 'spice', desc: '향신료 모이는 속도 ×1.5' },
  { id: 'n_afk', name: '꿈 기록장치', x: 300, y: 92, eff: 'afk', v: 2, unit: '%p', desc: '방치 효율 +2%p' },
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
export interface Lab { t: number; members: LabMember[]; jewels: string[] }
export const newLab = (): Lab => ({ t: 0, members: [], jewels: [] });

type LabAcc = Pick<Account, 'lab' | 'characters'>;
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const charOf = (acc: LabAcc, id: number): Character | undefined => acc.characters.find((c) => c.id === id);
export const labRange = (lv: number, link = false) => LAB.baseRange + lv * LAB.perLv + (link ? LAB.linkBonus : 0);

export interface LabState { linked: Set<number>; on: Set<string>; range: Record<number, number> }
/** 지금 연결된 캐릭터와 켜진 장치·보석 */
export function labState(acc: LabAcc | Partial<LabAcc>): LabState {
  const lab = acc.lab, chars = acc.characters ?? [];
  const empty: LabState = { linked: new Set(), on: new Set(), range: {} };
  if (!lab) return empty;
  const pass = (link: boolean): LabState => {
    const range: Record<number, number> = {};
    for (const m of lab.members) range[m.id] = labRange(chars.find((c) => c.id === m.id)?.skills.lab?.lv ?? 1, link);
    const linked = new Set<number>();
    // 본체에서 시작해 범위가 닿는 캐릭터를 차례로 잇는다(서로의 범위 중 큰 쪽이 닿으면 연결)
    let grew = true;
    while (grew) {
      grew = false;
      for (const m of lab.members) {
        if (linked.has(m.id)) continue;
        const p = LAB_SPOTS[m.spot];
        const ok = dist(p, LAB.main) <= Math.max(LAB.mainRange, range[m.id]) ||
          [...linked].some((id) => { const o = lab.members.find((x) => x.id === id)!; return dist(p, LAB_SPOTS[o.spot]) <= Math.max(range[id], range[m.id]); });
        if (ok) { linked.add(m.id); grew = true; }
      }
    }
    const on = new Set<string>();
    for (const n of LAB_NODES) {
      if (n.jewel && !lab.jewels.includes(n.id)) continue;
      if ([...linked].some((id) => dist(LAB_SPOTS[lab.members.find((x) => x.id === id)!.spot], n) <= range[id])) on.add(n.id);
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
    const x = h * LAB.xpPerHour * mult + m.frac, whole = Math.floor(x);
    m.frac = x - whole;
    if (whole > 0) gainSkillXp(c, 'lab', whole);
  }
}
export function placeInLab(acc: Account, c: Character, spot: number, now: number): string | null {
  labSettle(acc, now);
  if (!Number.isInteger(spot) || !LAB_SPOTS[spot]) return '없는 자리';
  const lab = acc.lab, other = lab.members.find((m) => m.spot === spot);
  if (other && other.id !== c.id) return '다른 캐릭터가 서 있는 자리입니다';
  const me = lab.members.find((m) => m.id === c.id);
  if (me) me.spot = spot; else lab.members.push({ id: c.id, spot, frac: 0 });
  return null;
}
export function leaveLab(acc: Account, c: Character, now: number): string | null {
  labSettle(acc, now);
  const n = acc.lab.members.length;
  acc.lab.members = acc.lab.members.filter((m) => m.id !== c.id);
  return acc.lab.members.length < n ? null : '연구실에 있지 않습니다';
}
export function unlockJewel(acc: Account, id: string, now: number): string | null {
  labSettle(acc, now);
  const n = LAB_NODE[id];
  if (!n?.jewel || !n.cost) return '없는 보석';
  if (acc.lab.jewels.includes(id)) return '이미 연 보석입니다';
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
