// 원작에 맞춘 규칙들(가족 보너스·황금 석상·수정 몬스터·요리사/연구원 자리·자동 줍기·방치 상한·모루)
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { AFK_MAX_SECONDS, CRYSTAL_CHANCE, FAMILY, FAMILY_MIN, MAX_CHARACTERS, MONSTERS, PRODUCTS, crystalOf, statueNeed } from '../src/core/data';
import { familyBest, statueLv } from '../src/core/progress';
import { addItem, createCharacter, derive, invSize, newAccount } from '../src/core/state';
import { chefMult } from '../src/core/cooking';
import { labState, nearestSpot } from '../src/core/lab';
import { computeAfk } from '../src/core/afk';
import { Rng } from '../src/core/rng';

const look = { hair: 0, hairColor: '#000', skin: '#fff', outfit: '#f00' };
const setup = () => { const acc = newAccount(); createCharacter(acc, '테스트', look, 0); return { acc, c: acc.characters[0] }; };

describe('가족 보너스', () => {
  it('거쳐 온 모든 직업이 보너스를 주고, 단계가 열리는 레벨부터 센다', () => {
    const { acc, c } = setup();
    expect(Object.keys(FAMILY).length).toBeGreaterThan(5);
    c.cls = 'guardian'; c.level = 40;
    const b = familyBest(acc.characters);
    expect(b.beginner).toBe(40);
    expect(b.warrior).toBe(40 - FAMILY_MIN[1] + 1);
    expect(b.guardian).toBe(40 - FAMILY_MIN[2] + 1);
    expect(b.archer).toBe(0);
    c.level = 20;
    expect(familyBest(acc.characters).guardian).toBe(0);
  });
  it('캐릭터는 최대 11명', () => expect(MAX_CHARACTERS).toBe(11));
});

describe('황금 석상과 수정 몬스터', () => {
  it('황금 조각을 쓰면 계정 최고 석상 레벨이 모든 캐릭터에게 적용된다', () => {
    const { acc, c } = setup();
    createCharacter(acc, '둘째', look, 0);
    const c2 = acc.characters[1];
    c.statues.str = statueNeed(0) + statueNeed(1) + statueNeed(2);
    expect(statueLv(acc, c2, 'str')).toBe(0);
    addItem(c2, 'gstatue_str', 1);
    expect(applyAction(acc, 1, { t: 'use', id: 'gstatue_str' }, 0).ok).toBe(true);
    expect(statueLv(acc, c2, 'str')).toBe(3);
    expect(applyAction(acc, 1, { t: 'use', id: 'gstatue_str' }, 0).ok).toBe(false);
  });
  it('일반 몬스터마다 수정 변종이 있고, 조각을 반드시 떨어뜨린다', () => {
    const cr = MONSTERS[crystalOf('pebbler')];
    expect(cr.crystal).toBe(true);
    expect(cr.hp).toBe(MONSTERS.pebbler.hp * 4);
    expect(cr.drops.some((d) => d.item === 'statue_str' && d.chance === 1)).toBe(true);
    expect(cr.drops.some((d) => d.item === 'gstatue_str')).toBe(true);
    expect(MONSTERS[crystalOf('mossking')]).toBeUndefined();
    expect(CRYSTAL_CHANCE).toBeLessThan(0.01);
  });
});

describe('요리사·연구원은 그 자리에 머물러야 일한다', () => {
  it('성운 정거장에 있어야 앉을 수 있고, 다른 맵으로 가면 쉬며, 두 곳을 겸하지 못한다', () => {
    const { acc, c } = setup();
    c.maxWorld = 4; c.mapId = 'moondust'; c.skills.cooking.lv = 10;
    expect(applyAction(acc, 0, { t: 'cook', op: 'chef' }, 1000).ok).toBe(false);
    c.mapId = 'nebtown';
    expect(applyAction(acc, 0, { t: 'cook', op: 'chef' }, 1000).ok).toBe(true);
    const m = chefMult(acc);
    expect(m).toBeGreaterThan(1);
    c.mapId = 'moondust';
    expect(chefMult(acc)).toBe(1);
    c.mapId = 'nebtown';
    expect(applyAction(acc, 0, { t: 'lab', op: 'place', spot: nearestSpot(70, 90) }, 2000).ok).toBe(true);
    expect(acc.cook.chefs).not.toContain(c.id);
    expect(labState(acc).linked.has(c.id)).toBe(true);
    c.mapId = 'moondust';
    expect(labState(acc).linked.has(c.id)).toBe(false);
  });
});

