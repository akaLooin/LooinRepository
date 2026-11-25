// 요리(4월드, 계정 공용): 성운 정거장의 별빛 식당.
//  · 향신료: 원작처럼 번식 영역(펫 원정)에서만 모인다. 영역마다 한 가지.
//  · 주방: 접속하지 않아도 고른 요리를 계속 만든다. 주방마다 속도(요리 수)·불(연구 속도)·행운(두 배로 나올 확률)을 올린다.
//  · 요리 연구: 향신료 1~4가지를 넣고 기다리면 운이 좋으면 아직 모르는 요리를 찾는다(실패하면 탄 요리). 넣은 가짓수가 많을수록 높은 단계 요리.
//  · 국자: 시간이 지나면 모이고, 하나로 주방의 1시간치를 바로 진행한다.
//  · 요리는 쌓인 개수로 레벨을 올려 계정 전체 보너스가 된다.
//  · 요리사: 캐릭터를 식탁에 앉히면 요리 레벨만큼 모든 주방이 빨라지고, 그 캐릭터는 요리 경험치를 얻는다.
import { BonusKey, MAPS, classSkillMult } from './data';
import type { Account } from './state';
import { gainSkillXp } from './state';
import { atStation, labMult, STATION_MAP } from './lab';

export interface SpiceDef { id: string; name: string; map: string; color: string }
export const SPICES: SpiceDef[] = [
  { id: 'sp_dust', name: '달먼지 가루', map: 'moondust', color: '#e0dce8' },
  { id: 'sp_salt', name: '구덩이 소금', map: 'crater', color: '#b4a8c4' },
  { id: 'sp_honey', name: '성운 꿀', map: 'nebula', color: '#ff9ae0' },
  { id: 'sp_pepper', name: '운석 후추', map: 'asteroid', color: '#7a6a64' },
  { id: 'sp_cinna', name: '고리 계피', map: 'rings', color: '#c8864a' },
  { id: 'sp_mint', name: '혜성 박하', map: 'comet', color: '#9ad8f6' },
  { id: 'sp_vanilla', name: '공허 바닐라', map: 'voidedge', color: '#8a5ad8' },
];
export const SPICE: Record<string, SpiceDef> = Object.fromEntries(SPICES.map((s) => [s.id, s]));

