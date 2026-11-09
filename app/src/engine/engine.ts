// Talestopia Tycoon rules. Pure functions over SaveState; time comes in as `now` (ms).
import Decimal from 'break_infinity.js';
import { BUILDINGS, BUILDING_BY_ID, BU_BONUS_HIGH, BU_BONUS_LOW, BU_BONUS_T11, BU_COST, BU_COUNTS, BU_T11_PER_TROPHY, COST_GROWTH, buildingsFor, type BuildingDef } from '../data/buildings';
import { ALIGNMENTS, FACTIONS, FACTION_BY_ID, FACTION_UPGRADES, type FactionUpgrade } from '../data/factions';
import { GENERAL_UPGRADES, TROPHIES, type TrophyDef } from '../data/general';
import { SPELLS, SPELL_BY_ID, type SpellDef } from '../data/spells';
import { COIN_TYPES, type Alignment, type CoinType, type FactionId } from '../data/types';
import { newMods, type Mods } from './mods';
import { ARCHAEOLOGY, ARTIFACTS, BLOODLINES, BLOODLINE_UPGRADES_NEEDED, CHALLENGES, EXCAVATION_FC_CHANCE, FACILITIES, HERITAGES, REINCARNATION_BASE, REINCARNATION_PERKS, UNLOCKS, excavationCoins, excavationCost, facilityBonus, researchPointsFor, rubyAt, type ArtifactDef, type ChallengeDef, type EndCtx } from '../data/endgame';
import { newRun, type SaveState } from './state';

export const BASE = {
  mana: 1000, manaRegen: 1, fcChance: 0.1, assistantShare: 0.05,
  gemBonus: 0.02,          // GUESS: +2% production per gem
  gemDivisor: 5e11,        // gems: n(n+1)*5e11 coins
  offlineRate: 0.5,        // GUESS
  offlineCapSec: 7 * 24 * 3600,
};

const FACTION_UP_BY_ID: Record<string, FactionUpgrade> = Object.fromEntries(FACTION_UPGRADES.map((u) => [u.id, u]));
const GENERAL_BY_ID = Object.fromEntries(GENERAL_UPGRADES.map((u) => [u.id, u]));

// ---------------------------------------------------------------- helpers
export const has = (s: SaveState, id: string) => s.run.upgrades.includes(id);
const D = (x: Decimal | number | string) => new Decimal(x);

export function ownedTotal(s: SaveState) { let n = 0; for (const k in s.run.buildings) n += s.run.buildings[k]; return n; }

export function assistantCount(s: SaveState, m?: Mods): number {
  let n = 0;
  for (const b of BUILDINGS) if (b.tier <= 10) for (let i = 0; i < 2; i++) if (has(s, `bu_${b.id}_${i}`)) n++;
  return Math.floor(n + (m ? m.assistantsAdd : 0));
}

function baseCtx(s: SaveState, now: number, manaRegen: number): EndCtx {
  const owned = ownedTotal(s);
  return {
    gems: s.gems.toNumber(), trophies: s.trophies.length, assistants: assistantCount(s), buildings: s.run.buildings,
    ownedTotal: owned, runSeconds: Math.max(0, (now - s.run.start) / 1000), manaRegen,
    clicksTotal: s.stats.clicks, clicksRun: s.run.clicks, fcFoundRun: s.run.fcFound, spellsRun: s.run.spells,
    upgradesRun: s.run.upgrades.length, exchanges: totalExchanges(s), alignment: s.run.alignment,
    reincarnations: s.perm.reincarnations, excavations: s.perm.excavations, artifacts: s.perm.artifacts.length,
    hoursTotal: s.stats.playSeconds / 3600, maxOwned: Math.max(s.perm.maxOwned, owned), fcChance: BASE.fcChance, manaMax: BASE.mana,
    exchangesRun: totalExchanges(s), c11: s.run.buildings.c11 ?? 0,
  };
}

export function totalExchanges(s: SaveState) { let n = 0; for (const k in s.run.exchanges) n += s.run.exchanges[k as CoinType] ?? 0; return n; }

