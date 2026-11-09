// Editable content registry for the admin panel, and the override layer that applies edits on top of the code data.
// Overrides come from src/data/overrides.json (baked into builds) and then from this device's local storage.
import { BUILDINGS } from './buildings';
import { ALIGNMENTS, FACTIONS, FACTION_UPGRADES } from './factions';
import { SPELLS } from './spells';
import { GENERAL_UPGRADES, TROPHIES } from './general';
import { ARTIFACTS, ASCENSION, BLOODLINES, CHALLENGES, FACILITIES, HERITAGES, LEGES, RESEARCH_COST, RESEARCH_UPGRADES, UNIQUES } from './endgame';
import { TERMS, TERM_LABELS } from './terms';
import { AUTOCAST_UPGRADES, GEM_UPGRADES, MANA_UPGRADES, RUBY_UPGRADES, SECRETS, SPELL_UPGRADES } from './trophyups';
import { BASE } from '../engine/engine';
import baked from './overrides.json';

export type FieldType = 'text' | 'longtext' | 'number' | 'color';
export interface Field { key: string; label: string; type: FieldType }
export interface Collection {
  id: string; label: string; fields: Field[];
  items: () => { id: string; obj: Record<string, unknown>; title: string }[];
}

const T = (key: string, label = '이름'): Field => ({ key, label, type: 'text' });
const L = (key: string, label = '설명'): Field => ({ key, label, type: 'longtext' });
const N = (key: string, label: string): Field => ({ key, label, type: 'number' });
const list = <X extends object>(arr: X[], id: (x: X) => string, title?: (x: X) => string) => () =>
  arr.map((x) => ({ id: id(x), obj: x as unknown as Record<string, unknown>, title: title ? title(x) : id(x) }));

export const COLLECTIONS: Collection[] = [
  { id: 'terms', label: '게임 용어', fields: [T('value', '표시 이름')],
    items: () => (Object.keys(TERMS) as (keyof typeof TERMS)[]).map((k) => ({ id: k, title: TERM_LABELS[k], obj: { get value() { return TERMS[k]; }, set value(v: unknown) { TERMS[k] = String(v); } } })) },
  { id: 'base', label: '기본 수치', fields: [N('value', '값')],
    items: () => (Object.keys(BASE) as (keyof typeof BASE)[]).map((k) => ({ id: k, title: BASE_LABELS[k] ?? k, obj: { get value() { return BASE[k]; }, set value(v: unknown) { BASE[k] = Number(v); } } })) },
  { id: 'ascension', label: '승천 수치', fields: [N('value', '값')],
    items: () => (['valueShift', 'costGrowth', 'excavationGrowth'] as const).map((k) => ({ id: k, title: ({ valueShift: '승천 후 보너스 배율 지수 (0.1 = x^0.1)', costGrowth: '승천 후 건물 가격 증가율', excavationGrowth: '승천 후 발굴 가격 증가율' })[k],
      obj: { get value() { return ASCENSION[k]; }, set value(v: unknown) { ASCENSION[k] = Number(v); } } })) },
  { id: 'buildings', label: '건물', fields: [T('ko'), N('cost', '기본 가격'), N('prod', '기본 생산/초')], items: list(BUILDINGS, (b) => b.id, (b) => `${b.tier}단계 ${b.alignment ?? '공통'}`) },
  { id: 'alignments', label: '성향', fields: [T('ko'), L('desc'), N('cost', '금화 가격'), T('color', '색')], items: list(ALIGNMENTS, (a) => a.id) },
  { id: 'factions', label: '진영', fields: [T('ko'), L('role', '역할 설명'), T('color', '색')], items: list(FACTIONS, (f) => f.id, (f) => `${f.id} (${f.kind})`) },
  { id: 'factionUpgrades', label: '진영 개선', fields: [T('ko'), L('desc'), N('cost', '금화 가격')], items: list(FACTION_UPGRADES, (u) => u.id, (u) => `${u.faction} ${u.tier}-${u.slot}`) },
  { id: 'spells', label: '주문', fields: [T('ko'), L('desc'), N('mana', '영감 비용'), N('duration', '지속(초)')], items: list(SPELLS, (s) => s.id) },
  { id: 'general', label: '일반 개선', fields: [T('ko'), L('desc'), N('cost', '금화 가격')], items: list(GENERAL_UPGRADES, (g) => g.id) },
  { id: 'trophyUps', label: '업적 개선 (영감·전설·자동 시전)', fields: [T('ko'), L('desc'), N('cost', '가격')], items: list([...MANA_UPGRADES, ...GEM_UPGRADES, ...AUTOCAST_UPGRADES], (u) => u.id) },
  { id: 'secrets', label: '비밀 업적', fields: [T('ko'), L('hint', '조건 설명'), L('reward', '보상 설명'), N('cost', '보상 개선 가격')], items: list(SECRETS, (x) => x.id) },
  { id: 'spellUps', label: '주문 강화', fields: [T('ko'), L('hint', '업적 조건'), L('desc'), N('cost', '가격'), N('manaDelta', '영감 비용 변화')], items: list(SPELL_UPGRADES, (x) => x.spell) },
  { id: 'rubyUps', label: '별사탕 강화', fields: [T('ko'), L('desc')], items: list(RUBY_UPGRADES, (x) => x.id) },
  { id: 'trophies', label: '명장면(업적)', fields: [T('ko'), L('desc')], items: list(TROPHIES, (x) => x.id) },
  { id: 'heritages', label: '유산', fields: [T('ko'), L('desc')], items: list(HERITAGES, (h) => h.faction) },
  { id: 'bloodlines', label: '혈통', fields: [T('ko'), L('desc')], items: list(BLOODLINES, (b) => b.faction) },
  { id: 'artifacts', label: '유물', fields: [T('ko'), L('desc'), N('at', '확정 발견 깊이'), N('chance', '발견 확률')], items: list(ARTIFACTS, (a) => a.id) },
  { id: 'challenges', label: '도전', fields: [T('ko'), L('clue', '단서'), L('reward', '보상 설명'), N('minR', '최소 환생')], items: list(CHALLENGES, (c) => c.id) },
  { id: 'facilities', label: '연구 시설', fields: [T('ko')], items: list(FACILITIES, (f) => f.id) },
  { id: 'uniques', label: '고유 건물', fields: [T('ko'), N('need', '필요 건물 수'), N('minR', '최소 환생')], items: list(UNIQUES, (u) => u.id, (u) => `${u.faction} · ${u.building}`) },
  { id: 'leges', label: '레게스 성향 (승천 2)', fields: [T('ko'), L('desc'), N('cost', '가격')], items: list(LEGES, (l) => l.id) },
  { id: 'researchCost', label: '연구 포인트 가격', fields: [N('value', '값')],
    items: () => (Object.keys(RESEARCH_COST) as (keyof typeof RESEARCH_COST)[]).map((k) => ({ id: k, title: ({ base: '금화 기본값', growth: '금화 증가율', ascBase: '승천 후 기본값', ascGrowth: '승천 후 증가율', ascOffset: '승천 후 지수 보정', fcPower: '조각 = (x+1)^이 값' })[k],
      obj: { get value() { return RESEARCH_COST[k]; }, set value(v: unknown) { RESEARCH_COST[k] = Number(v); } } })) },
  { id: 'research', label: '연구 개선', fields: [T('ko'), L('desc'), N('rp', '필요 포인트')], items: list(RESEARCH_UPGRADES, (r) => r.id, (r) => r.facility) },
];

