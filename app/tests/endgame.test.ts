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

describe('prestige factions and mercenary', () => {
  const allied = (f: 'woodland' | 'thieves') => {
    const s = newGame(T0); s.run.coins = new Decimal('1e80'); s.run.coinsRun = new Decimal('1e80');
    s.run.alignment = f === 'woodland' ? 'bright' : 'dark';
    for (const c of Object.keys(s.run.fc)) s.run.fc[c as keyof typeof s.run.fc] = 1e12;
    expect(E.buyUpgrade(s, `${f}_g1`, T0)).toBe(true);
    return s;
  };
  it('vanilla gates cost 20/100/500 faction coins and no gold', () => {
    const s = allied('woodland');
    expect(s.run.fc.woodland).toBe(1e12 - 20);
    expect(E.buyUpgrade(s, 'woodland_g2', T0)).toBe(true);
    expect(s.run.fc.woodland).toBe(1e12 - 120);
    const u = E.allUpgrades(s).find((x) => x.id === 'woodland_11')!;
    expect(u.cost.toNumber()).toBe(50e6);
  });
  it('the prestige faction appears after the alliance and joins on top', () => {
    const s = allied('woodland');
    expect(E.allUpgrades(s).some((u) => u.id === 'clockmaker_g1')).toBe(false);
    E.buyUpgrade(s, 'woodland_g2', T0); E.buyUpgrade(s, 'woodland_g3', T0);
    expect(E.buyUpgrade(s, 'clockmaker_g1', T0)).toBe(true);
    expect(s.run.faction).toBe('woodland');
    expect(s.run.prestige).toBe('clockmaker');
    expect(s.run.fc.clockmaker).toBe(1e12 - 3000);
    expect(E.availableSpells(s).map((x) => x.id)).toEqual(expect.arrayContaining(['woodland', 'clockmaker']));
  });
  it('mercenary (R3) picks a spell and upgrades from other factions', () => {
    const s = newGame(T0); s.perm.reincarnations = 3; s.run.alignment = 'dark';
    s.run.coins = new Decimal('1e80'); s.run.coinsRun = new Decimal('1e80'); s.run.fc.ghost = 1e6; s.run.fc.witch = 1e6;
    expect(E.buyUpgrade(s, 'freelancer_g1', T0)).toBe(true);
    expect(s.run.faction).toBe('freelancer');
    expect(E.buyMercSpell(s, 'witch')).toBe(true);
    expect(E.availableSpells(s).some((x) => x.id === 'witch')).toBe(true);
    expect(E.mercCandidates(s, 'merc_t1_1').every((u) => ['thieves', 'ghost', 'witch'].includes(u.faction))).toBe(true);
    expect(E.buyMercPick(s, 'merc_t1_1', 'ghost_11')).toBe(true);
    expect(s.run.upgrades).toContain('ghost_11');
    expect(s.run.fc.ghost).toBe(1e6 - 1500);
    expect(E.buyMercPick(s, 'merc_t1_2', 'ghost_11')).toBe(false);
  });
  it('shadow spell grows with casts this game', () => {
    const s = allied('thieves'); s.run.mana = 1e9;
    E.buyUpgrade(s, 'thieves_g2', T0); E.buyUpgrade(s, 'thieves_g3', T0); E.buyUpgrade(s, 'shadow_g1', T0);
    s.run.buildings.c1 = 10;
    const base = E.buildingsCps(s, E.snapshot(s, T0)).toNumber();
    E.castSpell(s, 'shadow', T0);
    expect(E.buildingsCps(s, E.snapshot(s, T0 + 1)).toNumber()).toBeCloseTo(base * 1.3);
  });
});