describe('자동 줍기·방치 상한·모루', () => {
  it('줍기 자석을 쓰면 계정에 자동 줍기가 켜진다', () => {
    const { acc, c } = setup();
    addItem(c, 'loot_magnet', 1);
    expect(applyAction(acc, 0, { t: 'use', id: 'loot_magnet' }, 0).ok).toBe(true);
    expect(acc.autoLoot).toBe(true);
  });
  it('방치 보상은 1년까지 쌓인다', () => {
    expect(AFK_MAX_SECONDS).toBe(365 * 24 * 3600);
    const { acc, c } = setup();
    c.mapId = 'meadow'; c.lastActive = 0;
    const r = computeAfk(acc, c, 30 * 24 * 3600 * 1000, new Rng(1))!;
    expect(r.seconds).toBe(30 * 24 * 3600);
    expect(r.capped).toBe(0);
  });
  it('모루 생산품은 11가지', () => expect(PRODUCTS.length).toBe(11));
});

import { SHRINE, shrineValue } from '../src/core/shrines';
describe('사당', () => {
  it('지어서 사냥터에 놓으면 그 맵의 캐릭터만 효과를 받고, 놓여 있는 동안 자란다', () => {
    const acc = newAccount(); createCharacter(acc, 'a', look, 0); createCharacter(acc, 'b', look, 0);
    const [c, c2] = acc.characters;
    c.maxWorld = 3; c.mapId = 'meadow'; c2.mapId = 'town';
    acc.coins = 1e6;
    for (const [m, n] of SHRINE.sh_valor.mats) acc.storage.push({ id: m, qty: n });
    expect(applyAction(acc, 0, { t: 'shrine', op: 'build', id: 'sh_valor' }, 1000).ok).toBe(true);
    const d0 = derive(c, acc).dmg;
    expect(applyAction(acc, 0, { t: 'shrine', op: 'place', id: 'sh_valor' }, 1000).ok).toBe(true);
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
    const e0 = derive(c2, acc).dmg; c2.mapId = 'meadow';
    expect(derive(c2, acc).dmg).toBeGreaterThan(e0);
    c2.mapId = 'town';
    applyAction(acc, 0, { t: 'shrine', op: 'visit' }, 1000 + 50 * 3_600_000);
    expect(acc.shrines.own.sh_valor.lv).toBeGreaterThan(1);
    expect(shrineValue(SHRINE.sh_valor, 2)).toBeGreaterThan(shrineValue(SHRINE.sh_valor, 1));
    c.mapId = 'town';
    expect(applyAction(acc, 0, { t: 'shrine', op: 'place', id: 'sh_valor' }, 2000).ok).toBe(false);
  });
});

