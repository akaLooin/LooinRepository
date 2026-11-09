// Balance simulator: plays the real engine with a scripted player and reports the progression curve.
// Usage: npx tsx scripts/sim.ts [profile=active|idle] [days=7] [step=5]
import Decimal from 'break_infinity.js';
import * as E from '../src/engine/engine';
import { newGame, type SaveState } from '../src/engine/state';
import { fmt, fmtTime } from '../src/engine/format';
import { FACTION_BY_ID } from '../src/data/factions';
import type { FactionId } from '../src/data/types';

type Profile = 'active' | 'idle';
const profile = (process.argv[2] ?? 'active') as Profile;
const days = Number(process.argv[3] ?? 7);
const STEP = Number(process.argv[4] ?? 5);
const REPORT = Number(process.argv[5] ?? 21600);           // seconds per simulation step
const CLICKS = profile === 'active' ? 5 : 0;           // taps per second
const ONLINE_HOURS = profile === 'active' ? 24 : 24;   // simulate continuous play (offline uses its own rate)

let rngState = 12345;
const rng = () => { rngState = (rngState * 1103515245 + 12345) & 0x7fffffff; return rngState / 0x7fffffff; };

const s: SaveState = newGame(0);
let now = 0;
const events: string[] = [];
const seen = new Set<string>();
const lastGain: Decimal[] = [];
const log = (key: string, text: string) => { if (seen.has(key)) return; seen.add(key); events.push(`${fmtTime(now / 1000).padStart(12)}  ${text}`); };

// faction choice by gems, following the original's community progression guide (Elf first, neutral after 1B gems)
function pickAlignment() {
  if (s.gems.gte(1e9)) return 'legend';
  return profile === 'idle' ? 'dark' : 'bright';
}
function pickFaction(): FactionId[] {
  if (s.run.alignment === 'legend') return profile === 'idle' ? ['puppet', 'sage'] : ['pirate', 'sage'];
  return profile === 'idle' ? ['thieves', 'ghost'] : ['minstrel', 'starmage'];
}

function botStep() {
  // clicks: simulate up to 25 real clicks per step, scale the coin gain for the rest
  // the idle player only taps for the first 5 minutes of each run
  const rate = profile === 'idle' ? (now - s.run.start < 300000 ? 3 : 0) : CLICKS;
  const n = Math.round(rate * STEP);
  if (n > 0) {
    const real = Math.min(n, 25);
    let gained = new Decimal(0);
    for (let i = 0; i < real; i++) gained = gained.add(E.click(s, now, rng).value);
    if (n > real) { const extra = gained.div(real).mul(n - real); s.run.coins = s.run.coins.add(extra); s.run.coinsRun = s.run.coinsRun.add(extra); s.stats.totalCoins = s.stats.totalCoins.add(extra); }
  }
  // alignment and faction
  if (!s.run.alignment) { const a = pickAlignment(); if (E.buyUpgrade(s, 'align_' + a, now)) log('align' + s.stats.abdications, `성향 선택: ${a}`); }
  if (s.run.alignment && !s.run.faction) {
    for (const f of pickFaction()) if (FACTION_BY_ID[f].alignment === s.run.alignment && E.buyUpgrade(s, `${f}_g1`, now)) { log('fac' + s.stats.abdications, `진영 가입: ${FACTION_BY_ID[f].ko}`); break; }
  }
  // prestige faction when available
  if (s.run.faction && !s.run.prestige) for (const p of ['clockmaker', 'shadow']) E.buyUpgrade(s, `${p}_g1`, now);
  // upgrades, then buildings (cheapest first, like "buy all")
  E.buyAllUpgrades(s, now);
  for (const u of E.allUpgrades(s)) if (u.kind === 'heritage' && !u.purchased && u.affordable) E.buyUpgrade(s, u.id, now);
  // buildings: best production per gold first (like a careful player)
  for (let i = 0; i < 2000; i++) {
    const sn = E.snapshot(s, now);
    let best: string | null = null, bestRatio = -1;
    for (const b of E.visibleBuildings(s)) {
      const cost = E.buildingCost(s, b.id, 1, sn.mods.costMult);
      if (cost.gt(s.run.coins)) continue;
      const each = E.buildingProd(s, b, sn).div(Math.max(1, s.run.buildings[b.id])).add(b.prod * E.buildingMult(b, sn));
      const r = each.div(cost).toNumber();
      if (r > bestRatio) { bestRatio = r; best = b.id; }
    }
    if (!best || E.buyBuilding(s, best, 1) === 0) break;
  }
  // royal exchanges with spare faction coins (keep 600 for gates)
  if (E.canExchange(s)) {
    const f = s.run.faction!, keep = !E.has(s, `${f}_g2`) ? 100 : !E.has(s, `${f}_g3`) ? 500 : 0;
    for (const c of FACTION_BY_ID[f].coinTypes) while (s.run.fc[c] - E.exchangeCost(s, c) >= keep && E.royalExchange(s, c)) { /* buy */ }
  }
  // spells: cast the strongest available whenever possible (manual for the active player, autocast later)
  if (profile === 'active' || E.canAutocast(s)) {
    for (const sp of E.availableSpells(s).sort((a, b) => b.mana - a.mana)) {
      if (sp.id === 'tax') continue;
      E.castSpell(s, sp.id, now, rng);
    }
  }
  // abdicate when gem gain has stalled: the gain grew less than 20% over the last 30 minutes (and is worth at least the current gems / 2)
  const gain = E.gemsOnAbdicate(s);
  const runMin = (now - s.run.start) / 60000;
  if (Math.floor(runMin) % 30 === 0 && Math.floor((now - STEP * 1000 - s.run.start) / 60000) % 30 !== 0) { lastGain.push(gain); if (lastGain.length > 2) lastGain.shift(); }
  const stalled = lastGain.length === 2 && gain.gt(0) && gain.lt(lastGain[0].mul(1.2).add(1));
  if (runMin > 30 && gain.gte(1) && ((stalled && gain.gte(s.gems.div(10))) || gain.gte(s.gems.mul(10).add(1000)))) {
    lastGain.length = 0;
    const before = s.gems;
    E.abdicate(s, now);
    log('abd' + s.stats.abdications, `다시 쓰기 #${s.stats.abdications}: 전설 ${fmt(before)} → ${fmt(s.gems)} (${runMin.toFixed(0)}분 판)`);
  }
  if (E.canReincarnate(s)) { E.reincarnate(s, now); log('r' + s.perm.reincarnations, `환생 R${s.perm.reincarnations}`); }
}