/** tier: 연구에 넣은 향신료 가짓수로 찾는 단계. secs: 속도 1에서 한 접시 만드는 시간 */
export interface MealDef { id: string; name: string; tier: number; eff: BonusKey; per: number; unit: string; color: string }
export const MEALS: MealDef[] = [
  { id: 'm_bun', name: '달빛 찐빵', tier: 1, eff: 'hpPct', per: 1, unit: '%', color: '#f4f0e6' },
  { id: 'm_cookie', name: '별먼지 쿠키', tier: 1, eff: 'mining', per: 2, unit: '%', color: '#d8a86a' },
  { id: 'm_soup', name: '구덩이 수프', tier: 1, eff: 'chopping', per: 2, unit: '%', color: '#c88a4a' },
  { id: 'm_pudding', name: '젤리 푸딩', tier: 1, eff: 'fishing', per: 2, unit: '%', color: '#ff9ae0' },
  { id: 'm_toast', name: '달걀 토스트', tier: 1, eff: 'catching', per: 2, unit: '%', color: '#f2d27a' },
  { id: 'm_ricecake', name: '운석 떡', tier: 1, eff: 'def', per: 1, unit: '', color: '#e8e0f0' },
  { id: 'm_cotton', name: '솜사탕 구름', tier: 1, eff: 'agi', per: 1, unit: '', color: '#ffc8e8' },
  { id: 'm_onigiri', name: '별가루 주먹밥', tier: 1, eff: 'str', per: 1, unit: '', color: '#f6f6f6' },
  { id: 'm_milktea', name: '우유 별차', tier: 1, eff: 'wis', per: 1, unit: '', color: '#e8d8c0' },
  { id: 'm_cracker', name: '꿀 크래커', tier: 1, eff: 'luk', per: 1, unit: '', color: '#e8b84a' },
  { id: 'm_potato', name: '달콤 감자', tier: 1, eff: 'hp', per: 10, unit: '', color: '#c8864a' },
  { id: 'm_pretzel', name: '소금 프레첼', tier: 1, eff: 'coins', per: 1, unit: '%', color: '#b07a4e' },
  { id: 'm_pancake', name: '달 팬케이크', tier: 1, eff: 'xp', per: 0.5, unit: '%', color: '#f0c88a' },
  { id: 'm_steak', name: '운석 스테이크', tier: 2, eff: 'dmg', per: 1, unit: '%', color: '#a8543a' },
  { id: 'm_pie', name: '고리 파이', tier: 2, eff: 'catching', per: 2.5, unit: '%', color: '#e8b84a' },
  { id: 'm_shaved', name: '혜성 빙수', tier: 2, eff: 'xp', per: 1, unit: '%', color: '#c8f0ff' },
  { id: 'm_noodle', name: '별가루 국수', tier: 2, eff: 'coins', per: 2, unit: '%', color: '#f6e08a' },
  { id: 'm_dumpling', name: '성운 만두', tier: 2, eff: 'mining', per: 3, unit: '%', color: '#f0e8f8' },
  { id: 'm_friedrice', name: '고리 볶음밥', tier: 2, eff: 'chopping', per: 3, unit: '%', color: '#e8c060' },
  { id: 'm_sorbet', name: '박하 셔벗', tier: 2, eff: 'fishing', per: 3, unit: '%', color: '#9ad8f6' },
  { id: 'm_skewer', name: '후추 꼬치', tier: 2, eff: 'acc', per: 2, unit: '', color: '#8a5a3a' },
  { id: 'm_roll', name: '계피 롤', tier: 2, eff: 'card', per: 0.5, unit: '%', color: '#c8864a' },
  { id: 'm_lasagna', name: '별빛 라자냐', tier: 2, eff: 'hpPct', per: 1.2, unit: '%', color: '#d86a4a' },
  { id: 'm_stew', name: '우주 스튜', tier: 2, eff: 'def', per: 2, unit: '', color: '#8a5a4a' },
  { id: 'm_waffle', name: '은하 와플', tier: 2, eff: 'drop', per: 0.7, unit: '%', color: '#e8a85a' },
  { id: 'm_udon', name: '꿈결 우동', tier: 2, eff: 'afk', per: 0.1, unit: '%p', color: '#f6f0e0' },
  { id: 'm_curry', name: '성운 카레', tier: 3, eff: 'drop', per: 1, unit: '%', color: '#e8a83a' },
  { id: 'm_tart', name: '공허 타르트', tier: 3, eff: 'afk', per: 0.2, unit: '%p', color: '#6a4aa8' },
  { id: 'm_cake', name: '은하 케이크', tier: 3, eff: 'luk', per: 3, unit: '', color: '#b48aff' },
  { id: 'm_bento', name: '궤도 도시락', tier: 3, eff: 'hpPct', per: 1.5, unit: '%', color: '#8ad06a' },
  { id: 'm_pizza', name: '혜성 피자', tier: 3, eff: 'dmg', per: 1.2, unit: '%', color: '#e86a3a' },
  { id: 'm_burger', name: '소행성 버거', tier: 3, eff: 'str', per: 3, unit: '', color: '#a86a3a' },
  { id: 'm_taco', name: '별무리 타코', tier: 3, eff: 'agi', per: 3, unit: '', color: '#e8c04a' },
  { id: 'm_sushi', name: '위성 스시', tier: 3, eff: 'wis', per: 3, unit: '', color: '#ff8a7a' },
  { id: 'm_crepe', name: '바닐라 크레페', tier: 3, eff: 'xp', per: 1.2, unit: '%', color: '#f6e8c8' },
  { id: 'm_gelato', name: '오로라 젤라또', tier: 3, eff: 'card', per: 0.8, unit: '%', color: '#9ae8c8' },
  { id: 'm_risotto', name: '운석 리소토', tier: 3, eff: 'coins', per: 3, unit: '%', color: '#e8dca8' },
  { id: 'm_ramen', name: '블루문 라멘', tier: 3, eff: 'mining', per: 4, unit: '%', color: '#4a8ae8' },
  { id: 'm_salad', name: '별똥 샐러드', tier: 3, eff: 'chopping', per: 4, unit: '%', color: '#6ac85a' },
  { id: 'm_feast', name: '초신성 정식', tier: 4, eff: 'dmg', per: 1.5, unit: '%', color: '#ff7a3a' },
  { id: 'm_macaron', name: '블랙홀 마카롱', tier: 4, eff: 'xp', per: 1.5, unit: '%', color: '#3a2a5a' },
  { id: 'm_banquet', name: '우주 만찬', tier: 4, eff: 'drop', per: 1.5, unit: '%', color: '#f6c945' },
  { id: 'm_bbq', name: '거신 바비큐', tier: 4, eff: 'afk', per: 0.3, unit: '%p', color: '#8a3a2a' },
  { id: 'm_fondue', name: '은하수 퐁듀', tier: 4, eff: 'hpPct', per: 2, unit: '%', color: '#f6d860' },
  { id: 'm_souffle', name: '퀘이사 수플레', tier: 4, eff: 'luk', per: 5, unit: '', color: '#f8e0a8' },
  { id: 'm_paella', name: '펄서 파에야', tier: 4, eff: 'card', per: 1.2, unit: '%', color: '#e8a030' },
  { id: 'm_course', name: '성단 코스요리', tier: 4, eff: 'coins', per: 4, unit: '%', color: '#c8a8ff' },
  { id: 'm_buffet', name: '혜성 뷔페', tier: 4, eff: 'fishing', per: 5, unit: '%', color: '#7ac8ff' },
  { id: 'm_tagine', name: '별빛 타진', tier: 4, eff: 'catching', per: 5, unit: '%', color: '#d8884a' },
  { id: 'm_hotpot', name: '궤도 전골', tier: 4, eff: 'def', per: 4, unit: '', color: '#d84a3a' },
  { id: 'm_tiramisu', name: '공허 티라미수', tier: 4, eff: 'acc', per: 5, unit: '', color: '#6a4a3a' },
  { id: 'm_kebab', name: '빅뱅 케밥', tier: 4, eff: 'str', per: 5, unit: '', color: '#a8542a' },
];
export const MEAL: Record<string, MealDef> = Object.fromEntries(MEALS.map((m) => [m.id, m]));