import { COOK as CK, MEALS as ML, recipeChance as rc, recipeRoll as rr } from '../src/core/cooking';
describe('요리(원작에 맞춤)', () => {
  it('요리 52종, 최대 Lv.30, 주방 10개, 연구는 실패할 수 있고, 국자로 1시간치를 바로 진행', () => {
    expect(ML.length).toBe(52); expect(CK.mealMax).toBe(30); expect(CK.kitchenCost.length).toBe(10);
    const acc = newAccount(); createCharacter(acc, 'a', look, 0); const c = acc.characters[0];
    c.maxWorld = 4; c.mapId = 'nebtown';
    const H = 3_600_000;
    applyAction(acc, 0, { t: 'cook', op: 'visit' }, H);
    acc.cook.spices = { sp_dust: 100 };
    // 실패하는 시도 횟수를 찾아 연구 → 끝나면 아무 요리도 찾지 못한다
    while (rr(acc.cook, ['sp_dust']) < rc(acc.cook.kitchens[0])) acc.cook.tries++;
    expect(applyAction(acc, 0, { t: 'cook', op: 'recipe', idx: 0, sp: ['sp_dust'] }, H).ok).toBe(true);
    acc.cook.ladles = 1;
    expect(applyAction(acc, 0, { t: 'cook', op: 'ladle', idx: 0 }, H).ok).toBe(true);
    expect(acc.cook.ladles).toBe(0);
    expect(acc.cook.kitchens[0].recipe).toBeNull();
    expect(acc.cook.found).toEqual([]);
  });
});

import { BRIBES as BR, STAMPS as ST, ITEMS as IT2 } from '../src/core/data';
describe('우표·뇌물(원작처럼 많이, 세트로)', () => {
  it('우표가 60장 넘게 있고 모두 아이템·드롭처가 있으며, 뇌물은 월드마다 한 세트', () => {
    expect(ST.length).toBeGreaterThanOrEqual(60);
    for (const s of ST) expect(IT2[s.id]?.kind).toBe('stamp');
    for (const s of ST.filter((x) => x.w)) expect(Object.values(MONSTERS).some((m) => m.drops.some((d) => d.item === s.id))).toBe(true);
    expect(new Set(BR.map((b) => b.set)).size).toBe(4);
  });
  it('능력치 우표는 능력치를 올린다', () => {
    const { acc, c } = setup();
    const s0 = derive(c, acc).str;
    acc.stamps.stamp_fist = 5;
    expect(derive(c, acc).str).toBe(s0 + 5);
  });
});

import { DEATH_TIERS as DT, deathBonus as dBonus, multiKill as mKill } from '../src/core/progress';
describe('처치 기록·멀티킬', () => {
  it('계정 처치 수로 단계가 오르고 공격력이 오르며, 3월드 이후 멀티킬로 처치 수가 여러 배로 센다', () => {
    const { acc, c } = setup();
    expect(dBonus(acc)).toBe(0);
    c.kills.meadow = DT[1];
    expect(dBonus(acc)).toBe(1);
    expect(mKill(acc, 'meadow')).toBe(1);
    c.maxWorld = 3;
    expect(mKill(acc, 'meadow')).toBe(3);
    const d0 = derive(c, { ...acc, characters: [] }).dmg;
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
  });
});

import { TALENTS as TLS, TALENTS_PER_TAB, CLASSES as CLS2, talentTab as tTab } from '../src/core/data';
import { tabFree as tFree2 } from '../src/core/state';
describe('특성(원작처럼 탭마다 15개, 탭마다 따로 쌓이는 포인트)', () => {
  it('모든 탭에 15개씩, 포인트는 탭마다 따로', () => {
    expect(TLS.filter((t) => !t.cls).length).toBe(TALENTS_PER_TAB);
    for (const k of Object.keys(CLS2)) if (k !== 'beginner') expect(TLS.filter((t) => t.cls === k).length).toBe(TALENTS_PER_TAB);
    const { acc, c } = setup();
    c.level = 15; c.cls = 'warrior';
    expect(tFree2(c, 0)).toBe(14); expect(tFree2(c, 1)).toBe(6);
    const w = TLS.find((t) => t.cls === 'warrior' && t.eff === 'str')!;
    expect(tTab(w)).toBe(1);
    const s0 = derive(c, acc).str;
    for (let i = 0; i < 6; i++) expect(applyAction(acc, 0, { t: 'talent', id: w.id }, 0).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'talent', id: w.id }, 0).ok).toBe(false); // 1차 탭 포인트를 다 씀
    expect(tFree2(c, 0)).toBe(14); // 초보자 탭은 그대로
    expect(derive(c, acc).str).toBe(s0 + 6 * w.per!);
  });
});

