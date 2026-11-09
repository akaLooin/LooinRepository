import Decimal from 'break_infinity.js';
import type { Alignment, CoinType, FactionId } from '../data/types';
import { COIN_TYPES } from '../data/types';
import { BUILDINGS } from '../data/buildings';
import type { ActiveSpell } from '../data/spells';

export type AutocastTier = 'off' | 'silver' | 'gold';
export type NumberFormat = 'short' | 'scientific';

export interface RunState {
  coins: Decimal;
  coinsRun: Decimal;
  coinsByClick: Decimal;
  mana: number;
  buildings: Record<string, number>;
  upgrades: string[];
  alignment: Alignment | null;
  faction: FactionId | null;
  fc: Record<CoinType, number>;
  fcFound: number;
  fcFraction: number;
  activeSpells: Record<string, ActiveSpell>;
  exchanges: Partial<Record<CoinType, number>>;
  start: number;
  clicks: number;
  spells: number;
  bloodline: FactionId | null;
  autoclickFraction: number;
}

/** Progress that survives abdication (and mostly reincarnation). */
export interface PermState {
  reincarnations: number;
  factionUpgrades: Partial<Record<FactionId, number>>; // total faction upgrades bought (bloodline unlocks)
  challenges: string[];
  artifacts: string[];
  archaeology: boolean;
  excavations: number;     // reset by reincarnation
  rubies: number;
  rubiesFound: number;
  research: Record<string, number>;
  maxOwned: number;
}

export interface SaveState {
  version: 1;
  run: RunState;
  gems: Decimal;
  perm: PermState;
  trophies: string[];
  autocast: Record<string, AutocastTier>;
  autocastThreshold: number; // 0..1 of max mana before autocast starts
  stats: { clicks: number; spells: number; abdications: number; allied: Partial<Record<FactionId, number>>; totalCoins: Decimal; bestRun: Decimal; playSeconds: number };
  settings: { numberFormat: NumberFormat; buyAmount: 1 | 10 | 100 | 'max' };
  lastSeen: number;
}

export function newRun(now: number): RunState {
  return {
    coins: new Decimal(0), coinsRun: new Decimal(0), coinsByClick: new Decimal(0), mana: 1000,
    buildings: Object.fromEntries(BUILDINGS.map((b) => [b.id, 0])),
    upgrades: [], alignment: null, faction: null,
    fc: Object.fromEntries(COIN_TYPES.map((c) => [c, 0])) as Record<CoinType, number>,
    fcFound: 0, fcFraction: 0, activeSpells: {}, exchanges: {}, start: now, clicks: 0, spells: 0, bloodline: null, autoclickFraction: 0,
  };
}

export function newPerm(): PermState {
  return { reincarnations: 0, factionUpgrades: {}, challenges: [], artifacts: [], archaeology: false, excavations: 0, rubies: 0, rubiesFound: 0, research: {}, maxOwned: 0 };
}

export function newGame(now: number): SaveState {
  return {
    version: 1, run: newRun(now), gems: new Decimal(0), perm: newPerm(), trophies: [], autocast: {}, autocastThreshold: 0,
    stats: { clicks: 0, spells: 0, abdications: 0, allied: {}, totalCoins: new Decimal(0), bestRun: new Decimal(0), playSeconds: 0 },
    settings: { numberFormat: 'short', buyAmount: 1 },
    lastSeen: now,
  };
}

const DEC_RUN = ['coins', 'coinsRun', 'coinsByClick'] as const;

export function serialize(s: SaveState): string {
  return JSON.stringify(s, (_k, v) => (v instanceof Decimal ? { $d: v.toString() } : v));
}

export function deserialize(text: string, now: number): SaveState {
  const raw = JSON.parse(text, (_k, v) => (v && typeof v === 'object' && '$d' in v ? new Decimal(v.$d) : v));
  const base = newGame(now);
  const s: SaveState = { ...base, ...raw, run: { ...newRun(now), ...(raw.run ?? {}) }, stats: { ...base.stats, ...(raw.stats ?? {}) }, perm: { ...newPerm(), ...(raw.perm ?? {}) }, settings: { ...base.settings, ...(raw.settings ?? {}) } };
  for (const k of DEC_RUN) if (!(s.run[k] instanceof Decimal)) s.run[k] = new Decimal(s.run[k] ?? 0);
  if (!(s.gems instanceof Decimal)) s.gems = new Decimal(s.gems ?? 0);
  if (!(s.stats.totalCoins instanceof Decimal)) s.stats.totalCoins = new Decimal(s.stats.totalCoins ?? 0);
  if (!(s.stats.bestRun instanceof Decimal)) s.stats.bestRun = new Decimal(s.stats.bestRun ?? 0);
  for (const b of BUILDINGS) if (typeof s.run.buildings[b.id] !== 'number') s.run.buildings[b.id] = 0;
  for (const c of COIN_TYPES) if (typeof s.run.fc[c] !== 'number') s.run.fc[c] = 0;
  return s;
}