export const COOK = {
  /** 단계별 한 접시 시간(초, 속도 1) */
  secs: [0, 120, 300, 900, 2400],
  /** 단계별 요리사 경험치(한 접시) */
  xp: [0, 2, 4, 8, 16],
  mealMax: 30,
  spdPer: 0.08, firePer: 0.12, luckPer: 0.03, upMax: 40,
  /** 연구 기본 시간(초, 향신료 한 가지당) */
  recipeSecs: 1800,
  kitchenCost: [0, 250_000, 1_500_000, 8_000_000, 40_000_000, 120_000_000, 300_000_000, 700_000_000, 1_500_000_000, 3_000_000_000],
  /** 연구 성공 기본 확률(실패하면 탄 요리: 향신료만 쓰고 경험치 조금), 행운 단계마다 +1%p */
  recipeChance: 0.45, recipeLuckPer: 0.01,
  /** 국자: 3시간마다 하나(최대 30개). 하나로 그 주방의 1시간치를 바로 진행 */
  ladleHours: 3, ladleMax: 30,
  chefPer: 0.03,
  bankHours: 24,
};

export type KitchenUp = 'spd' | 'fire' | 'luck';
/** recipe.meal 이 ''이면 실패할 연구(탄 요리) */
export interface Kitchen { meal: string | null; recipe: { sp: string[]; prog: number; need: number; meal: string } | null; spd: number; fire: number; luck: number }
export interface Cook {
  t: number; xpFrac: number; spices: Record<string, number>; bank: Record<string, number>;
  found: string[]; meals: Record<string, { lv: number; n: number }>; kitchens: Kitchen[]; chefs: number[];
  /** 연구 시도 횟수(결과를 정하는 씨앗), 국자 */
  tries: number; ladles: number; ladleFrac: number;
}
export const newKitchen = (): Kitchen => ({ meal: null, recipe: null, spd: 0, fire: 0, luck: 0 });
export const newCook = (): Cook => ({ t: 0, xpFrac: 0, spices: {}, bank: {}, found: [], meals: {}, kitchens: [newKitchen()], chefs: [], tries: 0, ladles: 0, ladleFrac: 0 });