import { OBOLS as OBS, placeObol, takeObol } from '../src/core/obols';
describe('오볼', () => {
  it('같은 모양 칸에만, 열린 칸에만 끼우고, 가족판은 모든 캐릭터에게 효과', () => {
    const { acc, c } = setup();
    createCharacter(acc, '둘째', look, 0);
    const c2 = acc.characters[1];
    const circ = OBS.find((o) => o.shape === 'circle' && o.theme.k === 'str')!, sq = OBS.find((o) => o.shape === 'square')!;
    addItem(c, circ.id, 2); addItem(c, sq.id, 1);
    expect(placeObol(acc, c, sq.id, false, 0)).toMatch(/칸에는/);
    const s0 = derive(c, acc).str;
    expect(placeObol(acc, c, circ.id, false, 0)).toBeNull();
    expect(derive(c, acc).str).toBe(s0 + circ.v);
    expect(placeObol(acc, c, circ.id, false, 1)).toMatch(/Lv/); // 아직 닫힌 칸
    c.level = 40;
    const t0 = derive(c2, acc).str;
    expect(placeObol(acc, c, circ.id, true, 0)).toBeNull();
    expect(derive(c2, acc).str).toBe(t0 + circ.v);
    expect(takeObol(acc, c, false, 0)).toBeNull();
    expect(OBS.length).toBe(96);
    expect(Object.values(MONSTERS).some((m) => m.drops.some((d) => d.item === circ.id))).toBe(true);
  });
});

import { BUILDING as BLD, COG_HOURS, SALTS as SLT, buildRate as bRate2 } from '../src/core/build';
describe('건설(원작에 맞춤)', () => {
  it('눈꽃 마을의 일꾼이 건설 속도·건설 경험치·톱니를 내고, 톱니판이 속도를 올리며, 특수 건물이 기능을 연다', () => {
    const { acc, c } = setup();
    c.maxWorld = 3; c.mapId = 'snowtown';
    const H = 3_600_000;
    applyAction(acc, 0, { t: 'build', op: 'visit' }, H);
    const r0 = bRate2(acc.build, acc);
    expect(applyAction(acc, 0, { t: 'build', op: 'staff' }, H).ok).toBe(true);
    expect(bRate2(acc.build, acc)).toBeGreaterThan(r0);
    applyAction(acc, 0, { t: 'build', op: 'visit' }, H + COG_HOURS * 3 * H);
    expect(acc.build.cogBag.length).toBe(3);
    expect(c.skills.construction.lv > 1 || c.skills.construction.xp > 0).toBe(true);
    const r1 = bRate2(acc.build, acc);
    expect(applyAction(acc, 0, { t: 'build', op: 'cog', idx: 0, slot: 0 }, H + COG_HOURS * 3 * H).ok).toBe(true);
    expect(bRate2(acc.build, acc)).toBeGreaterThan(r1);
    // 자리를 비우면 일꾼 몫이 빠진다
    c.mapId = 'snowfield';
    expect(bRate2(acc.build, acc)).toBeLessThan(r1 * 1.5);
    // 정제소: 창고의 재료로 소금
    acc.build.levels.b_refinery = 1; c.mapId = 'snowtown';
    acc.storage.push({ id: SLT[0].item, qty: 1000 });
    expect(applyAction(acc, 0, { t: 'build', op: 'refine', id: SLT[0].id }, H * 20).ok).toBe(true);
    applyAction(acc, 0, { t: 'build', op: 'visit' }, H * 20 + SLT[0].hours * 2 * H);
    expect(acc.build.salts[SLT[0].id]).toBe(2);
    // 특성 도서관: 책으로 특성 최대 레벨 +1
    acc.build.books = 1;
    expect(applyAction(acc, 0, { t: 'build', op: 'book', id: 'smash' }, H * 40).ok).toBe(true);
    expect(acc.build.talentMax.smash).toBe(1);
    expect(BLD.b_collider && BLD.b_printer && BLD.b_drone && BLD.b_prayertower).toBeTruthy();
  });
});

