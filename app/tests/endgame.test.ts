import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import * as E from '../src/engine/engine';
import { newGame, serialize, deserialize } from '../src/engine/state';
import { excavationCost, rubyAt, facilityBonus } from '../src/data/endgame';

const T0 = 1_000_000;

describe('reincarnation', () => {
  it('needs 1e27 gems, then x1000; resets gems, run and excavations', () => {
    const s = newGame(T0);
    s.gems = new Decimal('9e26');
    expect(E.canReincarnate(s)).toBe(false);
    s.gems = new Decimal('1e27'); s.perm.excavations = 40; s.trophies.push('clk100'); s.run.buildings.c1 = 9;
    expect(E.reincarnate(s, T0)).toBe(true);
    expect(s.perm.reincarnations).toBe(1);
    expect(s.gems.toNumber()).toBe(0);
    expect(s.perm.excavations).toBe(0);
    expect(s.run.buildings.c1).toBe(0);
    expect(s.trophies).toContain('clk100');
    expect(E.reincarnationCost(s).toString()).toBe('1e+30');
  });
  it('R1 power: +50% production per reincarnation and +1.2 mana regen', () => {
    const s = newGame(T0); s.run.buildings.c1 = 1;
    const base = E.buildingsCps(s, E.snapshot(s, T0)).toNumber();
    s.perm.reincarnations = 1;
    const snap = E.snapshot(s, T0);
    expect(E.buildingsCps(s, snap).toNumber()).toBeCloseTo(base * 1.5);
    expect(snap.manaRegen).toBeCloseTo(2.2);
  });
  it('spiritual surge appears at R14', () => {
    const s = newGame(T0);
    expect(E.availableSpells(s).some((x) => x.id === 'surge')).toBe(false);
    s.perm.reincarnations = 14;
    expect(E.availableSpells(s).some((x) => x.id === 'surge')).toBe(true);
  });
});

describe('heritage and bloodline', () => {
  it('heritage needs the champion trophy and 5000 faction coins', () => {
    const s = newGame(T0);
    expect(E.allUpgrades(s).some((u) => u.id === 'her_starmage')).toBe(false);
    s.trophies.push('champ_starmage'); s.run.fc.starmage = 5000;
    const before = E.snapshot(s, T0).manaRegen;
    expect(E.buyUpgrade(s, 'her_starmage', T0)).toBe(true);
    expect(E.snapshot(s, T0).manaRegen).toBeCloseTo(before * 1.1);
  });
  it('bloodline needs R7 and 100 faction upgrades; minstrel bloodline auto-clicks', () => {
    const s = newGame(T0); s.perm.reincarnations = 7; s.perm.factionUpgrades.minstrel = 100;
    expect(E.buyUpgrade(s, 'blood_minstrel', T0)).toBe(true);
    expect(s.run.bloodline).toBe('minstrel');
    expect(E.allUpgrades(s).some((u) => u.id === 'blood_woodland')).toBe(false);
    E.tick(s, T0 + 2000, () => 0.99);
    expect(s.run.clicks).toBe(6);
  });
});

describe('excavation', () => {
  it('needs archaeology (1B gems, 100 Oc coins); costs 1e27*1.2^x; rubies at 25n(n+1)', () => {
    const s = newGame(T0); s.run.coins = new Decimal('1e40');
    expect(E.excavate(s, 1)).toBeNull();
    expect(E.buyArchaeology(s)).toBe(false);
    s.gems = new Decimal(1e9);
    expect(E.buyArchaeology(s)).toBe(true);
    expect(excavationCost(0)).toBe(1e27);
    const r = E.excavate(s, 50, () => 0.1)!;
    expect(s.perm.excavations).toBe(50);
    expect(r.rubies).toBe(1);
    expect(rubyAt(2)).toBe(150);
    expect(s.perm.artifacts).toContain('a_quill');
    expect(r.coins).toBeGreaterThan(0);
  });
});

describe('challenges and research', () => {
  it('a tier-1 challenge completes while playing that faction at R2+', () => {
    const s = newGame(T0); s.perm.reincarnations = 2; s.run.alignment = 'bright'; s.run.faction = 'minstrel'; s.run.clicks = 2000;
    expect(E.checkChallenges(s, T0).map((c) => c.id)).toEqual(['ch_minstrel1']);
    expect(E.checkChallenges(s, T0).length).toBe(0);
  });
  it('research opens at R16; facility bonus 350*x^0.75 %', () => {
    const s = newGame(T0);
    expect(E.researchPoints(s).total).toBe(0);
    s.perm.reincarnations = 16;
    expect(E.researchPoints(s).total).toBeGreaterThan(0);
    expect(E.assignResearch(s, 'craft', 1)).toBe(true);
    expect(facilityBonus(1)).toBeCloseTo(3.5);
  });
  it('perm state survives save/load and abdication', () => {
    const s = newGame(T0); s.perm.artifacts.push('a_quill'); s.perm.rubies = 3;
    E.abdicate(s, T0);
    const t = deserialize(serialize(s), T0);
    expect(t.perm.artifacts).toContain('a_quill');
    expect(t.perm.rubies).toBe(3);
  });
});