/** 향신료는 원작처럼 번식 영역에서만 모인다(사냥으로는 모이지 않음). 예전 저장고에 남은 것만 거둘 수 있다 */
export function spiceRate(_acc: Pick<Account, 'characters'>, _sp: SpiceDef): number { return 0; }
export const mealNeed = (lv: number) => Math.ceil(10 * Math.pow(1.5, lv));
export const upCost = (lv: number) => Math.ceil(8 * Math.pow(1.32, lv));
/** 이 주방 단계를 올리는 데 드는 향신료(단계마다 돌아가며) */
export const upSpice = (idx: number, k: KitchenUp, lv: number) => SPICES[(lv + idx + (k === 'spd' ? 0 : k === 'fire' ? 2 : 4)) % SPICES.length].id;
export const recipeCost = (found: number) => 10 + found * 5;
export const chefMult = (acc: Pick<Account, 'cook' | 'characters'>) =>
  1 + acc.cook.chefs.reduce((s, id) => s + (atStation(acc, id) ? acc.characters.find((c) => c.id === id)?.skills.cooking?.lv ?? 0 : 0), 0) * COOK.chefPer;
type CookAcc = Pick<Account, 'cook' | 'characters'> & Partial<Pick<Account, 'lab'>>;
export const kitchenSpeed = (acc: CookAcc, k: Kitchen) => (1 + k.spd * COOK.spdPer) * chefMult(acc) * labMult(acc, 'kitchen');
/** 이 주방에서 시간당 나오는 접시 수(행운의 두 배 확률은 평균으로) */
export const mealsPerHour = (acc: CookAcc, k: Kitchen, id: string) =>
  (3600 / COOK.secs[MEAL[id].tier]) * kitchenSpeed(acc, k) * (1 + k.luck * COOK.luckPer);
export const recipeRate = (k: Kitchen) => 1 + k.fire * COOK.firePer;

const hashStr = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
/** 이 향신료 조합으로 찾게 될 요리(넣은 가짓수 단계에서 먼저, 다 찾았으면 아래 단계) */
/** 이 주방의 연구 성공 확률 */
export const recipeChance = (k: Kitchen) => Math.min(0.95, COOK.recipeChance + k.luck * COOK.recipeLuckPer);
/** 이번 연구가 성공하는가(시도 횟수·조합으로 정해져 기기와 서버가 같다) */
export const recipeRoll = (cook: Cook, sp: string[]) => (hashStr([...sp].sort().join('+') + '#' + cook.tries) % 10000) / 10000;
export function recipeResult(cook: Cook, sp: string[]): string | null {
  const n = sp.length, left = MEALS.filter((m) => !cook.found.includes(m.id) && m.tier <= n);
  if (!left.length) return null;
  const top = Math.max(...left.map((m) => m.tier)), pool = left.filter((m) => m.tier === top);
  return pool[hashStr([...sp].sort().join('+') + ':' + cook.found.length) % pool.length].id;
}