import { BREED as BR2, RARITY_MULT as RM, arenaWave as aWave } from '../src/core/breeding';
describe('번식(원작에 맞춤)', () => {
  it('알 등급 11가지, 알은 2시간마다, 펫 아레나 기록이 보너스가 된다', () => {
    expect(RM.length).toBe(11); expect(BR2.eggSecs).toBe(7200);
    const { acc, c } = setup();
    c.maxWorld = 4; c.mapId = 'nebtown';
    applyAction(acc, 0, { t: 'breed', op: 'visit' }, 1000);
    acc.breed.pets.push({ uid: 1, sp: 'b_puff', power: aWave(5), gene: 'fighter', rar: 0 });
    expect(applyAction(acc, 0, { t: 'breed', op: 'fight' }, 1000).ok).toBe(false); // 팀 없음
    expect(applyAction(acc, 0, { t: 'breed', op: 'arena', uid: 1 }, 1000).ok).toBe(true);
    const d0 = derive(c, acc).dmg;
    const r = applyAction(acc, 0, { t: 'breed', op: 'fight' }, 1000);
    expect(r.ok).toBe(true); expect(r.n).toBeGreaterThan(3);
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
    expect(applyAction(acc, 0, { t: 'breed', op: 'fight' }, 2000).ok).toBe(false); // 한 시간에 한 번
  });
});

import { CHIP as CH, buyChip, toggleChip } from '../src/core/lab';
describe('연구실 칩', () => {
  it('향신료로 만들고 캐릭터마다 끼우면 효과, 칸은 연구 레벨로', () => {
    const { acc, c } = setup();
    for (const [s, k] of CH.chip_dmg.cost) acc.cook.spices[s] = k * 2;
    expect(buyChip(acc, 'chip_dmg')).toBeNull(); expect(buyChip(acc, 'chip_dmg')).toBeNull();
    const d0 = derive(c, acc).dmg;
    expect(toggleChip(acc, c, 'chip_dmg')).toBeNull();
    expect(derive(c, acc).dmg).toBeGreaterThan(d0);
    expect(toggleChip(acc, c, 'chip_dmg')).toBeNull(); // 빼기
    expect(toggleChip(acc, c, 'chip_dmg')).toBeNull();
    expect(acc.lab.chipBag.length).toBe(1);
  });
});

import { ARENAS } from '../src/core/data';
import { arcadeSettle as aSet, poppySettle as pSet } from '../src/core/arcade';
describe('2·3월드 콜로세움·오락실·포피', () => {
  it('월드마다 콜로세움, 오락실 공은 30분마다, 공을 쏘면 보너스나 코인, 포피는 물고기를 낚아 보너스', () => {
    expect(Object.keys(ARENAS)).toEqual(['arena', 'arena2', 'arena3', 'rift']);
    const { acc, c } = setup();
    c.maxWorld = 2;
    const H = 3_600_000;
    applyAction(acc, 0, { t: 'arcade', op: 'visit' }, H);
    aSet(acc, H * 3);
    expect(acc.arcade.balls).toBe(5 + 4);
    const d0 = JSON.stringify(derive(c, acc));
    for (let i = 0; i < 9; i++) expect(applyAction(acc, 0, { t: 'arcade', op: 'shoot' }, H * 3).ok).toBe(true);
    expect(applyAction(acc, 0, { t: 'arcade', op: 'shoot' }, H * 3).ok).toBe(false);
    expect(JSON.stringify(derive(c, acc)) !== d0 || acc.coins > 0).toBe(true);
    applyAction(acc, 0, { t: 'poppy', op: 'visit' }, H);
    pSet(acc, H * 11);
    expect(acc.poppy.fish).toBeCloseTo(60, 5);
    expect(applyAction(acc, 0, { t: 'poppy', op: 'up', id: 'pp_tales' }, H * 11).ok).toBe(true);
    expect(derive(c, acc).xpMult).toBeGreaterThan(1);
  });
});

