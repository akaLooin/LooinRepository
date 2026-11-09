/* Talestopia Tycoon — game rules. Pure logic: no DOM, time passed in as `now` (ms). */
(function (root) {
  'use strict';
  var D = (typeof module !== 'undefined' && module.exports) ? require('./data.js') : root.TT_DATA;
  var C = D.CONFIG;

  var BY_ID = {};
  D.BUILDINGS.forEach(function (b) { BY_ID[b.id] = b; });
  var GENRE_BY_ID = {};
  D.GENRES.forEach(function (g) { GENRE_BY_ID[g.id] = g; });

  function newState(now) {
    var s = {
      version: 1,
      coins: 0, runEarned: 0, lifetime: 0,
      buildings: {}, upgrades: {}, genre: null,
      mana: C.manaBase, legends: 0, rewrites: 0, highlights: {},
      runStart: now, activeSpells: {},
      stats: { clicks: 0, spells: 0, bestRun: 0 },
      lastTick: now
    };
    D.BUILDINGS.forEach(function (b) { s.buildings[b.id] = 0; });
    return s;
  }

  // ---------- modifiers ----------
  function genreEffects(s) {
    var e = { click: 1, clickCps: 0, global: 1, synergy: 0, critChance: 0, critMult: 1,
              lowTier: 1, ghostRate: 0, ghostCap: 0, discount: 0 };
    D.GENRE_UPGRADES.forEach(function (u) {
      if (!s.upgrades[u.id]) return;
      var f = u.effect;
      if (f.click) e.click *= f.click;
      if (f.clickCps) e.clickCps += f.clickCps;
      if (f.global) e.global *= f.global;
      if (f.synergy) e.synergy += f.synergy;
      if (f.critChance) e.critChance += f.critChance;
      if (f.critMult) e.critMult *= f.critMult;
      if (f.lowTier) e.lowTier *= f.lowTier;
      if (f.ghostRate) e.ghostRate += f.ghostRate;
      if (f.ghostCap) e.ghostCap += f.ghostCap;
      if (f.discount) e.discount += f.discount;
    });
    return e;
  }

  function spellActive(s, spellId, now) { return (s.activeSpells[spellId] || 0) > now; }
  function highlightCount(s) { return Object.keys(s.highlights).length; }
  function totalBuildings(s) {
    var n = 0; for (var k in s.buildings) n += s.buildings[k]; return n;
  }
  function distinctBuildings(s) {
    return D.BUILDINGS.filter(function (b) { return s.buildings[b.id] > 0; }).length;
  }
  function maxMana(s) { return C.manaBase + s.legends * C.manaPerLegend; }

  function ghostBonus(s, now) {
    if (s.genre !== 'ghost') return 0;
    var e = genreEffects(s);
    var minutes = Math.max(0, now - s.runStart) / 60000;
    return Math.min(3 + e.ghostCap, minutes * 0.01 * (1 + e.ghostRate));
  }

  function globalMult(s, now) {
    var e = genreEffects(s);
    var m = (1 + s.legends * C.legendBonus) * (1 + highlightCount(s) * C.highlightBonus) * e.global;
    if (s.genre === 'romance') m *= 1 + distinctBuildings(s) * (0.08 + e.synergy);
    if (s.genre === 'ghost') m *= 1 + ghostBonus(s, now);
    if (spellActive(s, 'fate', now)) m *= 2;
    if (spellActive(s, 'midnight', now)) m *= 4;
    return m;
  }

  function buildingMult(s, b, now) {
    var m = 1;
    D.MILESTONES.forEach(function (n) { if (s.upgrades[b.id + '_m' + n]) m *= 2; });
    if (b.tier <= 3) {
      if (s.genre === 'fable') m *= 5 * genreEffects(s).lowTier;
      if (spellActive(s, 'ant', now)) m *= 10;
    }
    return m;
  }

  function buildingCps(s, b, now) {
    return s.buildings[b.id] * b.cps * buildingMult(s, b, now) * globalMult(s, now);
  }

  function cps(s, now) {
    var g = globalMult(s, now), total = 0;
    D.BUILDINGS.forEach(function (b) { total += s.buildings[b.id] * b.cps * buildingMult(s, b, now); });
    return total * g;
  }

  // ---------- buildings ----------
  function costFactor(s) {
    var f = 1;
    if (s.genre === 'adventure') f *= 1 - 0.2 - genreEffects(s).discount;
    return f;
  }

  function buildingCost(s, id, count) {
    var b = BY_ID[id], g = D.COST_GROWTH, owned = s.buildings[id];
    count = count || 1;
    return b.cost * Math.pow(g, owned) * (Math.pow(g, count) - 1) / (g - 1) * costFactor(s);
  }

  function maxAffordable(s, id) {
    var b = BY_ID[id], g = D.COST_GROWTH;
    var first = b.cost * Math.pow(g, s.buildings[id]) * costFactor(s);
    if (s.coins < first) return 0;
    var n = Math.floor(Math.log(s.coins * (g - 1) / first + 1) / Math.log(g));
    while (n > 0 && buildingCost(s, id, n) > s.coins) n--;
    return n;
  }

  function buyBuilding(s, id, count) {
    if (count === 'max') count = maxAffordable(s, id);
    if (!count || count < 1) return false;
    var cost = buildingCost(s, id, count);
    if (cost > s.coins) return false;
    s.coins -= cost;
    s.buildings[id] += count;
    return true;
  }

  // ---------- upgrades ----------
  function allUpgrades(s) {
    var list = [];
    D.BUILDINGS.forEach(function (b) {
      D.MILESTONES.forEach(function (n) {
        list.push({ id: b.id + '_m' + n, kind: 'building', icon: b.icon,
          ko: b.ko + ' 개선 ' + n, desc: b.ko + ' 생산 x2 (' + n + '채 보유 필요)',
          cost: b.cost * Math.pow(D.COST_GROWTH, n) * 3,
          unlocked: s.buildings[b.id] >= n });
      });
    });
    D.CLICK_UPGRADES.forEach(function (u) {
      list.push({ id: u.id, kind: 'click', icon: '✒️', ko: u.ko, desc: u.desc, cost: u.cost,
        unlocked: s.runEarned >= u.cost / 10 || s.coins >= u.cost / 2 });
    });
    D.GENRE_UPGRADES.forEach(function (u) {
      var g = GENRE_BY_ID[u.genre];
      list.push({ id: u.id, kind: 'genre', icon: g.icon, ko: u.ko, desc: u.desc, cost: u.cost,
        unlocked: s.genre === u.genre });
    });
    return list;
  }

  function availableUpgrades(s) {
    return allUpgrades(s)
      .filter(function (u) { return u.unlocked && !s.upgrades[u.id]; })
      .sort(function (a, b) { return a.cost - b.cost; });
  }

  function buyUpgrade(s, id) {
    var u = availableUpgrades(s).filter(function (x) { return x.id === id; })[0];
    if (!u || s.coins < u.cost) return false;
    s.coins -= u.cost;
    s.upgrades[id] = true;
    return true;
  }

  // ---------- clicking ----------
  function clickInfo(s, now) {
    var e = genreEffects(s);
    var share = e.clickCps;
    D.CLICK_UPGRADES.forEach(function (u) { if (s.upgrades[u.id]) share += u.clickCps; });
    var mult = e.click;
    if (s.genre === 'hero') { mult *= 3; share += 0.02; }
    if (spellActive(s, 'roar', now)) mult *= 10;
    var base = (C.baseClick * (1 + s.legends * C.legendBonus) + cps(s, now) * share) * mult;
    var critChance = s.genre === 'mystery' ? 0.15 + e.critChance : 0;
    var critMult = 20 * e.critMult;
    return { base: base, critChance: critChance, critMult: critMult };
  }

  function click(s, now, rng) {
    var info = clickInfo(s, now);
    var crit = info.critChance > 0 && (rng || Math.random)() < info.critChance;
    var value = info.base * (crit ? info.critMult : 1);
    earn(s, value);
    s.stats.clicks++;
    return { value: value, crit: crit };
  }

  function earn(s, amount) {
    s.coins += amount;
    s.runEarned += amount;
    s.lifetime += amount;
  }

  // ---------- genres & spells ----------
  function canChooseGenre(s) { return !s.genre && s.runEarned >= D.GENRE_UNLOCK; }

  function chooseGenre(s, id) {
    if (!canChooseGenre(s) || !GENRE_BY_ID[id]) return false;
    s.genre = id;
    return true;
  }

  function castSpell(s, now) {
    if (!s.genre) return null;
    var sp = GENRE_BY_ID[s.genre].spell;
    if (s.mana < sp.cost || spellActive(s, sp.id, now)) return null;
    s.mana -= sp.cost;
    s.stats.spells++;
    var gained = 0;
    if (sp.duration > 0) s.activeSpells[sp.id] = now + sp.duration * 1000;
    else if (sp.id === 'clue') gained = cps(s, now) * 90;
    else if (sp.id === 'map') gained = Math.min(s.coins * 0.15, cps(s, now) * 600);
    if (gained > 0) earn(s, gained);
    return { spell: sp, gained: gained };
  }

  // ---------- time ----------
  function tick(s, now) {
    var dt = Math.max(0, (now - s.lastTick) / 1000);
    s.lastTick = now;
    if (dt === 0) return 0;
    var gained = cps(s, now) * dt;
    earn(s, gained);
    s.mana = Math.min(maxMana(s), s.mana + C.manaRegen * dt);
    return gained;
  }

  function applyOffline(s, now) {
    var sec = Math.min(C.offlineCapSec, Math.max(0, (now - s.lastTick) / 1000));
    for (var id in s.activeSpells) if (s.activeSpells[id] <= now) delete s.activeSpells[id];
    var gained = sec > 5 ? cps(s, now) * sec * C.offlineRate : 0;
    if (gained > 0) earn(s, gained);
    s.mana = Math.min(maxMana(s), s.mana + C.manaRegen * sec);
    s.lastTick = now;
    return { seconds: sec, gained: gained };
  }

  // ---------- rewrite (prestige) ----------
  function legendsTotalFor(lifetime) { return Math.floor(Math.sqrt(lifetime / C.legendDivisor)); }
  function legendsOnRewrite(s) { return Math.max(0, legendsTotalFor(s.lifetime) - s.legends); }

  function rewrite(s, now) {
    var gain = legendsOnRewrite(s);
    if (gain < 1) return 0;
    var keep = { lifetime: s.lifetime, legends: s.legends + gain, rewrites: s.rewrites + 1,
                 highlights: s.highlights, stats: s.stats };
    keep.stats.bestRun = Math.max(keep.stats.bestRun || 0, s.runEarned);
    var fresh = newState(now);
    for (var k in fresh) s[k] = fresh[k];
    for (var j in keep) s[j] = keep[j];
    s.mana = maxMana(s);
    return gain;
  }

  // ---------- highlights ----------
  function checkHighlights(s) {
    var api = { totalBuildings: totalBuildings };
    var unlocked = [];
    D.HIGHLIGHTS.forEach(function (h) {
      if (!s.highlights[h.id] && h.check(s, api)) { s.highlights[h.id] = true; unlocked.push(h); }
    });
    return unlocked;
  }

  // ---------- formatting & saving ----------
  var SUFFIX = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
  function format(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + format(-n);
    if (n < 1000) return n < 10 && n % 1 ? n.toFixed(1) : Math.floor(n).toString();
    var tier = Math.floor(Math.log10(n) / 3);
    if (tier >= SUFFIX.length) return n.toExponential(2).replace('+', '');
    var v = n / Math.pow(1000, tier);
    return (v < 100 ? v.toFixed(2) : v.toFixed(1)) + SUFFIX[tier];
  }

  function formatTime(sec) {
    sec = Math.floor(sec);
    var h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), x = sec % 60;
    if (h) return h + '시간 ' + m + '분';
    if (m) return m + '분 ' + x + '초';
    return x + '초';
  }

  function serialize(s) { return JSON.stringify(s); }

  function deserialize(str, now) {
    var data = JSON.parse(str);
    var s = newState(now);
    for (var k in data) if (k in s) s[k] = data[k];
    D.BUILDINGS.forEach(function (b) { if (typeof s.buildings[b.id] !== 'number') s.buildings[b.id] = 0; });
    s.stats = Object.assign({ clicks: 0, spells: 0, bestRun: 0 }, s.stats);
    return s;
  }

  var ENGINE = {
    newState: newState, cps: cps, buildingCps: buildingCps, buildingMult: buildingMult, globalMult: globalMult,
    buildingCost: buildingCost, maxAffordable: maxAffordable, buyBuilding: buyBuilding,
    availableUpgrades: availableUpgrades, buyUpgrade: buyUpgrade,
    clickInfo: clickInfo, click: click, canChooseGenre: canChooseGenre, chooseGenre: chooseGenre,
    castSpell: castSpell, spellActive: spellActive, maxMana: maxMana, ghostBonus: ghostBonus,
    tick: tick, applyOffline: applyOffline, legendsOnRewrite: legendsOnRewrite, rewrite: rewrite,
    checkHighlights: checkHighlights, totalBuildings: totalBuildings, highlightCount: highlightCount,
    format: format, formatTime: formatTime, serialize: serialize, deserialize: deserialize,
    genre: function (id) { return GENRE_BY_ID[id]; }, building: function (id) { return BY_ID[id]; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = ENGINE;
  else root.TT_ENGINE = ENGINE;
})(this);