export function cookSettle(acc: Account, now: number) {
  const k = acc.cook;
  if (!k.t) { k.t = now; return; }
  if (now <= k.t) return;
  const h = (now - k.t) / 3_600_000;
  k.t = now;
  // 국자: 시간이 지나면 하나씩
  k.ladleFrac = (k.ladleFrac ?? 0) + h / COOK.ladleHours;
  const nl = Math.floor(k.ladleFrac);
  if (nl > 0) { k.ladles = Math.min(COOK.ladleMax, (k.ladles ?? 0) + nl); k.ladleFrac -= nl; }
  if (k.ladles >= COOK.ladleMax) k.ladleFrac = 0;
  let xp = 0;
  for (const kit of k.kitchens) {
    if (kit.recipe) {
      kit.recipe.prog = Math.min(kit.recipe.need, kit.recipe.prog + h * 3600 * recipeRate(kit));
      if (kit.recipe.prog >= kit.recipe.need) {
        const id = kit.recipe.meal;
        if (!id) { xp += COOK.xp[kit.recipe.sp.length] * 4; kit.recipe = null; } // 실패: 탄 요리
        else {
          if (!k.found.includes(id)) k.found.push(id);
          k.meals[id] ??= { lv: 0, n: 0 };
          xp += COOK.xp[MEAL[id].tier] * 20;
          kit.recipe = null; kit.meal = id; // 찾은 요리를 바로 만들기 시작
        }
      }
    } else if (kit.meal) {
      const n = mealsPerHour(acc, kit, kit.meal) * h;
      const m = (k.meals[kit.meal] ??= { lv: 0, n: 0 });
      m.n += n;
      xp += n * COOK.xp[MEAL[kit.meal].tier];
    }
  }
  xp += k.xpFrac;
  const whole = Math.floor(xp);
  k.xpFrac = xp - whole;
  if (whole > 0) for (const id of k.chefs) { const c = acc.characters.find((x) => x.id === id); if (c && atStation(acc, id)) gainSkillXp(c, 'cooking', Math.floor(whole * classSkillMult(c, 'cooking'))); }
}

const kitchenAt = (acc: Account, idx: number) => acc.cook.kitchens[idx];