import { RIFT_BONUS, ARENAS as AR2 } from '../src/core/data';
import { SIGILS as SG, sigilLv as sLv } from '../src/core/alchemy';
describe('균열·시길', () => {
  it('균열 최고 기록으로 영구 보너스, 시길은 맡은 캐릭터가 기운을 모아 단계가 오른다', () => {
    const { acc, c } = setup();
    expect(AR2.rift.waves.length).toBe(15);
    const d0 = derive(c, acc).xpMult;
    acc.riftBest = RIFT_BONUS[1].waves;
    expect(derive(c, acc).xpMult).toBeGreaterThan(d0);
    c.maxWorld = 2;
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1);
    expect(applyAction(acc, 0, { t: 'alch', op: 'assign', id: `g:${SG[0].id}` }, 1).ok).toBe(true);
    applyAction(acc, 0, { t: 'alch', op: 'start' }, 1 + 30 * 3_600_000);
    expect(sLv(acc.alch, SG[0].id)).toBe(1);
  });
});

import { TASKS as TK, tasksOf, MERITS as MR } from '../src/core/tasks';
describe('작업판(월드마다)·일일 과제·공로 상점', () => {
  it('월드마다 작업판, 과제마다 10단계, 일일 과제 4개, 큰 배낭으로 가방 칸', () => {
    for (const w of [1, 2, 3, 4]) expect(tasksOf(w).length).toBeGreaterThan(8);
    expect(TK.every((t) => t.tiers.length === 10)).toBe(true);
    const { acc, c } = setup();
    c.kills.meadow = 10; c.kills.hills = 10; c.kills.forest = 10; c.kills.swamp = 10;
    const day = new Date(2026, 10, 26, 12).getTime();
    expect(applyAction(acc, 0, { t: 'daily' }, day).ok).toBe(true);
    expect(acc.daily!.list.length).toBe(4);
    const d = acc.daily!.list[0];
    expect(applyAction(acc, 0, { t: 'daily', i: 0 }, day).ok).toBe(false);
    c.kills[d.map] = (c.kills[d.map] ?? 0) + d.n;
    expect(applyAction(acc, 0, { t: 'daily', i: 0 }, day).ok).toBe(true);
    expect(acc.merit).toBe(1);
    acc.merit = 100;
    const bag0 = invSize(c);
    expect(applyAction(acc, 0, { t: 'merit', id: 'bag' }, day).ok).toBe(true);
    expect(invSize(c)).toBe(bag0 + 2);
    expect(MR.length).toBeGreaterThanOrEqual(12);
  });
});

import { BOOST_SECS, drinkBoosts, setFood as sFood } from '../src/core/state';
describe('버프 물약·황금 음식·가방·보관함', () => {
  it('물약은 음식 칸에 있으면 효과, 10분마다 하나씩 마시고, 황금 음식은 먹지 않고 개수만큼 효과', () => {
    const { acc, c } = setup();
    const d0 = derive(c, acc).dmg;
    addItem(c, 'potion_power', 3);
    expect(sFood(c, 'potion_power', 0)).toBeNull();
    expect(derive(c, acc).dmg).toBeCloseTo(d0 * 1.15, 3);
    expect(drinkBoosts(c, 3)).toBe(3);
    expect(c.foods[0]).toBeNull();
    const h0 = derive(c, acc).maxHp;
    addItem(c, 'gold_berry', 10);
    sFood(c, 'gold_berry', 1);
    expect(derive(c, acc).maxHp).toBeGreaterThan(h0);
    expect(BOOST_SECS).toBe(600);
    expect(c.foods.length).toBe(5);
  });
});