const HERITAGE_BY_ID = Object.fromEntries(HERITAGES.map((h) => [`her_${h.faction}`, h]));
const ARTIFACT_BY_ID = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

// ---------------------------------------------------------------- modifiers
function applyAll(s: SaveState, now: number, c: EndCtx): Mods {
  const m = newMods();
  const R = s.perm.reincarnations;
  for (const p of REINCARNATION_PERKS) if (R >= p.r) p.effect(m, c);
  for (const id of s.perm.artifacts) ARTIFACT_BY_ID[id]?.effect?.(m, c);
  for (const ch of CHALLENGES) if (s.run.faction === ch.faction && s.perm.challenges.includes(ch.id)) ch.effect(m, c);
  if (s.run.bloodline) BLOODLINES.find((b) => b.faction === s.run.bloodline)?.effect(m, c);
  if (s.run.faction) for (const f of FACILITIES) if (f.factions.includes(s.run.faction)) m.global *= 1 + facilityBonus(s.perm.research[f.id] ?? 0);
  for (const id of s.run.upgrades) {
    const g = GENERAL_BY_ID[id]; if (g) { g.effect(m); continue; }
    const f = FACTION_UP_BY_ID[id]; if (f?.effect) { f.effect(m, c); continue; }
    const h = HERITAGE_BY_ID[id]; if (h) { h.effect(m, c); continue; }
    if (id.startsWith('bu_')) {
      const [, bid, idx] = id.split('_');
      const b = BUILDING_BY_ID[bid], i = +idx;
      let pct = b.tier === 11 ? BU_BONUS_T11[i] + BU_T11_PER_TROPHY[i] * c.trophies : (b.tier <= 3 ? BU_BONUS_LOW[i] : BU_BONUS_HIGH[i]);
      m.building[bid] = (m.building[bid] ?? 1) * (1 + pct / 100);
    }
  }
  for (const [id, a] of Object.entries(s.run.activeSpells)) {
    if (a.end <= now) continue;
    SPELL_BY_ID[id]?.effect?.(m, c, a, now);
  }
  m.global *= 1 + m.exchangeBonus * c.exchanges;
  return m;
}

export interface Snapshot { mods: Mods; ctx: EndCtx; manaRegen: number; manaMax: number; gemFactor: Decimal; assistants: number }

export function snapshot(s: SaveState, now: number): Snapshot {
  const c0 = baseCtx(s, now, BASE.manaRegen);
  const m0 = applyAll(s, now, c0);
  const manaRegen = (BASE.manaRegen + m0.manaRegenAdd) * m0.manaRegenMult;
  const fc0 = Math.min(1, BASE.fcChance * m0.fcChance);
  const ctx = { ...c0, manaRegen, assistants: assistantCount(s, m0), fcChance: fc0, manaMax: BASE.mana + m0.manaMaxAdd };
  const mods = applyAll(s, now, ctx);
  const gemFactor = s.gems.mul(BASE.gemBonus * mods.gemBonusMult).add(1);
  return { mods, ctx, manaRegen: (BASE.manaRegen + mods.manaRegenAdd) * mods.manaRegenMult, manaMax: BASE.mana + mods.manaMaxAdd, gemFactor, assistants: assistantCount(s, mods) };
}

export function buildingMult(b: BuildingDef, snap: Snapshot): number {
  const m = snap.mods;
  return m.global * m.tier[b.tier] * m.align[b.alignment ?? 'common'] * (m.building[b.id] ?? 1);
}

export function buildingProd(s: SaveState, b: BuildingDef, snap: Snapshot): Decimal {
  const count = s.run.buildings[b.id];
  if (!count) return D(0);
  const base = b.tier === 11 ? b.prod * Math.max(1, snap.ctx.trophies) : b.prod;
  return snap.gemFactor.mul(count * base * buildingMult(b, snap));
}

