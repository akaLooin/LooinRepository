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
