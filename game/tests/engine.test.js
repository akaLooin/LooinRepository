// Run: node --test game/tests
const test = require('node:test');
const assert = require('node:assert');
const E = require('../js/engine.js');
const D = require('../js/data.js');

test('new game starts empty and clicking earns coins', () => {
  const s = E.newState(0);
  assert.strictEqual(s.coins, 0);
  const r = E.click(s, 0);
  assert.strictEqual(r.value, 1);
  assert.strictEqual(s.coins, 1);
  assert.strictEqual(s.stats.clicks, 1);
});

test('buying buildings costs the geometric sum and adds production', () => {
  const s = E.newState(0);
  s.coins = 1000;
  const cost10 = E.buildingCost(s, 'bard', 10);
  let sum = 0;
  for (let i = 0; i < 10; i++) sum += 10 * Math.pow(D.COST_GROWTH, i);
  assert.ok(Math.abs(cost10 - sum) < 1e-6);
  assert.ok(E.buyBuilding(s, 'bard', 'max'));
  assert.ok(s.buildings.bard > 10);
  assert.ok(s.coins >= 0);
  assert.ok(E.cps(s, 0) > 0);
});

test('cannot buy what you cannot afford', () => {
  const s = E.newState(0);
  assert.strictEqual(E.buyBuilding(s, 'taletree', 1), false);
  assert.strictEqual(E.maxAffordable(s, 'bard'), 0);
});

test('tick produces coins over time and regenerates mana', () => {
  const s = E.newState(0);
  s.buildings.bard = 10;
  s.mana = 0;
  E.tick(s, 1000);
  assert.ok(Math.abs(s.coins - 2) < 1e-9);
  assert.strictEqual(s.mana, D.CONFIG.manaRegen);
});

test('milestone upgrade doubles a building', () => {
  const s = E.newState(0);
  s.buildings.bard = 10;
  const before = E.cps(s, 0);
  s.coins = 1e9;
  assert.ok(E.buyUpgrade(s, 'bard_m10'));
  assert.ok(Math.abs(E.cps(s, 0) - before * 2) < 1e-9);
  assert.strictEqual(E.buyUpgrade(s, 'bard_m25'), false); // not unlocked yet
});

test('genre unlocks after enough coins and only once per edition', () => {
  const s = E.newState(0);
  assert.strictEqual(E.chooseGenre(s, 'hero'), false);
  s.runEarned = D.GENRE_UNLOCK;
  assert.ok(E.chooseGenre(s, 'hero'));
  assert.strictEqual(E.chooseGenre(s, 'fable'), false);
  assert.strictEqual(E.click(s, 0).value, 3);
});

test('fable boosts low tiers; adventure discounts buildings', () => {
  const s = E.newState(0);
  s.buildings.bard = 1; s.runEarned = 1e6;
  const base = E.cps(s, 0);
  E.chooseGenre(s, 'fable');
  assert.ok(Math.abs(E.cps(s, 0) - base * 5) < 1e-9);
  const a = E.newState(0); a.runEarned = 1e6;
  const full = E.buildingCost(a, 'bard', 1);
  E.chooseGenre(a, 'adventure');
  assert.ok(Math.abs(E.buildingCost(a, 'bard', 1) - full * 0.8) < 1e-9);
});

test('spells cost mana, run for their duration, and cannot stack', () => {
  const s = E.newState(0);
  s.runEarned = 1e6; E.chooseGenre(s, 'romance');
  s.buildings.bard = 10;
  const base = E.cps(s, 0);
  const r = E.castSpell(s, 0);
  assert.ok(r);
  assert.strictEqual(s.mana, D.CONFIG.manaBase - 50);
  assert.ok(Math.abs(E.cps(s, 1000) - base * 2) < 1e-9);
  assert.strictEqual(E.castSpell(s, 1000), null);
  assert.ok(Math.abs(E.cps(s, 31000) - base) < 1e-9);
});

test('mystery crits use the rng', () => {
  const s = E.newState(0);
  s.runEarned = 1e6; E.chooseGenre(s, 'mystery');
  assert.strictEqual(E.click(s, 0, () => 0).crit, true);
  assert.strictEqual(E.click(s, 0, () => 0.99).crit, false);
});

test('rewrite grants legends, resets the edition, keeps highlights', () => {
  const s = E.newState(0);
  s.lifetime = 4e9; s.runEarned = 4e9; s.coins = 1e9; s.buildings.bard = 50; s.genre = 'hero';
  s.highlights.tap1 = true;
  assert.strictEqual(E.legendsOnRewrite(s), 2);
  assert.strictEqual(E.rewrite(s, 5000), 2);
  assert.strictEqual(s.legends, 2);
  assert.strictEqual(s.coins, 0);
  assert.strictEqual(s.buildings.bard, 0);
  assert.strictEqual(s.genre, null);
  assert.ok(s.highlights.tap1);
  assert.strictEqual(s.rewrites, 1);
  assert.strictEqual(E.legendsOnRewrite(s), 0);
  assert.strictEqual(E.rewrite(s, 6000), 0);
  assert.ok(Math.abs(E.click(s, 0).value - 1.04) < 1e-9);
});

test('offline progress is capped and halved', () => {
  const s = E.newState(0);
  s.buildings.bard = 10; // 2 cps
  const r = E.applyOffline(s, 100 * 3600 * 1000);
  assert.strictEqual(r.seconds, 24 * 3600);
  assert.ok(Math.abs(r.gained - 2 * 24 * 3600 * 0.5) < 1e-6);
});

test('highlights unlock once', () => {
  const s = E.newState(0);
  E.click(s, 0);
  const first = E.checkHighlights(s).map((h) => h.id);
  assert.deepStrictEqual(first, ['tap1']);
  assert.strictEqual(E.checkHighlights(s).length, 0);
});

test('save round-trip', () => {
  const s = E.newState(0);
  s.coins = 123; s.buildings.mushroom = 4; s.upgrades.quill1 = true;
  const t = E.deserialize(E.serialize(s), 0);
  assert.strictEqual(t.coins, 123);
  assert.strictEqual(t.buildings.mushroom, 4);
  assert.ok(t.upgrades.quill1);
});

test('number formatting', () => {
  assert.strictEqual(E.format(5), '5');
  assert.strictEqual(E.format(1500), '1.50K');
  assert.strictEqual(E.format(2.5e9), '2.50B');
  assert.strictEqual(E.format(123456), '123.5K');
});