export function buildingsCps(s: SaveState, snap: Snapshot): Decimal {
  let t = D(0);
  for (const b of BUILDINGS) t = t.add(buildingProd(s, b, snap));
  return t;
}

export function clickReward(s: SaveState, snap: Snapshot, cps?: Decimal): Decimal {
  const m = snap.mods;
  return (cps ?? buildingsCps(s, snap)).mul(m.clickShare).add(1).mul(m.click);
}

export function assistantsCps(s: SaveState, snap: Snapshot, cps?: Decimal): Decimal {
  return clickReward(s, snap, cps).mul(BASE.assistantShare * snap.assistants * snap.mods.assistantsMult);
}

export function totalCps(s: SaveState, snap: Snapshot): Decimal {
  const b = buildingsCps(s, snap);
  return b.add(assistantsCps(s, snap, b));
}

export function fcChance(s: SaveState, snap: Snapshot): number {
  return Math.min(1, BASE.fcChance * snap.mods.fcChance * (1 + 0.05 * Math.log10(1 + Math.max(0, snap.ctx.gems))));
}

// ---------------------------------------------------------------- earning
function earn(s: SaveState, amount: Decimal) {
  s.run.coins = s.run.coins.add(amount);
  s.run.coinsRun = s.run.coinsRun.add(amount);
  s.stats.totalCoins = s.stats.totalCoins.add(amount);
}

function coinPool(s: SaveState): CoinType[] {
  if (s.run.faction) return FACTION_BY_ID[s.run.faction].coinTypes;
  if (s.run.alignment === 'bright') return ['woodland', 'minstrel', 'starmage'];
  if (s.run.alignment === 'dark') return ['thieves', 'ghost', 'witch'];
  return COIN_TYPES;
}

function findCoins(s: SaveState, n: number, rng: () => number): CoinType | null {
  if (n <= 0) return null;
  const pool = coinPool(s);
  const type = pool[Math.floor(rng() * pool.length) % pool.length];
  s.run.fc[type] += n;
  s.run.fcFound += n;
  return type;
}

export function click(s: SaveState, now: number, rng: () => number = Math.random) {
  const snap = snapshot(s, now);
  const value = clickReward(s, snap);
  earn(s, value);
  s.run.coinsByClick = s.run.coinsByClick.add(value);
  s.run.clicks++; s.stats.clicks++;
  const coin = rng() < fcChance(s, snap) ? findCoins(s, 1, rng) : null;
  return { value, coin };
}

// ---------------------------------------------------------------- buildings
export function visibleBuildings(s: SaveState) { return buildingsFor(s.run.alignment); }

export function costMult(s: SaveState): number { return snapshot(s, s.lastSeen).mods.costMult; }

export function buildingCost(s: SaveState, id: string, n = 1, cm = costMult(s)): Decimal {
  const b = BUILDING_BY_ID[id];
  const first = D(b.cost).mul(D(COST_GROWTH).pow(s.run.buildings[id])).mul(cm);
  return first.mul(D(COST_GROWTH).pow(n).sub(1)).div(COST_GROWTH - 1);
}

export function maxAffordable(s: SaveState, id: string, cm = costMult(s)): number {
  const first = buildingCost(s, id, 1, cm);
  if (s.run.coins.lt(first)) return 0;
  let n = Math.floor(Decimal.log10(s.run.coins.mul(COST_GROWTH - 1).div(first).add(1)) / Math.log10(COST_GROWTH));
  while (n > 0 && buildingCost(s, id, n, cm).gt(s.run.coins)) n--;
  return n;
}

export function canSeeBuilding(s: SaveState, id: string) { return visibleBuildings(s).some((b) => b.id === id); }

export function buyBuilding(s: SaveState, id: string, amount: number | 'max'): number {
  if (!canSeeBuilding(s, id)) return 0;
  const cm = costMult(s);
  const n = amount === 'max' ? maxAffordable(s, id, cm) : amount;
  if (n < 1) return 0;
  const cost = buildingCost(s, id, n, cm);
  if (cost.gt(s.run.coins)) return 0;
  s.run.coins = s.run.coins.sub(cost);
  s.run.buildings[id] += n;
  return n;
}