const milestones: [string, (s: SaveState) => boolean][] = [
  ['첫 건물', (x) => x.run.buildings.c1 > 0],
  ['금화 1K', (x) => x.run.coinsRun.gte(1e3)], ['금화 1M', (x) => x.run.coinsRun.gte(1e6)], ['금화 1B', (x) => x.run.coinsRun.gte(1e9)],
  ['금화 1T (첫 전설 가능)', (x) => x.run.coinsRun.gte(1e12)],
  ['전설 1K', (x) => x.gems.gte(1e3)], ['전설 1M', (x) => x.gems.gte(1e6)], ['전설 1B (중립 해금)', (x) => x.gems.gte(1e9)],
  ['전설 1T', (x) => x.gems.gte(1e12)], ['전설 1e18', (x) => x.gems.gte(1e18)], ['전설 1e27 (첫 환생)', (x) => x.gems.gte(1e27)],
];

const end = days * 86400 * 1000;
let lastReport = 0;
const t0 = Date.now();
s.lastSeen = 0;
while (now < end) {
  now += STEP * 1000;
  E.tick(s, now, rng);
  botStep();
  E.checkTrophies(s); E.checkChallenges(s, now);
  for (const [name, f] of milestones) if (f(s)) log('m' + name, `★ ${name}`);
  if (now - lastReport >= REPORT * 1000) {
    lastReport = now;
    const sn = E.snapshot(s, now);
    events.push(`${fmtTime(now / 1000).padStart(12)}  … 금화/초 ${fmt(E.totalCps(s, sn))} · 전설 ${fmt(s.gems)} · 건물 ${E.ownedTotal(s)} · 다시 쓰기 ${s.stats.abdications}회`
      + ` | 전체x${fmt(sn.mods.global)} 전설x${fmt(sn.gemFactor)} 견습생 ${sn.assistants} 두드리기 ${fmt(E.clickReward(s, sn))} 영감 +${sn.manaRegen.toFixed(1)} 조각 ${s.run.fcFound} 계약 ${E.totalExchanges(s)} 개선 ${s.run.upgrades.length}`);
  }
}
void ONLINE_HOURS;
console.log(`# 시뮬레이션: ${profile} (두드리기 ${CLICKS}/초), ${days}일, ${STEP}초 단위 — 계산 ${((Date.now() - t0) / 1000).toFixed(0)}초`);
console.log(events.join('\n'));
console.log(`\n최종: 전설 ${fmt(s.gems)}, R${s.perm.reincarnations}, 다시 쓰기 ${s.stats.abdications}회, 명장면 ${s.trophies.length}, 금화/초 ${fmt(E.totalCps(s, E.snapshot(s, now)))}`);
