// Modifier model: every upgrade, spell and bonus adds to a Mods object that the engine reads.
import type { Alignment } from '../data/types';

export interface Ctx {
  gems: number;               // log-safe: gems as number (may be Infinity-safe up to 1e308)
  trophies: number;
  assistants: number;
  buildings: Record<string, number>;
  ownedTotal: number;
  runSeconds: number;
  manaRegen: number;
  clicksTotal: number;
  clicksRun: number;
  fcFoundRun: number;
  spellsRun: number;
  upgradesRun: number;
  exchanges: number;
  alignment: Alignment | null;
}

export interface Mods {
  global: number;                       // all building production
  tier: number[];                       // index 1..11
  align: Record<string, number>;        // 'bright'|'dark'|'legend'|'common'
  building: Record<string, number>;     // by building id
  click: number;                        // click reward multiplier
  clickShare: number;                   // fraction of cps added to each click
  assistantsAdd: number;
  assistantsMult: number;
  manaRegenAdd: number;
  manaRegenMult: number;
  manaMaxAdd: number;
  fcChance: number;                     // multiplier
  costMult: number;                     // building cost multiplier
  gemBonusMult: number;
  exchangeBonus: number;                // per exchange, fraction
  offline: number;
}

export function newMods(): Mods {
  return {
    global: 1, tier: new Array(12).fill(1), align: { bright: 1, dark: 1, legend: 1, common: 1 }, building: {},
    click: 1, clickShare: 0, assistantsAdd: 0, assistantsMult: 1, manaRegenAdd: 0, manaRegenMult: 1, manaMaxAdd: 0,
    fcChance: 1, costMult: 1, gemBonusMult: 1, exchangeBonus: 0.1, offline: 1,
  };
}

export const ln = (x: number) => Math.log(Math.max(0, x));
export function lowTiers(m: Mods, f: number) { m.tier[1] *= f; m.tier[2] *= f; m.tier[3] *= f; }
export function highTiers(m: Mods, f: number) { m.tier[8] *= f; m.tier[9] *= f; m.tier[10] *= f; }