/** "Buy all": repeatedly buys the cheapest affordable building, up to `limit` purchases. */
export function buyAllBuildings(s: SaveState, limit = 1000): number {
  let bought = 0;
  const cm = costMult(s);
  while (bought < limit) {
    let best: string | null = null, bestCost: Decimal | null = null;
    for (const b of visibleBuildings(s)) {
      const c = buildingCost(s, b.id, 1, cm);
      if (c.lte(s.run.coins) && (!bestCost || c.lt(bestCost))) { best = b.id; bestCost = c; }
    }
    if (!best || !bestCost) break;
    s.run.coins = s.run.coins.sub(bestCost); s.run.buildings[best]++; bought++;
  }
  return bought;
}

// ---------------------------------------------------------------- upgrades
export type UpgradeKind = 'building' | 'general' | 'alignment' | 'faction' | 'heritage' | 'bloodline';
export interface UpgradeView {
  id: string; kind: UpgradeKind; ko: string; desc: string; icon: string; cost: Decimal;
  fcCost?: Partial<Record<CoinType, number>>; color?: string; tier?: number; purchased: boolean; affordable: boolean;
}

function fcAffordable(s: SaveState, fc?: Partial<Record<CoinType, number>>) {
  if (!fc) return true;
  return Object.entries(fc).every(([k, v]) => s.run.fc[k as CoinType] >= (v ?? 0));
}

export function allUpgrades(s: SaveState): UpgradeView[] {
  const out: UpgradeView[] = [];
  const add = (u: Omit<UpgradeView, 'purchased' | 'affordable'>) =>
    out.push({ ...u, purchased: has(s, u.id), affordable: s.run.coins.gte(u.cost) && fcAffordable(s, u.fcCost) });

  // alignment proofs
  if (!s.run.alignment) {
    for (const a of ALIGNMENTS) {
      if (a.needsGems && s.gems.lt(a.needsGems)) continue;
      if (s.run.coinsRun.lt(a.cost / 25)) continue;
      add({ id: 'align_' + a.id, kind: 'alignment', ko: a.ko, desc: a.desc, icon: a.id === 'bright' ? 'sun' : a.id === 'dark' ? 'moon' : 'hourglass', cost: D(a.cost), color: a.color });
    }
  }
  // factions
  if (s.run.alignment) {
    for (const f of FACTIONS.filter((x) => x.alignment === s.run.alignment)) {
      if (s.run.faction && s.run.faction !== f.id) continue;
      for (const u of FACTION_UPGRADES.filter((x) => x.faction === f.id)) {
        const visible = u.slot === 0
          ? (u.tier === 1 ? !s.run.faction : has(s, `${f.id}_g${u.tier - 1}`))
          : has(s, `${f.id}_g${u.tier}`);
        if (!visible && !has(s, u.id)) continue;
        add({ id: u.id, kind: 'faction', ko: u.ko, desc: u.desc, icon: f.emblem, cost: D(u.cost), fcCost: u.fcCost, color: f.color, tier: u.tier });
      }
    }
  }
  // building upgrades
  for (const b of visibleBuildings(s)) {
    BU_COUNTS.forEach((n, i) => {
      if (s.run.buildings[b.id] < n && !has(s, `bu_${b.id}_${i}`)) return;
      const pct = b.tier === 11 ? `${BU_BONUS_T11[i]}% + 명장면당 ${BU_T11_PER_TROPHY[i]}%` : `${b.tier <= 3 ? BU_BONUS_LOW[i] : BU_BONUS_HIGH[i]}%`;
      add({ id: `bu_${b.id}_${i}`, kind: 'building', ko: `${b.ko} ${n}`, desc: `${b.ko} 생산 +${pct}${i < 2 && b.tier <= 10 ? ', 견습생 +1' : ''}`,
        icon: 'b:' + b.id, cost: D(BU_COST[b.tier][i]), tier: i });
    });
  }
  // heritages: unlocked by the faction's champion trophy, bought again each run with faction coins
  for (const h of HERITAGES) {
    if (!s.trophies.includes('champ_' + h.faction)) continue;
    add({ id: 'her_' + h.faction, kind: 'heritage', ko: h.ko, desc: h.desc, icon: FACTION_BY_ID[h.faction].emblem, cost: D(0), fcCost: h.cost, color: FACTION_BY_ID[h.faction].color, tier: 3 });
  }
  // bloodlines: R7+, 100 faction upgrades bought in total; free; one per run
  if (s.perm.reincarnations >= UNLOCKS.bloodline) for (const b of BLOODLINES) {
    if ((s.perm.factionUpgrades[b.faction] ?? 0) < BLOODLINE_UPGRADES_NEEDED) continue;
    if (s.run.bloodline && s.run.bloodline !== b.faction) continue;
    add({ id: 'blood_' + b.faction, kind: 'bloodline', ko: b.ko, desc: b.desc, icon: FACTION_BY_ID[b.faction].emblem, cost: D(0), color: '#8a1a3a', tier: 3 });
  }
  // general
  for (const g of GENERAL_UPGRADES) if (g.visible(s) || has(s, g.id)) add({ id: g.id, kind: 'general', ko: g.ko, desc: g.desc, icon: g.icon, cost: D(g.cost) });
  return out;
}

