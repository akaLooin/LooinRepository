// 원작에 맞춘 규칙들(가족 보너스·황금 석상·수정 몬스터·요리사/연구원 자리·자동 줍기·방치 상한·모루)
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/core/actions';
import { AFK_MAX_SECONDS, CRYSTAL_CHANCE, FAMILY, FAMILY_MIN, MAX_CHARACTERS, MONSTERS, PRODUCTS, crystalOf, statueNeed } from '../src/core/data';
import { familyBest, statueLv } from '../src/core/progress';
import { addItem, createCharacter, derive, newAccount } from '../src/core/state';
import { chefMult } from '../src/core/cooking';
import { labState } from '../src/core/lab';
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
    expect(applyAction(acc, 0, { t: 'lab', op: 'place', spot: 0 }, 2000).ok).toBe(true);
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