export function claimSpices(acc: Account, now: number): string | null {
  cookSettle(acc, now);
  const k = acc.cook;
  let got = 0;
  for (const sp of SPICES) {
    const n = Math.floor(k.bank[sp.id] ?? 0);
    if (n > 0) { k.spices[sp.id] = (k.spices[sp.id] ?? 0) + n; k.bank[sp.id] -= n; got += n; }
  }
  return got ? null : '거둘 향신료가 없습니다';
}
export function setMeal(acc: Account, idx: number, id: string, now: number): string | null {
  cookSettle(acc, now);
  const kit = kitchenAt(acc, idx);
  if (!kit) return '없는 주방';
  if (kit.recipe) return '연구 중인 주방입니다';
  if (id && !acc.cook.found.includes(id)) return '아직 모르는 요리';
  kit.meal = id || null;
  return null;
}
export function startRecipe(acc: Account, idx: number, sp: string[], now: number): string | null {
  cookSettle(acc, now);
  const kit = kitchenAt(acc, idx), k = acc.cook;
  if (!kit) return '없는 주방';
  if (kit.recipe) return '이미 연구 중입니다';
  const uniq = [...new Set(sp)];
  if (uniq.length < 1 || uniq.length > 4 || uniq.length !== sp.length || uniq.some((s) => !SPICE[s])) return '향신료를 1~4가지 고르세요';
  const meal = recipeResult(k, uniq);
  if (!meal) return '이 조합으로는 더 찾을 요리가 없습니다';
  const cost = recipeCost(k.found.length);
  for (const s of uniq) if ((k.spices[s] ?? 0) < cost) return `${SPICE[s].name}이(가) 부족합니다`;
  for (const s of uniq) k.spices[s] -= cost;
  // 원작처럼 운: 성공하면 새 요리, 실패하면 탄 요리(향신료만 쓴다)
  const win = recipeRoll(k, uniq) < recipeChance(kit);
  k.tries = (k.tries ?? 0) + 1;
  kit.recipe = { sp: uniq, prog: 0, need: COOK.recipeSecs * uniq.length, meal: win ? meal : '' };
  kit.meal = null;
  return null;
}
export function upKitchen(acc: Account, idx: number, key: KitchenUp, now: number): string | null {
  cookSettle(acc, now);
  const kit = kitchenAt(acc, idx);
  if (!kit || !['spd', 'fire', 'luck'].includes(key)) return '없는 주방';
  const lv = kit[key];
  if (lv >= COOK.upMax) return '최대 단계입니다';
  const sp = upSpice(idx, key, lv), cost = upCost(lv);
  if ((acc.cook.spices[sp] ?? 0) < cost) return `${SPICE[sp].name}이(가) 부족합니다`;
  acc.cook.spices[sp] -= cost; kit[key]++;
  return null;
}
export function buyKitchen(acc: Account, now: number): string | null {
  cookSettle(acc, now);
  const cost = COOK.kitchenCost[acc.cook.kitchens.length];
  if (cost === undefined) return '주방을 더 늘릴 수 없습니다';
  if (acc.coins < cost) return '코인이 부족합니다';
  acc.coins -= cost; acc.cook.kitchens.push(newKitchen());
  return null;
}
export function levelMeal(acc: Account, id: string, now: number): string | null {
  cookSettle(acc, now);
  const m = acc.cook.meals[id];
  if (!m || !acc.cook.found.includes(id)) return '아직 모르는 요리';
  if (m.lv >= COOK.mealMax) return '최대 레벨입니다';
  const need = mealNeed(m.lv);
  if (m.n < need) return '요리가 부족합니다';
  m.n -= need; m.lv++;
  return null;
}
/** 국자 하나로 이 주방의 1시간치를 바로 진행(연구 중이면 연구, 요리 중이면 요리) */
export function useLadle(acc: Account, idx: number, now: number): string | null {
  cookSettle(acc, now);
  const k = acc.cook, kit = kitchenAt(acc, idx);
  if (!kit) return '없는 주방';
  if ((k.ladles ?? 0) < 1) return '국자가 없습니다';
  if (kit.recipe) { kit.recipe.prog = Math.min(kit.recipe.need, kit.recipe.prog + 3600 * recipeRate(kit)); }
  else if (kit.meal) { const m = (k.meals[kit.meal] ??= { lv: 0, n: 0 }); m.n += mealsPerHour(acc, kit, kit.meal); }
  else return '쉬고 있는 주방입니다';
  k.ladles--;
  // 연구가 끝났으면 바로 반영
  k.t = now - 1; cookSettle(acc, now);
  return null;
}
/** 이 캐릭터를 식탁에 앉히거나 일으킨다(앉을 수 있는 수 = 주방 수) */
export function toggleChef(acc: Account, charId: number, now: number): string | null {
  cookSettle(acc, now);
  const k = acc.cook, i = k.chefs.indexOf(charId);
  if (i >= 0) { k.chefs.splice(i, 1); return null; }
  if (k.chefs.length >= k.kitchens.length) return '식탁 자리가 없습니다(주방 수만큼)';
  if (acc.characters.find((c) => c.id === charId)?.mapId !== STATION_MAP) return '성운 정거장에 있어야 요리할 수 있습니다';
  k.chefs.push(charId);
  // 한 캐릭터는 한 곳에서만 일한다: 식탁에 서면 연구실에서 물러난다
  if (acc.lab) acc.lab.members = acc.lab.members.filter((m) => m.id !== charId);
  if (acc.breed?.keepers) acc.breed.keepers = acc.breed.keepers.filter((x) => x !== charId);
  return null;
}
export function cookBonus(k: Cook | undefined, add: (key: BonusKey, v: number) => void) {
  if (!k) return;
  for (const m of MEALS) { const lv = k.meals[m.id]?.lv ?? 0; if (lv) add(m.eff, lv * m.per); }
}
/** 향신료가 나는 맵 이름 */
export const spiceMapName = (sp: SpiceDef) => MAPS[sp.map]?.name ?? sp.map;