export function buyUpgrade(s: SaveState, id: string, now: number): boolean {
  const u = allUpgrades(s).find((x) => x.id === id);
  if (!u || u.purchased || !u.affordable) return false;
  s.run.coins = s.run.coins.sub(u.cost);
  if (u.fcCost) for (const [k, v] of Object.entries(u.fcCost)) s.run.fc[k as CoinType] -= v ?? 0;
  if (u.kind === 'alignment') { s.run.alignment = id.slice(6) as Alignment; }
  if (u.kind === 'faction' && id.endsWith('_g1')) {
    const f = id.slice(0, -3) as FactionId;
    s.run.faction = f;
    s.stats.allied[f] = (s.stats.allied[f] ?? 0) + 1;
  }
  if (u.kind === 'faction') { const f = FACTION_UP_BY_ID[id].faction; s.perm.factionUpgrades[f] = (s.perm.factionUpgrades[f] ?? 0) + 1; }
  if (u.kind === 'bloodline') s.run.bloodline = id.slice(6) as FactionId;
  s.run.upgrades.push(id);
  void now;
  return true;
}

export function buyAllUpgrades(s: SaveState, now: number): number {
  let n = 0;
  for (;;) {
    const next = allUpgrades(s).filter((u) => !u.purchased && u.affordable && u.kind !== 'alignment' && u.kind !== 'bloodline' && u.kind !== 'heritage' && !(u.kind === 'faction' && u.id.endsWith('_g1')))
      .sort((a, b) => (a.cost.lt(b.cost) ? -1 : 1))[0];
    if (!next || !buyUpgrade(s, next.id, now)) break;
    n++;
  }
  return n;
}

// ---------------------------------------------------------------- spells
export function availableSpells(s: SaveState): SpellDef[] {
  // bloodlines of the spell-role factions also grant their alignment spell (as in the original)
  const granted: Record<string, string> = { starmage: 'holy', witch: 'frenzy', puppet: 'grind' };
  const extra = s.run.bloodline ? granted[s.run.bloodline] : undefined;
  return SPELLS.filter((sp) => {
    if (sp.minR && s.perm.reincarnations < sp.minR) return false;
    if (sp.id === extra) return true;
    return (!sp.alignment && !sp.faction) || (sp.alignment && sp.alignment === s.run.alignment) || (sp.faction && sp.faction === s.run.faction);
  });
}

export function spellActive(s: SaveState, id: string, now: number) { return (s.run.activeSpells[id]?.end ?? 0) > now; }

