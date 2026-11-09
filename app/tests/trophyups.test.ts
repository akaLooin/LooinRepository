import { describe, it, expect } from 'vitest';
import Decimal from 'break_infinity.js';
import * as E from '../src/engine/engine';
import { newGame } from '../src/engine/state';

const T0 = new Date('2026-11-08T08:00:00').getTime(); // a Sunday morning

describe('trophy upgrades and rewards', () => {
  it('mana upgrades unlock by total mana produced', () => {
    const s = newGame(T0); s.run.coins = new Decimal(1e6); s.run.coinsRun = new Decimal(1e6);
    expect(E.allUpgrades(s).some((u) => u.id === 'mana1')).toBe(false);
    s.stats.manaProduced = 200;
    expect(E.buyUpgrade(s, 'mana1', T0)).toBe(true);
    expect(E.snapshot(s, T0).manaRegen).toBeCloseTo(1.5);
  });
  it('autocasting needs the Automatic Casting upgrade', () => {
    const s = newGame(T0); s.autocast.tax = 'gold'; s.run.buildings.c1 = 1;
    E.tick(s, T0 + 1000);
    expect(s.run.spells).toBe(0);
    s.stats.manaProduced = 60000; s.run.coins = new Decimal(1e12); s.run.coinsRun = new Decimal(1e12);
    expect(E.buyUpgrade(s, 'auto1', T0 + 1000)).toBe(true);
    E.tick(s, T0 + 2000);
    expect(s.run.spells).toBe(1);
  });
  it('a secret trophy unlocks its reward upgrade', () => {
    const s = newGame(T0); s.run.coins = new Decimal(777);
    expect(E.checkTrophies(s).map((t) => t.id)).toContain('sec_lucky');
    expect(E.buyUpgrade(s, 'secu_lucky', T0)).toBe(true);
    s.run.buildings.c1 = 1;
    expect(E.buildingsCps(s, E.snapshot(s, T0)).toNumber()).toBeCloseTo(2 * 1.0777);
  });
  it('a spell trophy (cast condition) unlocks the spell upgrade', () => {
    const s = newGame(T0); s.run.alignment = 'bright'; s.run.faction = 'starmage'; s.run.upgrades.push('starmage_g1');
    E.castSpell(s, 'starmage', T0);   // Sunday
    expect(E.checkTrophies(s).map((t) => t.id)).toContain('spt_starmage');
    s.run.coins = new Decimal(1e7);
    expect(E.allUpgrades(s).some((u) => u.id === 'su_starmage')).toBe(true);
  });
  it('ruby upgrades cost 1, 2, 3... rubies and persist', () => {
    const s = newGame(T0); s.perm.rubies = 3; s.perm.rubiesFound = 3;
    expect(E.buyRubyUpgrade(s, 'r_assistant')).toBe(true);
    expect(E.rubyUpgradePrice(s, 'r_assistant')).toBe(2);
    expect(E.buyRubyUpgrade(s, 'r_assistant')).toBe(true);
    expect(s.perm.rubies).toBe(0);
    expect(E.snapshot(s, T0).assistants).toBe(2);
    E.abdicate(s, T0);
    expect(E.snapshot(s, T0).assistants).toBe(2);
  });
});

describe('spell tiers', () => {
  it('appear after the first ascension; tier k doubles mana per tier and stacks the effect', () => {
    const s = newGame(T0);
    expect(E.allUpgrades(s).some((u) => u.kind === 'tier')).toBe(false);
    s.perm.ascensions = 1; s.perm.reincarnations = 40; s.run.alignment = 'dark'; s.run.faction = 'thieves'; s.run.upgrades.push('thieves_g1');
    s.run.coins = new Decimal('1e200'); s.run.coinsRun = new Decimal('1e200'); s.run.fc.thieves = 1e20;
    const t2 = E.allUpgrades(s).find((u) => u.id === 'tier_frenzy_2')!;
    expect(t2).toBeTruthy();
    expect(E.buyUpgrade(s, 'tier_frenzy_2', T0)).toBe(true);   // tier 2 needs no active time
    expect(E.spellCost(s, 'frenzy')).toBe(600);                 // tiers need Tiered Autocasting
    s.stats.manaProduced = 2e8;
    expect(E.buyUpgrade(s, 'autotier', T0)).toBe(true);
    expect(E.spellCost(s, 'frenzy')).toBe(600 * 3);
    expect(E.allUpgrades(s).find((u) => u.id === 'tier_frenzy_3')!.affordable).toBe(false); // needs active time
    s.run.buildings.d4 = 10; s.run.mana = 1e6;
    const base = E.buildingsCps(s, E.snapshot(s, T0)).toNumber();
    E.castSpell(s, 'frenzy', T0);
    expect(E.buildingsCps(s, E.snapshot(s, T0 + 1)).toNumber()).toBeCloseTo(base * (11 * 11) ** 0.1, 3);
    E.setSpellTier(s, 'frenzy', 1);
    expect(E.spellCost(s, 'frenzy')).toBe(600);
  });
});

describe('lineage', () => {
  it('needs R60, bloodline, another faction, a prestige faction and 400 exchanges', () => {
    const s = newGame(T0); s.perm.reincarnations = 60; s.run.bloodline = 'woodland';
    s.run.alignment = 'bright'; s.run.faction = 'minstrel'; s.run.prestige = 'clockmaker';
    expect(E.activeLineage(s)).toBeNull();
    s.run.exchanges.woodland = 400;
    expect(E.activeLineage(s)?.faction).toBe('woodland');
    s.run.fc.woodland = 3e16;
    expect(E.buyLineageLevel(s)).toBe(true);           // level 1 costs 2.5e16
    expect(s.perm.lineage.woodland).toBe(1);
    expect(E.lineageCost(s, 'woodland')).toBeCloseTo(2.5e17, -10);
    s.perm.lineage.woodland = 15;
    expect(E.availableSpells(s).some((x) => x.id === 'woodland')).toBe(true);
    s.perm.lineage.woodland = 20;
    expect(E.checkTrophies(s).map((t) => t.id)).toContain('grand_woodland');
  });
});

describe('arcane brilliance and faction unions', () => {
  it('brilliance shortens tier unlock times', async () => {
    const { SPELL_TIERS } = await import('../src/data/endgame');
    expect(SPELL_TIERS.unlockSeconds(2, 50, 1)).toBeLessThan(SPELL_TIERS.unlockSeconds(2, 50, 0));
  });
  it('a faction union needs A2, the Leges unique building, 1Qi faction coins, then the union upgrade', () => {
    const s = newGame(T0); s.perm.ascensions = 2; s.perm.reincarnations = 100; s.run.alignment = 'dark'; s.run.faction = 'ghost';
    s.run.upgrades.push('ghost_g1', 'lex_order'); s.run.lex = 'order';
    s.run.coins = new Decimal('1e70'); s.run.coinsRun = new Decimal('1e70'); s.run.fc.ghost = 2e18;
    expect(E.allUpgrades(s).some((u) => u.id === 'union_ghost')).toBe(false);
    s.run.upgrades.push('uq2_ghost'); s.run.buildings.d5 = 100;
    expect(E.buyUpgrade(s, 'union_ghost', T0)).toBe(true);
    const before = E.snapshot(s, T0).assistants;
    expect(E.buyUpgrade(s, 'unionup_ghost', T0)).toBe(true);
    expect(E.snapshot(s, T0).assistants).toBeGreaterThan(before);
  });
});