describe('가방 편의·초기화', () => {
  it('정리·잠금·잡템 팔기, 특성·능력치 초기화 물약', () => {
    const { acc, c } = setup();
    addItem(c, 'moss', 20); addItem(c, 'pebble', 10); addItem(c, 'berry', 5); addItem(c, 'log', 5);
    expect(applyAction(acc, 0, { t: 'bag', op: 'lock', id: 'pebble' }, 0).ok).toBe(true);
    const r = applyAction(acc, 0, { t: 'bag', op: 'junk' }, 0);
    expect(r.n).toBeGreaterThan(0);
    expect(c.inventory.some((x) => x.id === 'moss')).toBe(false);
    expect(c.inventory.some((x) => x.id === 'pebble')).toBe(true);
    expect(c.inventory.some((x) => x.id === 'log')).toBe(true); // 자원은 남긴다
    expect(applyAction(acc, 0, { t: 'bag', op: 'sort' }, 0).ok).toBe(true);
    c.level = 10; c.stats.str = 5; c.statPoints = 0; c.talents = { smash: 3 };
    addItem(c, 'talent_reset', 1); addItem(c, 'stat_reset', 1);
    expect(applyAction(acc, 0, { t: 'use', id: 'talent_reset' }, 0).ok).toBe(true);
    expect(c.talents).toEqual({});
    expect(applyAction(acc, 0, { t: 'use', id: 'stat_reset' }, 0).ok).toBe(true);
    expect(c.stats.str).toBe(1); expect(c.statPoints).toBe(4);
  });
});

describe('추가 NPC·퀘스트', async () => {
  const D = await import('../src/core/data');
  const S = await import('../src/core/state');
  it('NPC 19명 이상, 퀘스트 80개 이상, 모든 목표·보상 id가 있다', () => {
    const npcs = Object.values(D.NPCS);
    expect(npcs.length).toBeGreaterThanOrEqual(19);
    expect(npcs.reduce((a, n) => a + n.quests.length, 0)).toBeGreaterThanOrEqual(80);
    for (const n of npcs) {
      if (n.quests.length) expect(Object.values(D.MAPS).some((m) => m.facilities.some((f) => f.npc === n.id)), n.id).toBe(true);
      for (const q of n.quests) {
        const g = q.goal;
        if ('kill' in g) expect(D.MONSTERS[g.kill], g.kill).toBeTruthy();
        if ('item' in g) expect(D.ITEMS[g.item], g.item).toBeTruthy();
        if (q.reward.item) expect(D.ITEMS[q.reward.item], q.reward.item).toBeTruthy();
      }
    }
  });
  it('레벨·기술 목표 퀘스트를 완료할 수 있다', () => {
    const { acc, c } = setup();
    S.acceptQuest(c, 'miner');
    expect(S.questProgress(c, 'miner')!.done).toBe(false);
    c.skills.mining.lv = 5;
    expect(S.questProgress(c, 'miner')!.done).toBe(true);
    expect(S.completeQuest(acc, c, 'miner')).toBeNull();
    S.acceptQuest(c, 'scholar');
    c.level = 10;
    expect(S.completeQuest(acc, c, 'scholar')).toBeNull();
    expect(D.questGoalText({ lv: 10 })).toBe('레벨 10 달성');
  });
});

describe('보스 난이도', async () => {
  const D = await import('../src/core/data');
  const S = await import('../src/core/state');
  it('아래 단계를 깨야 다음 난이도가 열리고, 난이도마다 체력·드롭이 커진다', () => {
    const { acc } = setup();
    expect(S.setBossTier(acc, 'mossking', 1)).not.toBeNull();
    acc.bossBest.mossking = 0;
    expect(S.setBossTier(acc, 'mossking', 1)).toBeNull();
    expect(S.setBossTier(acc, 'mossking', 2)).not.toBeNull();
    const base = D.MONSTERS.mossking, hard = D.bossDefAt(base, 2);
    expect(hard.id).toBe('mossking');
    expect(hard.hp).toBe(base.hp * 40);
    expect(hard.drops[0].chance).toBeGreaterThanOrEqual(base.drops[0].chance);
    expect(applyAction(acc, 0, { t: 'bossTier', id: 'mossking', tier: 0 }, Date.now()).ok).toBe(true);
  });
});