export function castSpell(s: SaveState, id: string, now: number, rng: () => number = Math.random): { gained?: Decimal; coins?: number } | null {
  const sp = SPELL_BY_ID[id];
  if (!sp || !availableSpells(s).includes(sp) || s.run.mana < sp.mana || spellActive(s, id, now)) return null;
  const snap = snapshot(s, now);
  s.run.mana -= sp.mana;
  s.run.spells++; s.stats.spells++;
  const res: { gained?: Decimal; coins?: number } = {};
  if (sp.duration > 0) {
    const a = { start: now, end: now + sp.duration * 1000 } as { start: number; end: number; target?: string };
    const owned = visibleBuildings(s).filter((b) => s.run.buildings[b.id] > 0);
    if (id === 'pirate' && owned.length) a.target = owned[Math.floor(rng() * owned.length)].id;
    if (id === 'sage' && owned.length) a.target = owned.reduce((lo, b) => (buildingProd(s, b, snap).lt(buildingProd(s, lo, snap)) ? b : lo)).id;
    s.run.activeSpells[id] = a;
  }
  if (id === 'tax') { res.gained = totalCps(s, snap).mul(30); earn(s, res.gained); }
  if (id === 'thieves') { res.coins = Math.floor(Math.log(1 + snap.ctx.gems) ** 3 + 20); findCoins(s, res.coins, rng); }
  if (id === 'pirate') { res.coins = Math.round(1.5 * Math.log(1 + snap.ctx.gems) ** 3); findCoins(s, res.coins, rng); }
  return res;
}

// ---------------------------------------------------------------- royal exchange
export function exchangeCost(s: SaveState, c: CoinType) { return Math.floor(20 * 1.1 ** (s.run.exchanges[c] ?? 0)); }
export function canExchange(s: SaveState) { return !!s.run.faction; }
export function royalExchange(s: SaveState, c: CoinType): boolean {
  if (!canExchange(s)) return false;
  const cost = exchangeCost(s, c);
  if (s.run.fc[c] < cost) return false;
  s.run.fc[c] -= cost;
  s.run.exchanges[c] = (s.run.exchanges[c] ?? 0) + 1;
  return true;
}

// ---------------------------------------------------------------- time
export function tick(s: SaveState, now: number, rng: () => number = Math.random): Decimal {
  const dt = Math.max(0, Math.min(3600, (now - s.lastSeen) / 1000));
  s.lastSeen = now;
  if (dt === 0) return D(0);
  autocast(s, now);
  const snap = snapshot(s, now);
  const gained = totalCps(s, snap).mul(dt);
  earn(s, gained);
  s.run.mana = Math.min(snap.manaMax, s.run.mana + snap.manaRegen * dt);
  // assistants gather faction coins passively
  s.run.fcFraction += snap.assistants * snap.mods.assistantsMult * fcChance(s, snap) * BASE.assistantShare * dt;
  if (s.run.fcFraction >= 1) { const n = Math.floor(s.run.fcFraction); s.run.fcFraction -= n; findCoins(s, n, rng); }
  // bloodline auto-clicks (counted as clicks, like the original's Elven bloodline)
  const auto = BLOODLINES.find((b) => b.faction === s.run.bloodline)?.autoclick ?? 0;
  if (auto) {
    s.run.autoclickFraction += auto * dt;
    const n = Math.floor(s.run.autoclickFraction);
    if (n > 0) {
      s.run.autoclickFraction -= n;
      const v = clickReward(s, snap).mul(n);
      earn(s, v); s.run.coinsByClick = s.run.coinsByClick.add(v);
      s.run.clicks += n; s.stats.clicks += n;
      let found = 0; const p = fcChance(s, snap); for (let i = 0; i < Math.min(n, 50); i++) if (rng() < p) found++;
      findCoins(s, found, rng);
    }
  }
  for (const [id, a] of Object.entries(s.run.activeSpells)) if (a.end <= now) delete s.run.activeSpells[id];
  s.perm.maxOwned = Math.max(s.perm.maxOwned, snap.ctx.ownedTotal);
  s.stats.playSeconds += dt;
  return gained;
}