const BASE_LABELS: Record<string, string> = {
  mana: '시작 영감 최대치', manaRegen: '기본 영감 회복/초', fcChance: '조각 발견 확률 (0.1 = 10%)', assistantShare: '견습생 1명 = 두드리기의 몇 배/초',
  gemBonus: '전설 1개당 생산 보너스 (0.02 = 2%)', gemDivisor: '전설 공식 상수 n(n+1)·x', offlineRate: '오프라인 효율 (0.5 = 50%)',
  offlineCapSec: '오프라인 최대 시간(초)', costGrowth: '건물 가격 증가율',
};

export type Overrides = Record<string, Record<string, Record<string, string | number>>>;
export const LOCAL_KEY = 'talestopia-admin-overrides';

/** Snapshot of the code defaults, taken before any override, so the admin panel can show and reset them. */
export const DEFAULTS: Overrides = {};
for (const c of COLLECTIONS) {
  DEFAULTS[c.id] = {};
  for (const it of c.items()) {
    DEFAULTS[c.id][it.id] = {};
    for (const f of c.fields) { const v = it.obj[f.key]; if (v !== undefined) DEFAULTS[c.id][it.id][f.key] = v as string | number; }
  }
}

export function applyOverrides(o: Overrides) {
  for (const c of COLLECTIONS) {
    const patch = o[c.id]; if (!patch) continue;
    const byId = new Map(c.items().map((it) => [it.id, it]));
    for (const [id, fields] of Object.entries(patch)) {
      const it = byId.get(id); if (!it) continue;
      for (const f of c.fields) {
        if (!(f.key in fields)) continue;
        const v = fields[f.key];
        it.obj[f.key] = f.type === 'number' ? Number(v) : String(v);
      }
    }
  }
}

export function loadLocalOverrides(): Overrides {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '{}'); } catch { return {}; }
}

/** Called once at startup by the game and the admin panel. */
export function installContent() {
  applyOverrides(baked as Overrides);
  applyOverrides(loadLocalOverrides());
}
