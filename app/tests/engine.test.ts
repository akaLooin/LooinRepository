import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import * as E from '../src/engine/engine';
import { newGame, serialize, deserialize } from '../src/engine/state';
import { fmt, suffix } from '../src/engine/format';
import { BUILDINGS, buildingsFor } from '../src/data/buildings';
import { FACTION_UPGRADES, FACTIONS } from '../src/data/factions';

const T0 = 1_000_000;
const game = () => { const s = newGame(T0); return s; };
const rich = (s: ReturnType<typeof newGame>, n: number) => { s.run.coins = new Decimal(n); s.run.coinsRun = new Decimal(n); };

describe('data', () => {
  it('has 3 common + 3x7 aligned + tier 11 buildings', () => {
    expect(BUILDINGS.length).toBe(25);
    expect(buildingsFor(null).length).toBe(3);
    expect(buildingsFor('bright').map((b) => b.tier)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
  it('every faction has 12 upgrades in 3 tiers', () => {
    for (const f of FACTIONS.filter((x) => x.kind !== 'mercenary')) expect(FACTION_UPGRADES.filter((u) => u.faction === f.id).length).toBe(12);
  });
});

describe('clicking and buildings', () => {
  it('a click earns 1 coin at the start', () => {
    const s = game();
    expect(E.click(s, T0, () => 0.99).value.toNumber()).toBe(1);
    expect(s.run.coins.toNumber()).toBe(1);
  });
  it('a click can find a faction coin (10% base)', () => {
    const s = game();
    const r = E.click(s, T0, () => 0.05);
    expect(r.coin).not.toBeNull();
    expect(s.run.fcFound).toBe(1);
  });
  it('building cost grows by 1.15 and production matches the tier table', () => {
    const s = game(); rich(s, 1000);
    expect(E.buildingCost(s, 'c1').toNumber()).toBeCloseTo(10);
    expect(E.buyBuilding(s, 'c1', 1)).toBe(1);
    expect(E.buildingCost(s, 'c1').toNumber()).toBeCloseTo(11.5);
    expect(E.totalCps(s, E.snapshot(s, T0)).toNumber()).toBeCloseTo(2);
  });
  it('aligned buildings need the alignment', () => {
    const s = game(); rich(s, 1e9);
    expect(E.buyBuilding(s, 'b4', 1)).toBe(0);
  });
  it('max buy spends no more than the coins', () => {
    const s = game(); rich(s, 5000);
    const n = E.buyBuilding(s, 'c1', 'max');
    expect(n).toBeGreaterThan(20);
    expect(s.run.coins.gte(0)).toBe(true);
  });
});

describe('upgrades, alignment, factions', () => {
  it('5-building upgrade doubles production and gives an assistant', () => {
    const s = game(); s.run.buildings.c1 = 5; rich(s, 1000);
    const before = E.snapshot(s, T0);
    expect(E.buyUpgrade(s, 'bu_c1_0', T0)).toBe(true);
    const after = E.snapshot(s, T0);
    expect(E.buildingsCps(s, after).toNumber()).toBeCloseTo(E.buildingsCps(s, before).toNumber() * 2);
    expect(after.assistants).toBe(1);
  });
  it('proof costs 25,000 and opens aligned buildings; treaty costs 20 faction coins', () => {
    const s = game(); rich(s, 30000);
    expect(E.buyUpgrade(s, 'align_bright', T0)).toBe(true);
    expect(s.run.alignment).toBe('bright');
    expect(E.canSeeBuilding(s, 'b4')).toBe(true);
    expect(E.buyUpgrade(s, 'woodland_g1', T0)).toBe(false);
    s.run.fc.woodland = 20;
    expect(E.buyUpgrade(s, 'woodland_g1', T0)).toBe(true);
    expect(s.run.faction).toBe('woodland');
    expect(s.run.fc.woodland).toBe(0);
    expect(E.allUpgrades(s).some((u) => u.id === 'minstrel_g1')).toBe(false);
  });
  it('legend alignment needs 1e9 gems', () => {
    const s = game(); rich(s, 1e17);
    expect(E.allUpgrades(s).some((u) => u.id === 'align_legend')).toBe(false);
    s.gems = new Decimal(1e9);
    expect(E.allUpgrades(s).some((u) => u.id === 'align_legend')).toBe(true);
  });
});

describe('spells and mana', () => {
  it('starts with 1000 mana and regenerates 1/s', () => {
    const s = game(); s.run.mana = 0;
    E.tick(s, T0 + 10_000);
    expect(s.run.mana).toBeCloseTo(10);
  });
  it('tax collection gives 30s of production', () => {
    const s = game(); s.run.buildings.c1 = 10;
    const r = E.castSpell(s, 'tax', T0)!;
    expect(r.gained!.toNumber()).toBeCloseTo(600);
    expect(s.run.mana).toBe(800);
  });
  it('alignment spell only after the proof; fairy-role spell boosts low tiers x501', () => {
    const s = game(); rich(s, 30000); s.run.buildings.c1 = 10;
    expect(E.castSpell(s, 'holy', T0)).toBeNull();
    E.buyUpgrade(s, 'align_bright', T0); s.run.fc.woodland = 20; E.buyUpgrade(s, 'woodland_g1', T0);
    const base = E.buildingsCps(s, E.snapshot(s, T0)).toNumber();
    expect(E.castSpell(s, 'woodland', T0)).not.toBeNull();
    expect(E.buildingsCps(s, E.snapshot(s, T0 + 1000)).toNumber()).toBeCloseTo(base * 501);
    expect(E.buildingsCps(s, E.snapshot(s, T0 + 11000)).toNumber()).toBeCloseTo(base);
  });
});

describe('abdication', () => {
  it('gems follow n(n+1)*5e11', () => {
    expect(E.gemsFor(new Decimal(9.99e11)).toNumber()).toBe(0);
    expect(E.gemsFor(new Decimal(1e12)).toNumber()).toBe(1);
    expect(E.gemsFor(new Decimal(3e12)).toNumber()).toBe(2);
    expect(E.gemsFor(new Decimal(5.005e17)).toNumber()).toBe(1000);
  });
  it('abdicating resets the run and keeps gems and trophies', () => {
    const s = game(); rich(s, 3e12); s.run.buildings.c1 = 50; s.trophies.push('clk100');
    expect(E.abdicate(s, T0).toNumber()).toBe(2);
    expect(s.run.buildings.c1).toBe(0);
    expect(s.run.coins.toNumber()).toBe(0);
    expect(s.gems.toNumber()).toBe(2);
    expect(s.trophies).toContain('clk100');
    s.run.buildings.c1 = 1;
    expect(E.totalCps(s, E.snapshot(s, T0)).toNumber()).toBeCloseTo(2 * 1.04);
  });
});

describe('exchange, offline, trophies, save, format', () => {
  it('royal exchange: +10% per exchange, cost floor(20*1.1^x)', () => {
    const s = game(); rich(s, 30000); E.buyUpgrade(s, 'align_bright', T0); s.run.fc.woodland = 100; E.buyUpgrade(s, 'woodland_g1', T0);
    s.run.buildings.c1 = 1;
    expect(E.exchangeCost(s, 'woodland')).toBe(20);
    expect(E.royalExchange(s, 'woodland')).toBe(true);
    expect(E.exchangeCost(s, 'woodland')).toBe(22);
    expect(E.buildingsCps(s, E.snapshot(s, T0)).toNumber()).toBeCloseTo(2 * 1.1);
  });
  it('offline earns half', () => {
    const s = game(); s.run.buildings.c1 = 10;
    const r = E.applyOffline(s, T0 + 3600_000);
    expect(r.gained.toNumber()).toBeCloseTo(20 * 3600 * 0.5);
  });
  it('trophies unlock once', () => {
    const s = game(); s.stats.clicks = 100;
    expect(E.checkTrophies(s).map((t) => t.id)).toContain('clk100');
    expect(E.checkTrophies(s).length).toBe(0);
  });
  it('save round-trips Decimals', () => {
    const s = game(); rich(s, 1e40); s.gems = new Decimal('1e30');
    const t = deserialize(serialize(s), T0);
    expect(t.run.coins.eq(s.run.coins)).toBe(true);
    expect(t.gems.toString()).toBe(s.gems.toString());
  });
  it('formats big numbers with short-scale names', () => {
    expect(fmt(1500)).toBe('1.50 K');
    expect(fmt(new Decimal('4.967e36'))).toBe('4.97 UDc');
    expect(suffix(11)).toBe('Dc');
    expect(fmt(new Decimal('1.48e63'))).toBe('1.48 Vg');
  });
});