function autocast(s: SaveState, now: number) {
  const snap = snapshot(s, now);
  if (s.run.mana < s.autocastThreshold * snap.manaMax) return;
  const spells = availableSpells(s);
  const gold = spells.filter((sp) => s.autocast[sp.id] === 'gold');
  for (const sp of gold) if (!spellActive(s, sp.id, now) && s.run.mana >= sp.mana) castSpell(s, sp.id, now);
  if (gold.some((sp) => sp.duration > 0 && !spellActive(s, sp.id, now))) return;
  for (const sp of spells.filter((x) => s.autocast[x.id] === 'silver')) if (!spellActive(s, sp.id, now) && s.run.mana >= sp.mana) castSpell(s, sp.id, now);
}

export function applyOffline(s: SaveState, now: number) {
  const sec = Math.min(BASE.offlineCapSec, Math.max(0, (now - s.lastSeen) / 1000));
  for (const [id, a] of Object.entries(s.run.activeSpells)) if (a.end <= now) delete s.run.activeSpells[id];
  const snap = snapshot(s, now);
  const gained = sec > 10 ? totalCps(s, snap).mul(sec * BASE.offlineRate * snap.mods.offline) : D(0);
  if (gained.gt(0)) earn(s, gained);
  s.run.mana = Math.min(snap.manaMax, s.run.mana + snap.manaRegen * sec);
  s.lastSeen = now;
  return { seconds: sec, gained };
}

// ---------------------------------------------------------------- abdication
/** total gems for a run's coins: largest n with n(n+1)*5e11 <= coins */
export function gemsFor(coins: Decimal): Decimal {
  const x = coins.div(BASE.gemDivisor);
  if (x.lt(2)) return D(0);
  return x.mul(4).add(1).sqrt().sub(1).div(2).floor();
}
export function gemsOnAbdicate(s: SaveState) { return gemsFor(s.run.coinsRun); }

export function abdicate(s: SaveState, now: number): Decimal {
  const gain = gemsOnAbdicate(s);
  s.gems = s.gems.add(gain);
  if (s.run.coinsRun.gt(s.stats.bestRun)) s.stats.bestRun = s.run.coinsRun;
  s.stats.abdications++;
  s.run = newRun(now);
  s.lastSeen = now;
  return gain;
}

// ---------------------------------------------------------------- trophies
export function checkTrophies(s: SaveState): TrophyDef[] {
  const x = { owned: ownedTotal(s), assistants: assistantCount(s) };
  const got: TrophyDef[] = [];
  for (const t of TROPHIES) if (!s.trophies.includes(t.id) && t.check(s, x)) { s.trophies.push(t.id); got.push(t); }
  return got;
}

// ---------------------------------------------------------------- reincarnation
export function reincarnationCost(s: SaveState): Decimal { return D(REINCARNATION_BASE).mul(D(1000).pow(s.perm.reincarnations)); }
export function canReincarnate(s: SaveState) { return s.gems.gte(reincarnationCost(s)); }
/** Resets gems, the run, excavations and most stats. Keeps trophies, challenges, artifacts, rubies, research, allied stats. */
export function reincarnate(s: SaveState, now: number): boolean {
  if (!canReincarnate(s)) return false;
  s.perm.reincarnations++;
  s.gems = D(0);
  s.run = newRun(now);
  s.perm.excavations = 0;
  s.stats = { ...s.stats, clicks: 0, spells: 0, abdications: 0, totalCoins: D(0), bestRun: D(0) };
  s.lastSeen = now;
  return true;
}

// ---------------------------------------------------------------- excavation
export function canBuyArchaeology(s: SaveState) { return !s.perm.archaeology && s.gems.gte(ARCHAEOLOGY.gems) && s.run.coins.gte(ARCHAEOLOGY.cost); }
export function buyArchaeology(s: SaveState) {
  if (!canBuyArchaeology(s)) return false;
  s.run.coins = s.run.coins.sub(ARCHAEOLOGY.cost); s.perm.archaeology = true; return true;
}
export function nextExcavationCost(s: SaveState, n = 1): Decimal {
  let t = D(0); for (let i = 0; i < n; i++) t = t.add(excavationCost(s.perm.excavations + i)); return t;
}
export interface DigResult { coins: number; rubies: number; artifacts: ArtifactDef[] }
export function excavate(s: SaveState, n: number, rng: () => number = Math.random): DigResult | null {
  if (!s.perm.archaeology) return null;
  const cost = nextExcavationCost(s, n);
  if (s.run.coins.lt(cost)) return null;
  s.run.coins = s.run.coins.sub(cost);
  const res: DigResult = { coins: 0, rubies: 0, artifacts: [] };
  for (let i = 0; i < n; i++) {
    const x = s.perm.excavations;
    if (rng() < EXCAVATION_FC_CHANCE) { const c = excavationCoins(x); res.coins += c; findCoins(s, c, rng); }
    s.perm.excavations++;
    while (s.perm.excavations >= rubyAt(s.perm.rubiesFound + 1)) { s.perm.rubiesFound++; s.perm.rubies++; res.rubies++; }
    for (const a of ARTIFACTS) {
      if (s.perm.artifacts.includes(a.id)) continue;
      if ((a.at && s.perm.excavations >= a.at) || (a.chance && s.perm.excavations > 100 && rng() < a.chance)) { s.perm.artifacts.push(a.id); res.artifacts.push(a); }
    }
  }
  return res;
}
/** Spend rubies to reset the excavation counter (cost 1 ruby per 3000 excavations, as in the original). */
export function resetExcavations(s: SaveState): boolean {
  const cost = 1 + Math.floor(s.perm.excavations / 3000);
  if (s.perm.rubies < cost || s.perm.excavations === 0) return false;
  s.perm.rubies -= cost; s.perm.excavations = 0; return true;
}

// ---------------------------------------------------------------- challenges
export function challengeAvailable(s: SaveState, ch: ChallengeDef) {
  if (s.perm.reincarnations < Math.max(ch.minR, UNLOCKS.challenges)) return false;
  return CHALLENGES.filter((x) => x.faction === ch.faction && x.tier < ch.tier).every((x) => s.perm.challenges.includes(x.id));
}
export function checkChallenges(s: SaveState, now: number): ChallengeDef[] {
  if (s.perm.reincarnations < UNLOCKS.challenges || !s.run.faction) return [];
  const snap = snapshot(s, now);
  const view = { faction: s.run.faction, runSeconds: snap.ctx.runSeconds, coinsRun: s.run.coinsRun.toNumber(), clicksRun: s.run.clicks, spellsRun: s.run.spells,
    owned: s.run.buildings, ownedTotal: snap.ctx.ownedTotal, upgradesRun: s.run.upgrades.length, assistants: snap.assistants, fcFoundRun: s.run.fcFound, exchangesRun: totalExchanges(s) };
  const done: ChallengeDef[] = [];
  for (const ch of CHALLENGES) {
    if (ch.faction !== s.run.faction || s.perm.challenges.includes(ch.id) || !challengeAvailable(s, ch)) continue;
    if (ch.check(view)) { s.perm.challenges.push(ch.id); done.push(ch); }
  }
  return done;
}

// ---------------------------------------------------------------- research
export function researchPoints(s: SaveState) {
  const total = researchPointsFor(s.perm.reincarnations);
  const used = Object.values(s.perm.research).reduce((a, b) => a + b, 0);
  return { total, used, free: total - used };
}
export function assignResearch(s: SaveState, facility: string, delta: 1 | -1): boolean {
  if (!FACILITIES.some((f) => f.id === facility)) return false;
  const cur = s.perm.research[facility] ?? 0;
  if (delta > 0 && researchPoints(s).free < 1) return false;
  if (delta < 0 && cur < 1) return false;
  s.perm.research[facility] = cur + delta; return true;
}
