// 게임 콘텐츠 정의. 이름/수치는 전부 임시(placeholder)이며 나중에 컨셉에 맞춰 교체한다.
// 이 폴더(core)는 DOM/Phaser에 의존하지 않는다 → 추후 서버에서 그대로 재사용.

export type StatKey = 'str' | 'agi' | 'wis' | 'luk';
export type SkillKey = 'mining' | 'chopping' | 'smithing';
export type GatherSkill = 'mining' | 'chopping';
/** 가방 한 칸에 쌓을 수 있는 양을 나누는 묶음 */
export type StackGroup = 'material' | 'resource' | 'food' | 'equip' | 'misc';
export type FacilityKind = 'npc' | 'anvil' | 'storage' | 'shop' | 'forge' | 'stamps' | 'tasks' | 'statues' | 'pets' | 'owl';
export type BaseClass = 'beginner' | 'warrior' | 'archer' | 'mage';
export type ClassId = BaseClass | 'guardian' | 'berserker' | 'sharpshooter' | 'ranger' | 'elementalist' | 'hexer';
export type WeaponType = 'sword' | 'bow' | 'wand';
export type EquipSlot = 'weapon' | 'hat' | 'body' | 'legs' | 'shoes' | 'ring' | 'trophy' | 'pickaxe' | 'axe';

export interface ItemStats {
  dmg?: number; def?: number; hp?: number;
  str?: number; agi?: number; wis?: number; luk?: number;
  mining?: number; chopping?: number;
}
export interface ItemDef {
  id: string; name: string; desc: string;
  kind: 'material' | 'equip' | 'food' | 'bag' | 'pouch' | 'chest' | 'key' | 'unlock' | 'stamp' | 'statue' | 'tool';
  /** 가방 확장: 사용하면 이 캐릭터의 가방 칸 +n (종류마다 한 번) */
  bagSlots?: number;
  /** 소지 한도 주머니: 이 묶음의 한 칸 최대치를 cap 으로 */
  pouch?: { group: StackGroup; cap: number };
  /** 창고 확장: 계정 창고 칸 +n (종류마다 한 번) */
  chestSlots?: number;
  /** 음식: 먹으면 회복하는 체력 */
  heal?: number;
  slot?: EquipSlot; stats?: ItemStats; reqLv?: number; wtype?: WeaponType;
  sell: number;
}
export interface DropDef { item: string; chance: number; qty: [number, number] }
export interface MonsterDef {
  id: string; name: string; hp: number; atk: number; xp: number;
  coins: [number, number]; speed: number; drops: DropDef[];
  /** 명중 요구치: 내 명중이 이 값이면 100% 명중, 절반 이하면 전혀 맞지 않는다 */
  acc: number;
  /** 이 방어력 이상이면 받는 피해가 0 */
  defZero: number;
  /** 렌더러가 쓰는 움직임 유형 */
  motion: 'hop' | 'waddle' | 'float';
  radius: number;
  /** 보스: 주기적으로 내려찍기(예고 후 범위 피해) */
  boss?: { slamEvery: number; slamWindup: number; slamRadius: number; slamDmg: number; card: string };
  /** 그림 배율 */
  scale?: number;
  /** 다른 몬스터 그림을 빌려 쓸 때 그 id, 그리고 물들일 색 */
  art?: string; tint?: number;
}
export interface NodeDef {
  id: string; name: string; skill: GatherSkill; reqLv: number;
  hp: number; xp: number; item: string;
}
/** solid: 아래가 흙으로 꽉 찬 언덕. 지면에서는 옆으로 지나갈 수 없다(맵 가장자리에 붙여 쓴다) */
export interface Platform { x: number; y: number; w: number; solid?: boolean }
export interface PortalDef { x: number; y?: number; to: string; toX: number; toY?: number; reqKills?: number; key?: string; label?: string;
  /** 기술 레벨로 여는 문(광산) */
  reqSkill?: { skill: GatherSkill; lv: number } }
export interface FacilityDef { kind: FacilityKind; x: number; y: number; /** NPC 시설이면 어느 NPC인지 */ npc?: string }
export interface MapDef {
  id: string; name: string; width: number;
  theme: 'town' | 'meadow' | 'hills' | 'forest' | 'swamp' | 'cave' | 'ridge' | 'ruins' | 'grove' | 'mine' | 'arena';
  /** 콜로세움(웨이브 전투) */
  arena?: boolean;
  /** 지면(y=0)을 제외한 발판. y는 위쪽이 음수. */
  platforms: Platform[];
  spawns: { monster: string; count: number }[];
  nodes: { node: string; x: number }[];
  portals: PortalDef[];
  /** 위아래 발판을 잇는 로프. top/bottom은 이어지는 두 발판의 y */
  ropes: { x: number; top: number; bottom: number }[];
  /** 마을 시설: NPC, 모루, 창고, 상점 */
  facilities: FacilityDef[];
  /** 보스방이면 보스 몬스터 ID */
  boss?: string;
  /** 맵에서 보이는 장식(모닥불 등) 위치 */
  campfireX?: number;
}
/** tier: 모루 단계(2 이상은 모루 확장이 필요). unlock: 만들면 아이템 대신 모루 단계가 오른다 */
export interface RecipeDef { item: string; coins: number; mats: [string, number][]; tier?: number; unlock?: number; smithLv?: number }

export const STAT_NAMES: Record<StatKey, string> = { str: '힘', agi: '민첩', wis: '지혜', luk: '행운' };
export const STAT_DESC: Record<StatKey, string> = {
  str: '최대 체력·치명타 피해·채광. 전사 공격력, 궁수 명중', agi: '이동 속도·치명타 확률·모루 생산. 궁수 공격력, 마법사 명중',
  wis: '최대 마나·보스 피해·벌목. 마법사 공격력, 전사 명중', luk: '드롭률·경험치. 초보자 공격력·명중',
};
export const SKILL_NAMES: Record<SkillKey, string> = { mining: '채광', chopping: '벌목', smithing: '대장' };
export const FACILITY_NAMES: Record<FacilityKind, string> = { npc: '촌장', anvil: '모루', storage: '창고', shop: '잡화점', forge: '용광로', stamps: '우표함', tasks: '작업판', statues: '석상 받침', pets: '동료 둥지', owl: '부엉이 횃대' };
export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '무기', hat: '모자', body: '갑옷', legs: '바지', shoes: '신발', ring: '장신구', trophy: '트로피', pickaxe: '곡괭이', axe: '도끼',
};

const items: ItemDef[] = [
  { id: 'moss', name: '이끼 덩이', desc: '촉촉하고 폭신하다.', kind: 'material', sell: 1 },
  { id: 'pebble', name: '조약돌', desc: '손에 쏙 들어오는 돌.', kind: 'material', sell: 3 },
  { id: 'leaf', name: '마른 잎', desc: '바스락거리는 잎.', kind: 'material', sell: 8 },
  { id: 'berry', name: '산딸기', desc: '먹으면 체력 15 회복.', kind: 'food', heal: 15, sell: 1 },
  { id: 'mushroom', name: '숲 버섯', desc: '먹으면 체력 45 회복.', kind: 'food', heal: 45, sell: 4 },
  { id: 'twine', name: '노끈', desc: '모루에서 만든 질긴 끈.', kind: 'material', sell: 1 },
  { id: 'nail', name: '쇠못', desc: '모루에서 만든 못.', kind: 'material', sell: 3 },
  { id: 'plank', name: '판자', desc: '모루에서 다듬은 판자.', kind: 'material', sell: 6 },
  { id: 'bag_small', name: '작은 주머니 가방', desc: '사용하면 이 캐릭터의 가방 +4칸.', kind: 'bag', bagSlots: 4, sell: 10 },
  { id: 'bag_leather', name: '튼튼한 가방', desc: '사용하면 이 캐릭터의 가방 +6칸.', kind: 'bag', bagSlots: 6, sell: 30 },
  { id: 'pouch_mat', name: '재료 주머니', desc: '사용하면 재료 한 칸에 100개까지.', kind: 'pouch', pouch: { group: 'material', cap: 100 }, sell: 20 },
  { id: 'pouch_res', name: '자원 주머니', desc: '사용하면 통나무·광석 한 칸에 100개까지.', kind: 'pouch', pouch: { group: 'resource', cap: 100 }, sell: 20 },
  { id: 'pouch_food', name: '도시락 주머니', desc: '사용하면 음식 한 칸에 100개까지.', kind: 'pouch', pouch: { group: 'food', cap: 100 }, sell: 20 },
  { id: 'chest_small', name: '작은 보관함', desc: '사용하면 계정 창고 +8칸.', kind: 'chest', chestSlots: 8, sell: 50 },
  { id: 'anvil_exp', name: '모루 확장 I', desc: '만들면 모루 2단계 레시피가 열린다(계정 공용).', kind: 'unlock', sell: 0 },
  { id: 'moss_ring', name: '이끼 반지', desc: '행운이 깃든 반지.', kind: 'equip', slot: 'ring', stats: { luk: 3, hp: 12 }, reqLv: 6, sell: 40 },
  { id: 'pebble_charm', name: '돌 부적', desc: '단단한 돌을 깎아 만든 부적.', kind: 'equip', slot: 'ring', stats: { def: 3, str: 2 }, reqLv: 8, sell: 60 },
  { id: 'forest_key', name: '숲의 열쇠', desc: '속삭임 숲 깊은 곳의 문을 연다. 들어갈 때 사라진다.', kind: 'key', sell: 0 },
  { id: 'log', name: '참나무 통나무', desc: '튼튼한 목재.', kind: 'material', sell: 2 },
  { id: 'ore', name: '붉은돌 광석', desc: '붉은 빛이 도는 광석.', kind: 'material', sell: 4 },
  { id: 'silverlog', name: '은빛 통나무', desc: '은은하게 빛나는 목재.', kind: 'material', sell: 9 },
  { id: 'bar_red', name: '붉은쇠 주괴', desc: '용광로에서 붉은돌 광석을 녹여 만든 쇳덩이.', kind: 'material', sell: 15 },
  ...[
    ['dmg', '칼날 우표'], ['hp', '심장 우표'], ['def', '방패 우표'], ['acc', '과녁 우표'], ['crit', '별똥 우표'],
    ['mining', '곡괭이 우표'], ['chopping', '도끼 우표'], ['drop', '주머니 우표'], ['coins', '동전 우표'], ['xp', '책 우표'], ['afk', '모래시계 우표'],
  ].map(([k, name]) => ({ id: `stamp_${k}`, name, desc: '우표함에 넣으면 계정 전체에 효과가 생긴다.', kind: 'stamp' as const, sell: 1 })),
  ...[['str', '힘의 조각'], ['agi', '날램의 조각'], ['wis', '슬기의 조각'], ['luk', '행운의 조각'], ['guard', '수호의 조각'], ['feast', '풍요의 조각'], ['fortune', '보물의 조각']]
    .map(([k, name]) => ({ id: `statue_${k}`, name, desc: '석상 받침에 바치면 그 석상이 자란다(캐릭터마다).', kind: 'statue' as const, sell: 2 })),
  { id: 'sculpt_tools', name: '조각 도구', desc: '사용하면 마을의 석상 받침을 쓸 수 있다(계정 공용).', kind: 'tool', sell: 0 },
  { id: 'pants_moss', name: '이끼 바지', desc: '폭신한 이끼를 엮은 바지.', kind: 'equip', slot: 'legs', stats: { def: 2, hp: 8 }, sell: 10 },
  { id: 'shoes_leaf', name: '잎새 신발', desc: '발걸음이 가볍다.', kind: 'equip', slot: 'shoes', stats: { agi: 2, def: 1 }, reqLv: 5, sell: 18 },
  { id: 'pants_red', name: '붉은쇠 다리 갑옷', desc: '무릎까지 덮는 쇠판.', kind: 'equip', slot: 'legs', stats: { def: 5, hp: 20 }, reqLv: 10, sell: 60 },
  { id: 'boots_red', name: '붉은쇠 장화', desc: '쿵쿵 울리는 장화.', kind: 'equip', slot: 'shoes', stats: { def: 3, str: 2 }, reqLv: 10, sell: 60 },
  { id: 'trophy_moss', name: '이끼왕 트로피', desc: '이끼왕을 쓰러뜨린 증표.', kind: 'equip', slot: 'trophy', stats: { str: 2, agi: 2, wis: 2, luk: 2 }, sell: 0 },
  { id: 'ore_blue', name: '푸른돌 광석', desc: '차갑게 빛나는 광석.', kind: 'material', sell: 10 },
  { id: 'ore_gold', name: '금빛돌 광석', desc: '묵직하게 반짝이는 광석.', kind: 'material', sell: 24 },
  { id: 'bar_blue', name: '푸른쇠 주괴', desc: '용광로에서 푸른돌 광석을 녹였다.', kind: 'material', sell: 40 },
  { id: 'bar_gold', name: '금빛 주괴', desc: '용광로에서 금빛돌 광석을 녹였다.', kind: 'material', sell: 90 },
  { id: 'willowlog', name: '버드나무 통나무', desc: '물기를 머금은 낭창한 목재.', kind: 'material', sell: 14 },
  { id: 'moonlog', name: '달빛자작 통나무', desc: '밤에 은은히 빛나는 목재.', kind: 'material', sell: 30 },
  { id: 'shell', name: '진흙 등딱지', desc: '단단하고 가볍다.', kind: 'material', sell: 12 },
  { id: 'glowdust', name: '반딧가루', desc: '손에 묻으면 한참 빛난다.', kind: 'material', sell: 16 },
  { id: 'feather', name: '바람 깃털', desc: '바람을 타는 가벼운 깃털.', kind: 'material', sell: 20 },
  { id: 'runestone', name: '룬 조각', desc: '희미한 무늬가 새겨진 돌.', kind: 'material', sell: 28 },
  { id: 'sporecap', name: '포자 갓', desc: '톡 건드리면 포자가 날린다.', kind: 'material', sell: 36 },
  { id: 'stew', name: '늪 스튜', desc: '먹으면 체력 120 회복.', kind: 'food', heal: 120, sell: 10 },
  { id: 'moonpie', name: '달빛 파이', desc: '먹으면 체력 300 회복.', kind: 'food', heal: 300, sell: 25 },
  { id: 'anvil_exp2', name: '모루 확장 II', desc: '만들면 모루 3단계 레시피가 열린다(계정 공용).', kind: 'unlock', sell: 0 },
  ...([['blue', '푸른쇠', 1], ['gold', '금빛', 2]] as const).flatMap(([k, n, t]) => [
    { id: `sword_${k}`, name: `${n} 검`, desc: '날이 잘 선 검.', kind: 'equip' as const, slot: 'weapon' as const, wtype: 'sword' as const, stats: { dmg: t === 1 ? 30 : 60, str: t === 1 ? 4 : 8 }, reqLv: t === 1 ? 20 : 35, sell: t === 1 ? 200 : 600 },
    { id: `bow_${k}`, name: `${n} 활`, desc: '시위가 팽팽하다.', kind: 'equip' as const, slot: 'weapon' as const, wtype: 'bow' as const, stats: { dmg: t === 1 ? 28 : 56, agi: t === 1 ? 5 : 9 }, reqLv: t === 1 ? 20 : 35, sell: t === 1 ? 200 : 600 },
    { id: `wand_${k}`, name: `${n} 지팡이`, desc: '끝에 결정이 박혀 있다.', kind: 'equip' as const, slot: 'weapon' as const, wtype: 'wand' as const, stats: { dmg: t === 1 ? 28 : 56, wis: t === 1 ? 5 : 9 }, reqLv: t === 1 ? 20 : 35, sell: t === 1 ? 200 : 600 },
    { id: `pick_${k}`, name: `${n} 곡괭이`, desc: `채광 효율 +${t === 1 ? 10 : 18}`, kind: 'equip' as const, slot: 'pickaxe' as const, stats: { mining: t === 1 ? 10 : 18 }, reqLv: t === 1 ? 15 : 28, sell: t === 1 ? 150 : 450 },
    { id: `axe_${k}`, name: `${n} 도끼`, desc: `벌목 효율 +${t === 1 ? 10 : 18}`, kind: 'equip' as const, slot: 'axe' as const, stats: { chopping: t === 1 ? 10 : 18 }, reqLv: t === 1 ? 15 : 28, sell: t === 1 ? 150 : 450 },
    { id: `helm_${k}`, name: `${n} 투구`, desc: '머리를 단단히 지킨다.', kind: 'equip' as const, slot: 'hat' as const, stats: { def: t === 1 ? 8 : 16, hp: t === 1 ? 40 : 90 }, reqLv: t === 1 ? 18 : 33, sell: t === 1 ? 160 : 480 },
    { id: `plate_${k}`, name: `${n} 갑옷`, desc: '판금을 이어 붙였다.', kind: 'equip' as const, slot: 'body' as const, stats: { def: t === 1 ? 12 : 24, hp: t === 1 ? 60 : 140 }, reqLv: t === 1 ? 20 : 35, sell: t === 1 ? 220 : 650 },
    { id: `legs_${k}`, name: `${n} 다리 갑옷`, desc: '무릎을 지킨다.', kind: 'equip' as const, slot: 'legs' as const, stats: { def: t === 1 ? 8 : 16, hp: t === 1 ? 40 : 90 }, reqLv: t === 1 ? 19 : 34, sell: t === 1 ? 180 : 520 },
    { id: `boots_${k}`, name: `${n} 장화`, desc: '발걸음이 묵직하다.', kind: 'equip' as const, slot: 'shoes' as const, stats: { def: t === 1 ? 6 : 12, agi: t === 1 ? 3 : 6 }, reqLv: t === 1 ? 18 : 33, sell: t === 1 ? 160 : 480 },
  ]),
  { id: 'arena_ticket', name: '콜로세움 입장권', desc: '이슬 풀밭 위쪽 문으로 콜로세움에 들어간다. 들어갈 때 사라진다.', kind: 'key', sell: 0 },
  { id: 'forge_oil', name: '용광로 기름', desc: '용광로 칸에 부으면 그 칸의 광석이 더 빨리 녹는다.', kind: 'material', sell: 5 },
  { id: 'sword_red', name: '붉은쇠 검', desc: '주괴를 두드려 만든 첫 쇠 검.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 13, str: 2 }, reqLv: 8, sell: 60 },
  { id: 'pick_red', name: '붉은쇠 곡괭이', desc: '채광 효율 +5', kind: 'equip', slot: 'pickaxe', stats: { mining: 5 }, reqLv: 6, sell: 45 },
  { id: 'axe_red', name: '붉은쇠 도끼', desc: '벌목 효율 +5', kind: 'equip', slot: 'axe', stats: { chopping: 5 }, reqLv: 6, sell: 45 },
  { id: 'sword_wood', name: '나무 검', desc: '초보자의 친구.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 3 }, sell: 2 },
  { id: 'sword_stone', name: '돌날 검', desc: '묵직한 한 방.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 9, str: 1 }, reqLv: 5, sell: 20 },
  { id: 'sword_leaf', name: '잎새 칼', desc: '바람처럼 가볍다.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 18, agi: 3 }, reqLv: 12, sell: 120 },
  { id: 'bow_wood', name: '나무 활', desc: '멀리서 쏜다.', kind: 'equip', slot: 'weapon', wtype: 'bow', stats: { dmg: 8, agi: 1 }, reqLv: 10, sell: 20 },
  { id: 'bow_leaf', name: '잎새 활', desc: '시위가 노래한다.', kind: 'equip', slot: 'weapon', wtype: 'bow', stats: { dmg: 17, agi: 4 }, reqLv: 14, sell: 120 },
  { id: 'wand_wood', name: '나무 지팡이', desc: '끝이 희미하게 빛난다.', kind: 'equip', slot: 'weapon', wtype: 'wand', stats: { dmg: 8, wis: 1 }, reqLv: 10, sell: 20 },
  { id: 'wand_leaf', name: '잎새 지팡이', desc: '숲의 기운이 깃들었다.', kind: 'equip', slot: 'weapon', wtype: 'wand', stats: { dmg: 17, wis: 4 }, reqLv: 14, sell: 120 },
  { id: 'hat_moss', name: '이끼 모자', desc: '머리가 시원해진다.', kind: 'equip', slot: 'hat', stats: { def: 2, hp: 10 }, sell: 8 },
  { id: 'moss_crown', name: '이끼 왕관', desc: '이끼왕이 쓰던 왕관. 아직 촉촉하다.', kind: 'equip', slot: 'hat', stats: { def: 7, hp: 45, luk: 3 }, reqLv: 10, sell: 200 },
  { id: 'armor_log', name: '통나무 갑옷', desc: '조금 뻣뻣하다.', kind: 'equip', slot: 'body', stats: { def: 4, hp: 25 }, reqLv: 4, sell: 25 },
  { id: 'pick_stone', name: '돌 곡괭이', desc: '채광 효율 +2', kind: 'equip', slot: 'pickaxe', stats: { mining: 2 }, sell: 12 },
  { id: 'axe_stone', name: '돌 도끼', desc: '벌목 효율 +2', kind: 'equip', slot: 'axe', stats: { chopping: 2 }, sell: 12 },
];
export const ITEMS: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));

const monsters: MonsterDef[] = [
  { id: 'mossking', name: '이끼왕', hp: 2600, atk: 26, acc: 24, defZero: 60, xp: 900, coins: [300, 400], speed: 14, motion: 'hop', radius: 20, scale: 2.6,
    boss: { slamEvery: 5, slamWindup: 1.1, slamRadius: 56, slamDmg: 40, card: 'mossking' },
    drops: [{ item: 'moss_crown', chance: 0.35, qty: [1, 1] }, { item: 'mushroom', chance: 1, qty: [5, 10] }, { item: 'chest_small', chance: 0.5, qty: [1, 1] }, { item: 'stamp_crit', chance: 0.25, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.3, qty: [1, 2] }, { item: 'trophy_moss', chance: 0.08, qty: [1, 1] }] },
  { id: 'mossblob', name: '이끼방울', hp: 12, atk: 3, acc: 3, defZero: 6, xp: 4, coins: [1, 3], speed: 16, motion: 'hop', radius: 8,
    drops: [{ item: 'moss', chance: 0.5, qty: [1, 1] }, { item: 'berry', chance: 0.15, qty: [1, 2] }, { item: 'stamp_hp', chance: 0.003, qty: [1, 1] }, { item: 'statue_luk', chance: 0.006, qty: [1, 1] }, { item: 'statue_feast', chance: 0.004, qty: [1, 1] }] },
  { id: 'pebbler', name: '돌콩이', hp: 46, atk: 8, acc: 10, defZero: 16, xp: 12, coins: [3, 7], speed: 22, motion: 'waddle', radius: 8,
    drops: [{ item: 'pebble', chance: 0.45, qty: [1, 2] }, { item: 'berry', chance: 0.12, qty: [1, 2] }, { item: 'pebble_charm', chance: 0.004, qty: [1, 1] }, { item: 'stamp_def', chance: 0.003, qty: [1, 1] }, { item: 'statue_str', chance: 0.006, qty: [1, 1] }, { item: 'statue_guard', chance: 0.004, qty: [1, 1] }] },
  { id: 'leafling', name: '잎새깨비', hp: 130, atk: 16, acc: 22, defZero: 34, xp: 30, coins: [8, 15], speed: 28, motion: 'float', radius: 8,
    drops: [{ item: 'leaf', chance: 0.4, qty: [1, 2] }, { item: 'mushroom', chance: 0.12, qty: [1, 1] }, { item: 'forest_key', chance: 0.004, qty: [1, 1] }, { item: 'stamp_acc', chance: 0.003, qty: [1, 1] }, { item: 'statue_agi', chance: 0.006, qty: [1, 1] }, { item: 'statue_wis', chance: 0.006, qty: [1, 1] }] },
  // 미니보스(정해진 시간에만 나타난다)·콜로세움 챔피언: 다른 몬스터 그림을 크게, 물들여 쓴다
  { id: 'stumpelder', name: '숲의 장로', hp: 4200, atk: 30, acc: 30, defZero: 60, xp: 1200, coins: [600, 900], speed: 10, motion: 'float', radius: 18, scale: 2.2, art: 'leafling', tint: 0x9fffa0,
    drops: [{ item: 'statue_wis', chance: 0.6, qty: [1, 3] }, { item: 'stamp_drop', chance: 0.15, qty: [1, 1] }, { item: 'arena_ticket', chance: 0.5, qty: [1, 2] }, { item: 'mushroom', chance: 1, qty: [5, 10] }] },
  { id: 'ruinwarden', name: '유적 수호자', hp: 16000, atk: 70, acc: 80, defZero: 120, xp: 5000, coins: [2500, 4000], speed: 8, motion: 'waddle', radius: 20, scale: 2.4, art: 'golemite', tint: 0xffd27a,
    drops: [{ item: 'statue_fortune', chance: 0.8, qty: [1, 3] }, { item: 'stamp_xp', chance: 0.2, qty: [1, 1] }, { item: 'chest_small', chance: 0.3, qty: [1, 1] }, { item: 'moonpie', chance: 1, qty: [3, 6] }] },
  { id: 'champion', name: '콜로세움 챔피언', hp: 9000, atk: 55, acc: 60, defZero: 95, xp: 2500, coins: [0, 0], speed: 18, motion: 'waddle', radius: 18, scale: 2.2, art: 'pebbler', tint: 0xffa0a0, drops: [] },
  // 1월드 후반(숲 오른쪽에서 이어지는 다섯 사냥터)
  { id: 'mudturtle', name: '진흙거북', hp: 300, atk: 26, acc: 34, defZero: 50, xp: 60, coins: [12, 22], speed: 12, motion: 'waddle', radius: 9,
    drops: [{ item: 'shell', chance: 0.4, qty: [1, 2] }, { item: 'stew', chance: 0.06, qty: [1, 1] }, { item: 'statue_guard', chance: 0.006, qty: [1, 1] }, { item: 'stamp_mining', chance: 0.002, qty: [1, 1] }] },
  { id: 'glowbat', name: '반딧박쥐', hp: 480, atk: 36, acc: 46, defZero: 66, xp: 92, coins: [16, 30], speed: 30, motion: 'float', radius: 8,
    drops: [{ item: 'glowdust', chance: 0.4, qty: [1, 2] }, { item: 'stew', chance: 0.06, qty: [1, 1] }, { item: 'statue_agi', chance: 0.006, qty: [1, 1] }, { item: 'stamp_drop', chance: 0.002, qty: [1, 1] }] },
  { id: 'gusthopper', name: '바람메뚜기', hp: 740, atk: 48, acc: 60, defZero: 84, xp: 135, coins: [22, 40], speed: 34, motion: 'hop', radius: 8,
    drops: [{ item: 'feather', chance: 0.4, qty: [1, 2] }, { item: 'moonpie', chance: 0.03, qty: [1, 1] }, { item: 'statue_wis', chance: 0.006, qty: [1, 1] }, { item: 'stamp_xp', chance: 0.002, qty: [1, 1] }] },
  { id: 'golemite', name: '돌골렘', hp: 1150, atk: 62, acc: 76, defZero: 108, xp: 195, coins: [30, 55], speed: 14, motion: 'waddle', radius: 10,
    drops: [{ item: 'runestone', chance: 0.4, qty: [1, 2] }, { item: 'moonpie', chance: 0.04, qty: [1, 1] }, { item: 'statue_str', chance: 0.006, qty: [1, 1] }, { item: 'stamp_chopping', chance: 0.002, qty: [1, 1] }] },
  { id: 'shroomkin', name: '버섯도깨비', hp: 1700, atk: 80, acc: 94, defZero: 132, xp: 280, coins: [40, 75], speed: 22, motion: 'hop', radius: 9,
    drops: [{ item: 'sporecap', chance: 0.4, qty: [1, 2] }, { item: 'moonpie', chance: 0.06, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.004, qty: [1, 1] }, { item: 'stamp_coins', chance: 0.002, qty: [1, 1] }] },
];
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(monsters.map((m) => [m.id, m]));

const nodes: NodeDef[] = [
  { id: 'oak', name: '참나무', skill: 'chopping', reqLv: 1, hp: 6, xp: 3, item: 'log' },
  { id: 'redrock', name: '붉은돌 광맥', skill: 'mining', reqLv: 1, hp: 8, xp: 4, item: 'ore' },
  { id: 'silvertree', name: '은빛나무', skill: 'chopping', reqLv: 5, hp: 22, xp: 11, item: 'silverlog' },
  { id: 'willow', name: '버드나무', skill: 'chopping', reqLv: 12, hp: 50, xp: 26, item: 'willowlog' },
  { id: 'moonbirch', name: '달빛자작', skill: 'chopping', reqLv: 22, hp: 110, xp: 60, item: 'moonlog' },
  { id: 'bluerock', name: '푸른돌 광맥', skill: 'mining', reqLv: 10, hp: 40, xp: 20, item: 'ore_blue' },
  { id: 'goldrock', name: '금빛돌 광맥', skill: 'mining', reqLv: 20, hp: 95, xp: 50, item: 'ore_gold' },
];
export const NODES: Record<string, NodeDef> = Object.fromEntries(nodes.map((n) => [n.id, n]));

const maps: MapDef[] = [
  // 마을: 왼쪽 아래 시설들, 오른쪽 높은 발판(로프로 오르내림, 아래 땅도 걸을 수 있다) 위에 촌장과 포탈
  { id: 'town', name: '모닥불 마을', width: 680, theme: 'town',
    platforms: [{ x: 380, y: -48, w: 300 }, { x: 120, y: -60, w: 150 }],
    ropes: [{ x: 386, top: -48, bottom: 0 }, { x: 250, top: -60, bottom: 0 }],
    spawns: [], nodes: [], campfireX: 330,
    facilities: [{ kind: 'storage', x: 40, y: 0 }, { kind: 'npc', npc: 'smith', x: 96, y: 0 }, { kind: 'anvil', x: 152, y: 0 }, { kind: 'forge', x: 208, y: 0 }, { kind: 'stamps', x: 300, y: 0 }, { kind: 'tasks', x: 560, y: -48 }, { kind: 'statues', x: 136, y: -60 }, { kind: 'pets', x: 420, y: -48 }, { kind: 'shop', x: 190, y: -60 }, { kind: 'npc', npc: 'elder', x: 480, y: -48 }],
    portals: [{ x: 652, y: -48, to: 'meadow', toX: 50 }] },
  { id: 'meadow', name: '이슬 풀밭', width: 820, theme: 'meadow',
    platforms: [{ x: 150, y: -48, w: 170 }, { x: 420, y: -48, w: 210 }, { x: 490, y: -96, w: 130 }],
    spawns: [{ monster: 'mossblob', count: 8 }],
    nodes: [{ node: 'oak', x: 95 }, { node: 'oak', x: 705 }],
    ropes: [{ x: 205, top: -48, bottom: 0 }, { x: 445, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }],
    facilities: [],
    portals: [{ x: 24, to: 'town', toX: 620, toY: -48 }, { x: 796, to: 'hills', toX: 50, reqKills: 15 }, { x: 590, y: -96, to: 'arena', toX: 60, key: 'arena_ticket', label: '콜로세움' }] },
  { id: 'hills', name: '자갈 언덕', width: 920, theme: 'hills',
    platforms: [{ x: 110, y: -48, w: 180 }, { x: 370, y: -48, w: 140 }, { x: 570, y: -48, w: 230 }, { x: 630, y: -96, w: 140 }],
    spawns: [{ monster: 'pebbler', count: 7 }, { monster: 'mossblob', count: 2 }],
    nodes: [{ node: 'redrock', x: 330 }, { node: 'redrock', x: 535 }],
    ropes: [{ x: 165, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 600, top: -48, bottom: 0 }, { x: 740, top: -96, bottom: -48 }],
    facilities: [{ kind: 'owl', x: 230, y: -48 }],
    portals: [{ x: 24, to: 'meadow', toX: 765 }, { x: 896, to: 'forest', toX: 50, reqKills: 40 }, { x: 700, y: -96, to: 'mine1', toX: 50, reqSkill: { skill: 'mining', lv: 5 }, label: '얕은 광산' }] },
  // 숲: 오른쪽 끝 언덕 위에 보스방 문(열쇠 필요)
  { id: 'forest', name: '속삭임 숲', width: 980, theme: 'forest',
    platforms: [{ x: 90, y: -48, w: 220 }, { x: 180, y: -96, w: 110 }, { x: 430, y: -48, w: 160 }, { x: 660, y: -48, w: 150 }, { x: 860, y: -48, w: 120 }],
    spawns: [{ monster: 'leafling', count: 8 }],
    nodes: [{ node: 'silvertree', x: 380 }, { node: 'oak', x: 620 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 510, top: -48, bottom: 0 }, { x: 760, top: -48, bottom: 0 }, { x: 866, top: -48, bottom: 0 }],
    facilities: [],
    portals: [{ x: 24, to: 'hills', toX: 865 }, { x: 950, y: -48, to: 'lair', toX: 60, reqKills: 60, key: 'forest_key', label: '이끼왕의 둥지' }, { x: 888, y: -48, to: 'swamp', toX: 50, reqKills: 120, label: '안개 늪' }] },
  { id: 'lair', name: '이끼왕의 둥지', width: 560, theme: 'forest', boss: 'mossking',
    platforms: [], spawns: [], nodes: [], ropes: [], facilities: [],
    portals: [{ x: 24, to: 'forest', toX: 940, toY: -48 }] },
  { id: 'swamp', name: '안개 늪', width: 940, theme: 'swamp',
    platforms: [{ x: 140, y: -48, w: 200 }, { x: 420, y: -48, w: 180 }, { x: 470, y: -96, w: 120 }, { x: 690, y: -48, w: 190 }],
    spawns: [{ monster: 'mudturtle', count: 8 }], nodes: [{ node: 'willow', x: 90 }, { node: 'willow', x: 640 }],
    ropes: [{ x: 170, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 570, top: -96, bottom: -48 }, { x: 860, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'forest', toX: 880, toY: -48 }, { x: 916, to: 'cave', toX: 50, reqKills: 150 }] },
  { id: 'cave', name: '그늘 동굴', width: 900, theme: 'cave',
    platforms: [{ x: 110, y: -48, w: 160 }, { x: 330, y: -48, w: 240 }, { x: 380, y: -96, w: 140 }, { x: 650, y: -48, w: 180 }],
    spawns: [{ monster: 'glowbat', count: 8 }], nodes: [{ node: 'bluerock', x: 300 }, { node: 'willow', x: 620 }],
    ropes: [{ x: 140, top: -48, bottom: 0 }, { x: 350, top: -48, bottom: 0 }, { x: 460, top: -96, bottom: -48 }, { x: 800, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'swamp', toX: 890 }, { x: 876, to: 'ridge', toX: 50, reqKills: 180 }] },
  { id: 'ridge', name: '바람 능선', width: 960, theme: 'ridge',
    platforms: [{ x: 120, y: -48, w: 180 }, { x: 160, y: -96, w: 120 }, { x: 420, y: -48, w: 200 }, { x: 700, y: -48, w: 200 }, { x: 740, y: -96, w: 130 }],
    spawns: [{ monster: 'gusthopper', count: 9 }], nodes: [{ node: 'moonbirch', x: 640 }],
    ropes: [{ x: 140, top: -48, bottom: 0 }, { x: 220, top: -96, bottom: -48 }, { x: 600, top: -48, bottom: 0 }, { x: 720, top: -48, bottom: 0 }, { x: 810, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'cave', toX: 850 }, { x: 936, to: 'ruins', toX: 50, reqKills: 220 }] },
  { id: 'ruins', name: '잊힌 유적', width: 960, theme: 'ruins',
    platforms: [{ x: 100, y: -48, w: 240 }, { x: 150, y: -96, w: 140 }, { x: 460, y: -48, w: 160 }, { x: 690, y: -48, w: 220 }, { x: 720, y: -96, w: 150 }],
    spawns: [{ monster: 'golemite', count: 8 }], nodes: [{ node: 'bluerock', x: 420 }, { node: 'goldrock', x: 650 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 230, top: -96, bottom: -48 }, { x: 480, top: -48, bottom: 0 }, { x: 710, top: -48, bottom: 0 }, { x: 800, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'ridge', toX: 910 }, { x: 936, to: 'grove', toX: 50, reqKills: 260 }] },
  { id: 'grove', name: '달빛 숲', width: 980, theme: 'grove',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 400, y: -48, w: 220 }, { x: 450, y: -96, w: 130 }, { x: 720, y: -48, w: 200 }],
    spawns: [{ monster: 'shroomkin', count: 9 }], nodes: [{ node: 'moonbirch', x: 90 }, { node: 'moonbirch', x: 660 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 420, top: -48, bottom: 0 }, { x: 520, top: -96, bottom: -48 }, { x: 900, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'ruins', toX: 910 }] },
  { id: 'arena', name: '이슬 콜로세움', width: 640, theme: 'arena', arena: true,
    platforms: [{ x: 120, y: -48, w: 150 }, { x: 370, y: -48, w: 150 }],
    spawns: [], nodes: [], ropes: [{ x: 150, top: -48, bottom: 0 }, { x: 490, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'meadow', toX: 560, toY: -96 }] },
  // 광산(언덕에서 갈라짐): 몬스터 없이 광맥만, 채광 레벨로 열린다
  { id: 'mine1', name: '얕은 광산', width: 700, theme: 'mine',
    platforms: [{ x: 160, y: -48, w: 200 }, { x: 440, y: -48, w: 200 }],
    spawns: [], nodes: [{ node: 'redrock', x: 120 }, { node: 'redrock', x: 260 }, { node: 'bluerock', x: 420 }, { node: 'bluerock', x: 600 }],
    ropes: [{ x: 180, top: -48, bottom: 0 }, { x: 620, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'hills', toX: 700, toY: -96 }, { x: 676, to: 'mine2', toX: 50, reqSkill: { skill: 'mining', lv: 15 } }] },
  { id: 'mine2', name: '깊은 광산', width: 700, theme: 'mine',
    platforms: [{ x: 180, y: -48, w: 180 }, { x: 430, y: -48, w: 200 }],
    spawns: [], nodes: [{ node: 'bluerock', x: 130 }, { node: 'goldrock', x: 300 }, { node: 'goldrock', x: 520 }, { node: 'bluerock', x: 640 }],
    ropes: [{ x: 200, top: -48, bottom: 0 }, { x: 610, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'mine1', toX: 650 }] },
];
export const MAPS: Record<string, MapDef> = Object.fromEntries(maps.map((m) => [m.id, m]));

export const RECIPES: RecipeDef[] = [
  { item: 'hat_moss', coins: 20, mats: [['moss', 8], ['twine', 4]] },
  { item: 'axe_stone', coins: 30, mats: [['pebble', 6], ['log', 3], ['nail', 2]] },
  { item: 'pick_stone', coins: 30, mats: [['pebble', 6], ['log', 3], ['nail', 2]] },
  { item: 'sword_stone', coins: 40, mats: [['pebble', 10], ['log', 5], ['nail', 3]] },
  { item: 'armor_log', coins: 60, mats: [['log', 12], ['moss', 5], ['plank', 3]] },
  { item: 'bag_leather', coins: 120, mats: [['moss', 25], ['twine', 15], ['leaf', 5]] },
  { item: 'pouch_mat', coins: 80, mats: [['twine', 20], ['moss', 15]] },
  { item: 'pouch_res', coins: 80, mats: [['twine', 20], ['log', 15]] },
  { item: 'moss_ring', coins: 150, mats: [['moss', 30], ['twine', 10], ['pebble', 5]] },
  { item: 'pants_moss', coins: 25, mats: [['moss', 10], ['twine', 5]] },
  { item: 'shoes_leaf', coins: 60, mats: [['leaf', 8], ['twine', 6], ['log', 2]] },
  { item: 'pants_red', coins: 180, mats: [['bar_red', 8], ['twine', 10], ['moss', 10]] },
  { item: 'boots_red', coins: 160, mats: [['bar_red', 6], ['leaf', 6], ['nail', 6]] },
  { item: 'pick_red', coins: 120, mats: [['bar_red', 6], ['log', 6], ['nail', 4]] },
  { item: 'axe_red', coins: 120, mats: [['bar_red', 6], ['log', 6], ['nail', 4]] },
  { item: 'sword_red', coins: 150, mats: [['bar_red', 8], ['plank', 3], ['nail', 5]] },
  { item: 'anvil_exp', coins: 500, mats: [['plank', 15], ['nail', 25], ['ore', 20]], unlock: 2, smithLv: 5 },
  { item: 'anvil_exp2', coins: 3000, mats: [['bar_blue', 20], ['runestone', 15], ['plank', 30]], unlock: 3, smithLv: 15, tier: 2 },
  ...([['blue', 2, 'bar_blue', 'willowlog', 'shell', 'glowdust'], ['gold', 3, 'bar_gold', 'moonlog', 'runestone', 'sporecap']] as const).flatMap(([k, tier, bar, log, m1, m2]) => {
    const c = tier === 2 ? 1 : 3;
    return [
      { item: `sword_${k}`, coins: 600 * c, mats: [[bar, 12], [m1, 10], ['plank', 6]] as [string, number][], tier },
      { item: `bow_${k}`, coins: 600 * c, mats: [[bar, 8], [log, 15], [m2, 10]] as [string, number][], tier },
      { item: `wand_${k}`, coins: 600 * c, mats: [[bar, 8], [log, 12], [m2, 12]] as [string, number][], tier },
      { item: `pick_${k}`, coins: 450 * c, mats: [[bar, 10], [log, 10], ['nail', 15]] as [string, number][], tier },
      { item: `axe_${k}`, coins: 450 * c, mats: [[bar, 10], [log, 10], ['nail', 15]] as [string, number][], tier },
      { item: `helm_${k}`, coins: 500 * c, mats: [[bar, 10], [m1, 12]] as [string, number][], tier },
      { item: `plate_${k}`, coins: 700 * c, mats: [[bar, 16], [m1, 15], ['twine', 20]] as [string, number][], tier },
      { item: `legs_${k}`, coins: 550 * c, mats: [[bar, 12], [m2, 10]] as [string, number][], tier },
      { item: `boots_${k}`, coins: 500 * c, mats: [[bar, 8], [m2, 8], ['twine', 10]] as [string, number][], tier },
    ];
  }),
  { item: 'sword_leaf', coins: 250, mats: [['leaf', 15], ['ore', 10], ['plank', 4]], tier: 2 },
  { item: 'bow_leaf', coins: 250, mats: [['leaf', 15], ['silverlog', 8], ['twine', 10]], tier: 2 },
  { item: 'wand_leaf', coins: 250, mats: [['leaf', 15], ['silverlog', 8], ['nail', 6]], tier: 2 },
];

export interface TalentDef {
  id: string; name: string; max: number; active?: { cooldown: number; mana: number };
  /** 지정하면 해당 직업 전용 */
  cls?: ClassId;
  /** 레벨에 따른 설명 */
  desc: (lv: number) => string;
}
export const TALENTS: TalentDef[] = [
  { id: 'smash', name: '강타', max: 10, active: { cooldown: 6, mana: 4 }, desc: (lv) => `주변의 모든 적에게 ${180 + lv * 20}% 피해` },
  { id: 'heal', name: '응급 처치', max: 10, active: { cooldown: 20, mana: 6 }, desc: (lv) => `체력을 ${25 + lv * 5}% 회복` },
  { id: 'sharp', name: '예리함', max: 10, desc: (lv) => `공격력 +${lv * 3}%` },
  { id: 'tough', name: '단련', max: 10, desc: (lv) => `최대 체력 +${lv * 4}%` },
  { id: 'idler', name: '방치 요령', max: 10, desc: (lv) => `방치 효율(전투·채집) +${lv * 2}%p` },
  { id: 'worker', name: '일꾼의 손', max: 10, desc: (lv) => `채집 효율 +${lv * 5}%` },
  { id: 'cleave', name: '분쇄 일격', max: 10, cls: 'warrior', active: { cooldown: 8, mana: 8 }, desc: (lv) => `넓은 범위의 적에게 ${300 + lv * 30}% 피해` },
  { id: 'ironskin', name: '강철 피부', max: 10, cls: 'warrior', desc: (lv) => `방어력 +${(lv * 1.5).toFixed(1)}` },
  { id: 'volley', name: '연속 사격', max: 10, cls: 'archer', active: { cooldown: 8, mana: 6 }, desc: (lv) => `가까운 적 최대 4마리에게 ${150 + lv * 15}% 피해` },
  { id: 'swift', name: '날랜 손', max: 10, cls: 'archer', desc: (lv) => `공격 속도 +${lv * 2}%` },
  { id: 'nova', name: '별빛 폭발', max: 10, cls: 'mage', active: { cooldown: 10, mana: 10 }, desc: (lv) => `대상 주변의 모든 적에게 ${220 + lv * 25}% 피해` },
  { id: 'bulwark', name: '성벽', max: 10, cls: 'guardian', desc: (lv) => `최대 체력 +${lv * 3}%` },
  { id: 'vigil', name: '불침번', max: 10, cls: 'guardian', desc: (lv) => `방어력 +${lv}` },
  { id: 'frenzy', name: '광분', max: 10, cls: 'berserker', desc: (lv) => `공격력 +${lv * 3}%` },
  { id: 'bloodlust', name: '피의 열기', max: 10, cls: 'berserker', desc: (lv) => `치명타 확률 +${lv}%p` },
  { id: 'deadeye', name: '매의 눈', max: 10, cls: 'sharpshooter', desc: (lv) => `치명타 피해 +${lv * 4}%` },
  { id: 'steady', name: '고요한 숨', max: 10, cls: 'sharpshooter', desc: (lv) => `명중 +${lv * 2}` },
  { id: 'forager', name: '숲의 선물', max: 10, cls: 'ranger', desc: (lv) => `드롭률 +${lv * 2}%` },
  { id: 'trailblazer', name: '길잡이', max: 10, cls: 'ranger', desc: (lv) => `채집 효율 +${lv * 4}%` },
  { id: 'attune', name: '원소 조율', max: 10, cls: 'elementalist', desc: (lv) => `공격력 +${lv * 3}%` },
  { id: 'overflow', name: '넘치는 마력', max: 10, cls: 'elementalist', desc: (lv) => `최대 마나 +${lv * 5}%, 마나 회복 +${lv * 5}%` },
  { id: 'patience', name: '기다림의 주문', max: 10, cls: 'hexer', desc: (lv) => `방치 효율 +${lv * 0.5}%p` },
  { id: 'omen', name: '길조', max: 10, cls: 'hexer', desc: (lv) => `경험치 +${lv * 2}%` },
  { id: 'insight', name: '통찰', max: 10, cls: 'mage', desc: (lv) => `경험치 획득 +${lv * 3}%` },
];
export const TALENT: Record<string, TalentDef> = Object.fromEntries(TALENTS.map((t) => [t.id, t]));
/** 공격 바: 칸 수와 장 수(원작처럼 6칸, 넘겨 쓰는 두 번째 장) */
export const ATTACK_SLOTS = 6;
/** 지도 순간이동: 하루에 무료로 쌓이는 횟수와 최대 보유량. 마을은 언제나 무료 */
export const TELEPORTS_PER_DAY = 5;
export const TELEPORTS_MAX = 50;
/** 1월드 맵 순서(앞 맵의 처치 조건을 채우면 다음 맵이 열린다) */
export const WORLD1 = ['town', 'meadow', 'hills', 'mine1', 'mine2', 'forest', 'swamp', 'cave', 'ridge', 'ruins', 'grove'];
export const ATTACK_BARS = 2;
export const smashMult = (lv: number) => 1.8 + lv * 0.2;
export const healPct = (lv: number) => 0.25 + lv * 0.05;
export const SMASH_RANGE = 46;
export const CLEAVE_RANGE = 60;
export const NOVA_RADIUS = 52;

/** main: 공격력 능력치, acc: 명중 능력치 */
export interface ClassDef {
  id: ClassId; name: string; desc: string; main: StatKey; acc: StatKey; range: number; weapon: WeaponType; starter?: string;
  /** 2차 직업이면 바탕이 되는 1차 직업 */
  base?: ClassId;
  /** 직업 고유 보정(2차 직업) */
  perk?: Partial<Record<'hpPct' | 'dmg' | 'crit' | 'def' | 'xp' | 'afk' | 'drop' | 'speed', number>>;
}
export const CLASSES: Record<ClassId, ClassDef> = {
  beginner: { id: 'beginner', name: '초보자', desc: '', main: 'luk', acc: 'luk', range: 26, weapon: 'sword' },
  warrior: { id: 'warrior', name: '전사', desc: '근접 전투. 힘이 공격력, 지혜가 명중이 된다. 튼튼하다.', main: 'str', acc: 'wis', range: 28, weapon: 'sword' },
  archer: { id: 'archer', name: '궁수', desc: '활로 멀리서 공격. 민첩이 공격력, 힘이 명중이 된다.', main: 'agi', acc: 'str', range: 115, weapon: 'bow', starter: 'bow_wood' },
  mage: { id: 'mage', name: '마법사', desc: '지팡이로 마법 공격. 지혜가 공격력, 민첩이 명중이 된다.', main: 'wis', acc: 'agi', range: 95, weapon: 'wand', starter: 'wand_wood' },
  guardian: { id: 'guardian', base: 'warrior', name: '수호기사', desc: '방패처럼 버틴다. 최대 체력 +20%, 방어력 +4.', main: 'str', acc: 'wis', range: 28, weapon: 'sword', perk: { hpPct: 20, def: 4 } },
  berserker: { id: 'berserker', base: 'warrior', name: '광전사', desc: '거칠게 몰아친다. 공격력 +12%, 치명타 +5%p.', main: 'str', acc: 'wis', range: 28, weapon: 'sword', perk: { dmg: 12, crit: 5 } },
  sharpshooter: { id: 'sharpshooter', base: 'archer', name: '명사수', desc: '한 발 한 발이 정확하다. 치명타 +8%p, 공격력 +6%.', main: 'agi', acc: 'str', range: 125, weapon: 'bow', perk: { crit: 8, dmg: 6 } },
  ranger: { id: 'ranger', base: 'archer', name: '사냥꾼', desc: '숲을 잘 안다. 드롭률 +12%, 이동 속도 +8.', main: 'agi', acc: 'str', range: 115, weapon: 'bow', perk: { drop: 12, speed: 8 } },
  elementalist: { id: 'elementalist', base: 'mage', name: '원소술사', desc: '원소를 다룬다. 공격력 +14%.', main: 'wis', acc: 'agi', range: 100, weapon: 'wand', perk: { dmg: 14 } },
  hexer: { id: 'hexer', base: 'mage', name: '주술사', desc: '느긋하게 쌓는다. 경험치 +10%, 방치 효율 +3%p.', main: 'wis', acc: 'agi', range: 95, weapon: 'wand', perk: { xp: 10, afk: 3 } },
};
export const CLASS_LEVEL = 10;
/** 2차 전직 레벨 */
export const SUBCLASS_LEVEL = 30;
/** 1차 직업(2차 직업이면 그 바탕) */
export const baseClass = (cls: ClassId): BaseClass => (CLASSES[cls]?.base ?? cls) as BaseClass;
/** 초보자부터 지금 직업까지의 계보 */
/** 2차 전직할 수 있는가 */
export const canSubclass = (c: { cls: ClassId; level: number }) => !CLASSES[c.cls]?.base && c.cls !== 'beginner' && c.level >= SUBCLASS_LEVEL;
export const classLine = (cls: ClassId): ClassId[] => (cls === 'beginner' ? ['beginner'] : CLASSES[cls]?.base ? ['beginner', CLASSES[cls].base!, cls] : ['beginner', cls]);

/** 카드: 계정 전체가 함께 모으는 수집 보너스(장착해야 효과). 1/3/10장에서 단계 상승.
 *  id 는 몬스터 id(몬스터 카드) 또는 자원 id(자원 카드: 채집할 때 드물게) */
export type CardBonus = 'hp' | 'dmg' | 'drop' | 'afk' | 'mining' | 'chopping' | 'afkSkill';
export interface CardDef { id: string; from: 'monster' | 'node'; bonus: CardBonus; per: number; label: string }
export const CARDS: CardDef[] = [
  { id: 'mossblob', from: 'monster', bonus: 'hp', per: 0.03, label: '최대 체력' },
  { id: 'pebbler', from: 'monster', bonus: 'dmg', per: 0.03, label: '공격력' },
  { id: 'leafling', from: 'monster', bonus: 'drop', per: 0.04, label: '드롭률' },
  { id: 'mossking', from: 'monster', bonus: 'afk', per: 0.03, label: '방치 효율' },
  { id: 'oak', from: 'node', bonus: 'chopping', per: 0.06, label: '벌목 효율' },
  { id: 'redrock', from: 'node', bonus: 'mining', per: 0.06, label: '채광 효율' },
  { id: 'silvertree', from: 'node', bonus: 'afkSkill', per: 0.03, label: '채집 방치 효율' },
  { id: 'mudturtle', from: 'monster', bonus: 'hp', per: 0.04, label: '최대 체력' },
  { id: 'glowbat', from: 'monster', bonus: 'drop', per: 0.04, label: '드롭률' },
  { id: 'gusthopper', from: 'monster', bonus: 'dmg', per: 0.04, label: '공격력' },
  { id: 'golemite', from: 'monster', bonus: 'hp', per: 0.05, label: '최대 체력' },
  { id: 'shroomkin', from: 'monster', bonus: 'afk', per: 0.03, label: '방치 효율' },
  { id: 'willow', from: 'node', bonus: 'chopping', per: 0.06, label: '벌목 효율' },
  { id: 'moonbirch', from: 'node', bonus: 'afkSkill', per: 0.03, label: '채집 방치 효율' },
  { id: 'bluerock', from: 'node', bonus: 'mining', per: 0.06, label: '채광 효율' },
  { id: 'goldrock', from: 'node', bonus: 'mining', per: 0.08, label: '채광 효율' },
];
export const CARD_BY_ID: Record<string, CardDef> = Object.fromEntries(CARDS.map((c) => [c.id, c]));
/** 자원 카드 확률(자원 하나 얻을 때마다) */
export const NODE_CARD_CHANCE = 1 / 600;
/** 카드 기본 확률. 아직 없는 카드는 UNOWNED 배로 잘 나온다. 보스는 처치마다 BOSS 확률 */
export const CARD_CHANCE = 1 / 1500;
export const CARD_UNOWNED_MULT = 5;
export const CARD_BOSS_CHANCE = 0.25;
export const cardTier = (n: number) => (n >= 10 ? 3 : n >= 3 ? 2 : n >= 1 ? 1 : 0);
export const cardNext = (n: number) => (n >= 10 ? null : n >= 3 ? 10 : n >= 1 ? 3 : 1);

export interface QuestDef {
  name: string; text: string;
  goal: { kill: string; n: number } | { item: string; n: number };
  reward: { coins?: number; xp?: number; item?: string };
}
const ELDER_QUESTS: QuestDef[] = [
  { name: '첫 걸음', text: '풀밭의 이끼방울이 너무 늘었어. 조금만 정리해 주겠나?', goal: { kill: 'mossblob', n: 5 }, reward: { coins: 30, xp: 20 } },
  { name: '장작 모으기', text: '모닥불이 꺼지려 해. 풀밭의 참나무를 베어 통나무를 가져다 주게.', goal: { item: 'log', n: 8 }, reward: { coins: 40, xp: 40 } },
  { name: '폭신한 모자', text: '이끼 덩이를 모아 오면 모자를 하나 만들어 주지.', goal: { item: 'moss', n: 8 }, reward: { item: 'hat_moss', xp: 40 } },
  { name: '언덕으로', text: '자갈 언덕의 돌콩이들이 길을 막고 있다네.', goal: { kill: 'pebbler', n: 20 }, reward: { coins: 120, xp: 150 } },
  { name: '붉은 광석', text: '붉은돌 광석이 필요해. 넉넉히 캐 오면 좋은 곡괭이를 주겠네.', goal: { item: 'ore', n: 15 }, reward: { item: 'pick_stone', xp: 200 } },
  { name: '숲의 속삭임', text: '숲에서 이상한 소리가 들려. 잎새깨비를 쫓아내 주게.', goal: { kill: 'leafling', n: 30 }, reward: { coins: 400, xp: 600, item: 'forest_key' } },
];

const SMITH_QUESTS: QuestDef[] = [
  { name: '첫 노끈', text: '모루를 처음 써 보는 겐가? 노끈부터 만들어 오게. 손에 익히는 게 먼저야.', goal: { item: 'twine', n: 20 }, reward: { coins: 60, xp: 40 } },
  { name: '못질 연습', text: '쇠못을 좀 넉넉히 만들어 오게. 쓸 데가 많거든.', goal: { item: 'nail', n: 15 }, reward: { item: 'pouch_res', xp: 120 } },
  { name: '판자 납품', text: '마을 다리를 고치려면 판자가 필요하다네.', goal: { item: 'plank', n: 10 }, reward: { item: 'bag_leather', xp: 300 } },
  { name: '언덕의 광석', text: '좋은 쇠를 뽑으려면 붉은돌 광석이 더 필요해.', goal: { item: 'ore', n: 25 }, reward: { coins: 500, xp: 500 } },
];

export interface NpcDef { id: string; name: string; look: { hair: number; hairColor: string; skin: string; outfit: string }; quests: QuestDef[] }
export const NPCS: Record<string, NpcDef> = {
  elder: { id: 'elder', name: '촌장 바루', look: { hair: 2, hairColor: '#e9e4f0', skin: '#efe6f6', outfit: '#8a6fd1' }, quests: ELDER_QUESTS },
  smith: { id: 'smith', name: '대장장이 도리', look: { hair: 1, hairColor: '#2f2a3a', skin: '#d9c3ad', outfit: '#d9574a' }, quests: SMITH_QUESTS },
};
/** 전직을 맡는 NPC */
export const CLASS_NPC = 'elder';
export const NPC_NAME = NPCS.elder.name;
export const NPC_LOOK = NPCS.elder.look;
/** 카드 장착 칸 수(캐릭터마다) */
export const CARD_SLOTS = 4;

export const HAIR_COLORS = ['#6b4a3a', '#2f2a3a', '#e8b24a', '#d9574a', '#5aa9e6', '#f2a0c8', '#8fde5d', '#e9e4f0'];
/** 기본 캐릭터(흰 마네킹)에 입히는 연한 피부색. 첫 칸이 기본 흰색 */
export const SKIN_COLORS = ['#f4f2ee', '#f6e6d6', '#f3dcc6', '#e9eef6', '#eef3e6', '#f6e4ec', '#efe6f6', '#d9c3ad'];
export const OUTFIT_COLORS = ['#e25d4e', '#4e8de2', '#5fb859', '#f6c945', '#8a6fd1', '#e9e4f0'];
export const HAIR_STYLES = 3;

/** 가방 기본 칸 수(가방 아이템으로 늘린다) */
export const INVENTORY_SIZE = 16;
/** 계정 창고 기본 칸 수 */
export const STORAGE_SIZE = 24;
/** 가방 한 칸 기본 최대치(주머니로 늘린다). 창고는 제한 없음 */
export const STACK_BASE = 25;
export const MAX_CHARACTERS = 6;
/** 음식 칸 수: 위 칸부터 먹는다 */
export const FOOD_SLOTS = 3;
export const AFK_MIN_SECONDS = 60;
export const AFK_MAX_SECONDS = 12 * 3600;
/** 방치 효율 기본값(전투·채집). 능력치·특성·카드로 오른다 */
export const AFK_BASE = 0.4;

/** 모루 생산 품목: 시간마다 저절로 만들어지고 대장 경험치를 준다 */
export interface ProductDef { item: string; lv: number; perHour: number; xp: number }
export const PRODUCTS: ProductDef[] = [
  { item: 'twine', lv: 1, perHour: 120, xp: 1 },
  { item: 'nail', lv: 3, perHour: 60, xp: 3 },
  { item: 'plank', lv: 6, perHour: 30, xp: 7 },
];
/** 모루 포인트 한 개당 효과 */
/** slotLv: 생산 칸이 열리는 대장 레벨 */
export const ANVIL = { capBase: 60, capPer: 30, spdPer: 0.12, xpPer: 0.15, slotLv: [1, 5, 10] };

/** 잡화점: 하루 수량 제한(현지 날짜 기준으로 다시 채워짐) */
export interface ShopEntry { item: string; price: number; daily: number }
export const SHOP: ShopEntry[] = [
  { item: 'berry', price: 8, daily: 60 },
  { item: 'mushroom', price: 35, daily: 25 },
  { item: 'bag_small', price: 400, daily: 1 },
  { item: 'pouch_food', price: 300, daily: 1 },
  { item: 'chest_small', price: 900, daily: 1 },
  { item: 'forge_oil', price: 60, daily: 10 },
  { item: 'stamp_dmg', price: 400, daily: 1 },
  { item: 'stamp_mining', price: 400, daily: 1 },
  { item: 'stamp_chopping', price: 400, daily: 1 },
  { item: 'stamp_coins', price: 1500, daily: 1 },
  { item: 'stamp_afk', price: 4000, daily: 1 },
  { item: 'sculpt_tools', price: 1000, daily: 1 },
  { item: 'arena_ticket', price: 250, daily: 2 },
];

// ───────── 석상(캐릭터마다): 조각을 바쳐 레벨을 올린다 ─────────
export type BonusKey = 'str' | 'agi' | 'wis' | 'luk' | 'def' | 'hp' | 'hpPct' | 'drop' | 'dmg' | 'xp' | 'afk' | 'coins' | 'mining' | 'chopping' | 'acc';
export interface StatueDef { id: string; name: string; item: string; eff: BonusKey; per: number; unit: '' | '%' | '%p'; label: string }
export const STATUES: StatueDef[] = [
  { id: 'str', name: '힘의 석상', item: 'statue_str', eff: 'str', per: 1, unit: '', label: '힘' },
  { id: 'agi', name: '날램의 석상', item: 'statue_agi', eff: 'agi', per: 1, unit: '', label: '민첩' },
  { id: 'wis', name: '슬기의 석상', item: 'statue_wis', eff: 'wis', per: 1, unit: '', label: '지혜' },
  { id: 'luk', name: '행운의 석상', item: 'statue_luk', eff: 'luk', per: 1, unit: '', label: '행운' },
  { id: 'guard', name: '수호의 석상', item: 'statue_guard', eff: 'def', per: 0.5, unit: '', label: '방어력' },
  { id: 'feast', name: '풍요의 석상', item: 'statue_feast', eff: 'hp', per: 5, unit: '', label: '최대 체력' },
  { id: 'fortune', name: '보물의 석상', item: 'statue_fortune', eff: 'drop', per: 1.5, unit: '%', label: '드롭률' },
];
/** 석상 다음 레벨까지 바칠 조각 수 */
export const statueNeed = (lv: number) => Math.ceil(2 * Math.pow(1.28, lv));

// ───────── 별자리 ─────────
/** 별 지도(맵 곳곳의 숨은 조건)를 채우면 별 포인트. 별 포인트로 별자리를 열고, 캐릭터마다 하나를 정렬한다 */
export interface SignDef { id: string; name: string; eff: BonusKey; v: number; cost: number; label: string }
export const SIGNS: SignDef[] = [
  { id: 'wanderer', name: '나그네자리', eff: 'luk', v: 4, cost: 1, label: '행운 +4' },
  { id: 'miner', name: '곡괭이자리', eff: 'mining', v: 10, cost: 1, label: '채광 효율 +10%' },
  { id: 'lumber', name: '도끼자리', eff: 'chopping', v: 10, cost: 1, label: '벌목 효율 +10%' },
  { id: 'hunter', name: '사냥꾼자리', eff: 'dmg', v: 5, cost: 2, label: '공격력 +5%' },
  { id: 'sage', name: '현자자리', eff: 'xp', v: 6, cost: 2, label: '경험치 +6%' },
  { id: 'magpie', name: '까치자리', eff: 'drop', v: 7, cost: 2, label: '드롭률 +7%' },
  { id: 'turtle', name: '거북자리', eff: 'def', v: 3, cost: 3, label: '방어력 +3' },
  { id: 'sleeper', name: '잠꾸러기자리', eff: 'afk', v: 3, cost: 3, label: '방치 효율 +3%p' },
];
/** 별자리를 쓸 수 있는 캐릭터 레벨 */
export const SIGN_LV = 10;

// ───────── 업적(계정) ─────────
export interface AchieveDef { id: string; name: string; desc: string; eff?: BonusKey; v?: number; merit?: number; label: string }
export const ACHIEVEMENTS: AchieveDef[] = [
  { id: 'lv10', name: '첫 고비', desc: '캐릭터 하나가 Lv.10', eff: 'dmg', v: 2, label: '공격력 +2%' },
  { id: 'lv25', name: '숙련자', desc: '캐릭터 하나가 Lv.25', eff: 'xp', v: 3, label: '경험치 +3%' },
  { id: 'boss1', name: '왕관을 벗기다', desc: '이끼왕 처치', eff: 'drop', v: 3, label: '드롭률 +3%' },
  { id: 'boss10', name: '단골 손님', desc: '이끼왕 10번 처치', eff: 'dmg', v: 3, label: '공격력 +3%' },
  { id: 'party4', name: '든든한 가족', desc: '캐릭터 4명', eff: 'afk', v: 1, label: '방치 효율 +1%p' },
  { id: 'cards10', name: '수집의 시작', desc: '카드 합계 10장', eff: 'drop', v: 2, label: '드롭률 +2%' },
  { id: 'stamps5', name: '우표 애호가', desc: '우표 5종 수집', eff: 'coins', v: 3, label: '코인 +3%' },
  { id: 'forge', name: '불씨', desc: '용광로 들이기', eff: 'mining', v: 5, label: '채광 효율 +5%' },
  { id: 'rich', name: '두둑한 금고', desc: '코인 10,000 보유', eff: 'coins', v: 2, label: '코인 +2%' },
  { id: 'smith10', name: '망치질 십 년', desc: '대장 Lv.10', eff: 'xp', v: 2, label: '경험치 +2%' },
  { id: 'statue10', name: '조각가', desc: '석상 하나 Lv.10', eff: 'hpPct', v: 5, label: '최대 체력 +5%' },
  { id: 'tasks10', name: '부지런한 손', desc: '작업판 10단계', merit: 3, label: '공로 +3' },
  { id: 'stars5', name: '별 보는 밤', desc: '별 지도 5곳', eff: 'afk', v: 1, label: '방치 효율 +1%p' },
];

// ───────── 가족(직업별 최고 레벨 → 계정 보너스, 레벨 합 → 캐릭터 칸) ─────────
export const FAMILY: Record<BaseClass, { eff: BonusKey; a: number; b: number; label: string }> = {
  beginner: { eff: 'afk', a: 4, b: 40, label: '방치 효율' },
  warrior: { eff: 'hpPct', a: 15, b: 50, label: '최대 체력' },
  archer: { eff: 'dmg', a: 10, b: 50, label: '공격력' },
  mage: { eff: 'xp', a: 12, b: 50, label: '경험치' },
};
/** 레벨 합이 이만큼이면 캐릭터 칸이 하나씩 늘어난다(기본 2칸) */
export const FAMILY_SLOTS = [15, 40, 80, 140];

// ───────── 카드 세트 ─────────
/** 세트에 속한 카드의 별 합계로 세트 단계가 정해진다. 캐릭터마다 세트 하나를 켠다 */
export interface CardSetDef { id: string; name: string; cards: string[]; tiers: number[]; eff: BonusKey; v: number[]; label: string }
export const CARD_SETS: CardSetDef[] = [
  { id: 'w1', name: '첫 숲 세트', cards: ['mossblob', 'pebbler', 'leafling', 'mossking', 'oak', 'redrock', 'silvertree'], tiers: [3, 8, 14, 21], eff: 'afk', v: [1, 2, 3, 5], label: '방치 효율 +%p' },
  { id: 'w1b', name: '깊은 숲 세트', cards: ['mudturtle', 'glowbat', 'gusthopper', 'golemite', 'shroomkin', 'willow', 'moonbirch', 'bluerock', 'goldrock'], tiers: [4, 10, 18, 27], eff: 'drop', v: [3, 6, 10, 15], label: '드롭률 +%' },
];
export const CARD_PRESET_LV = 15;

// ───────── 동료(계정): 주 1회 무작위로 찾아온다. 모은 동료는 모두 효과, 다시 오면 레벨업 ─────────
export interface PetDef { id: string; name: string; eff: BonusKey; per: number; unit: '' | '%' | '%p'; color: string }
export const PETS: PetDef[] = [
  { id: 'pup', name: '솜뭉치 강아지', eff: 'hpPct', per: 2, unit: '%', color: '#f2e6d0' },
  { id: 'kit', name: '얼룩 고양이', eff: 'drop', per: 2, unit: '%', color: '#e8a03a' },
  { id: 'frog', name: '연잎 개구리', eff: 'xp', per: 2, unit: '%', color: '#5fb859' },
  { id: 'mole', name: '두더지 광부', eff: 'mining', per: 4, unit: '%', color: '#8a6a4a' },
  { id: 'squirrel', name: '도토리 다람쥐', eff: 'chopping', per: 4, unit: '%', color: '#c9805a' },
  { id: 'hedgehog', name: '고슴도치', eff: 'def', per: 1, unit: '', color: '#9a8a7a' },
  { id: 'firefly', name: '반딧불이', eff: 'coins', per: 2, unit: '%', color: '#f6e46a' },
  { id: 'sloth', name: '느림보 나무늘보', eff: 'afk', per: 0.5, unit: '%p', color: '#a89a80' },
];
export const PET_MAX_LV = 5;

// ───────── 부엉이 깃털(계정): 시간이 흐르면 깃털이 쌓이고, 깃털로 생산·보너스를 올린다 ─────────
export type OwlUp = 'rate' | 'dmg' | 'xp' | 'drop' | 'afk';
export const OWL = {
  basePerHour: 30,
  ups: {
    rate: { name: '깃털 고르기', per: 0.25, cost: 40, grow: 1.5, max: 20, desc: (v: number) => `깃털 생산 +${Math.round(v * 100)}%` },
    dmg: { name: '날카로운 발톱', per: 1, cost: 60, grow: 1.45, max: 30, desc: (v: number) => `공격력 +${v}%` },
    xp: { name: '밤의 지혜', per: 1, cost: 60, grow: 1.45, max: 30, desc: (v: number) => `경험치 +${v}%` },
    drop: { name: '반짝이는 눈', per: 1, cost: 80, grow: 1.45, max: 30, desc: (v: number) => `드롭률 +${v}%` },
    afk: { name: '부엉이 낮잠', per: 0.3, cost: 120, grow: 1.5, max: 20, desc: (v: number) => `방치 효율 +${(Math.round(v * 10) / 10)}%p` },
  } as Record<OwlUp, { name: string; per: number; cost: number; grow: number; max: number; desc: (v: number) => string }>,
};

// ───────── 콜로세움 ─────────
/** 5분 동안 웨이브가 차례로 나온다(앞 웨이브를 다 잡거나 시간이 지나면 다음). 보상은 깬 웨이브 수 */
export const ARENA = {
  seconds: 300, waveGap: 25,
  waves: [
    ['mossblob', 6], ['mossblob', 8], ['pebbler', 6], ['pebbler', 8], ['leafling', 6], ['leafling', 8], ['mudturtle', 6], ['mudturtle', 8],
    ['glowbat', 6], ['glowbat', 8], ['gusthopper', 6], ['gusthopper', 8], ['golemite', 6], ['shroomkin', 6], ['champion', 1],
  ] as [string, number][],
  /** 깬 웨이브 수에 따른 보상(도달한 단계까지 모두 받는다) */
  rewards: [
    { waves: 3, coins: 150, items: [['stew', 2]] },
    { waves: 6, coins: 400, items: [['forge_oil', 3], ['statue_luk', 2]] },
    { waves: 10, coins: 1200, items: [['moonpie', 3], ['statue_fortune', 2]] },
    { waves: 15, coins: 3000, items: [['stamp_crit', 1], ['chest_small', 1]] },
  ] as { waves: number; coins: number; items: [string, number][] }[],
};
/** 처치 수 → 깬 웨이브 수(웨이브 순서대로 센다) */
export function arenaWaves(kills: number): number {
  let n = 0, sum = 0;
  for (const [, cnt] of ARENA.waves) { sum += cnt; if (kills >= sum) n++; else break; }
  return n;
}

// ───────── 미니보스 ─────────
/** hourly: 매시 정각부터 window 분 동안, daily: 하루 한 번 */
export const MINIBOSSES: { id: string; map: string; x: number; when: 'hourly' | 'daily'; window: number }[] = [
  { id: 'stumpelder', map: 'forest', x: 560, when: 'hourly', window: 15 },
  { id: 'ruinwarden', map: 'ruins', x: 580, when: 'daily', window: 0 },
];
/** 특성 프리셋(특성 배분 + 공격 바 두 벌)을 쓰는 레벨 */
export const TALENT_PRESET_LV = 15;

/** 우표(계정 공용): 우표함에 넣어 모으고, 코인 + 재료로 끝없이 올린다.
 *  lin: 레벨마다 a 씩, sat: a·lv/(lv+b) 로 점점 덜 오른다(최대 a에 가까워짐) */
export type StampCat = 'combat' | 'skill' | 'misc';
export type StampEff = 'dmg' | 'hp' | 'def' | 'acc' | 'crit' | 'mining' | 'chopping' | 'drop' | 'coins' | 'xp' | 'afk';
export interface StampDef { id: string; eff: StampEff; cat: StampCat; kind: 'lin' | 'sat'; a: number; b?: number; unit: '%' | '%p' | ''; label: string; cost: number; mat: string; matBase: number }
export const STAMPS: StampDef[] = [
  { id: 'stamp_dmg', eff: 'dmg', cat: 'combat', kind: 'sat', a: 60, b: 40, unit: '%', label: '공격력', cost: 30, mat: 'pebble', matBase: 4 },
  { id: 'stamp_hp', eff: 'hp', cat: 'combat', kind: 'lin', a: 4, unit: '', label: '최대 체력', cost: 25, mat: 'moss', matBase: 4 },
  { id: 'stamp_def', eff: 'def', cat: 'combat', kind: 'lin', a: 0.6, unit: '', label: '방어력', cost: 40, mat: 'pebble', matBase: 5 },
  { id: 'stamp_acc', eff: 'acc', cat: 'combat', kind: 'lin', a: 0.8, unit: '', label: '명중', cost: 50, mat: 'leaf', matBase: 3 },
  { id: 'stamp_crit', eff: 'crit', cat: 'combat', kind: 'sat', a: 12, b: 30, unit: '%p', label: '치명타 확률', cost: 120, mat: 'leaf', matBase: 4 },
  { id: 'stamp_mining', eff: 'mining', cat: 'skill', kind: 'sat', a: 80, b: 35, unit: '%', label: '채광 효율', cost: 35, mat: 'ore', matBase: 4 },
  { id: 'stamp_chopping', eff: 'chopping', cat: 'skill', kind: 'sat', a: 80, b: 35, unit: '%', label: '벌목 효율', cost: 35, mat: 'log', matBase: 4 },
  { id: 'stamp_drop', eff: 'drop', cat: 'misc', kind: 'sat', a: 40, b: 50, unit: '%', label: '드롭률', cost: 150, mat: 'twine', matBase: 6 },
  { id: 'stamp_coins', eff: 'coins', cat: 'misc', kind: 'sat', a: 50, b: 40, unit: '%', label: '코인 획득', cost: 100, mat: 'nail', matBase: 4 },
  { id: 'stamp_xp', eff: 'xp', cat: 'misc', kind: 'sat', a: 40, b: 50, unit: '%', label: '경험치', cost: 150, mat: 'plank', matBase: 2 },
  { id: 'stamp_afk', eff: 'afk', cat: 'misc', kind: 'sat', a: 10, b: 60, unit: '%p', label: '방치 효율', cost: 300, mat: 'bar_red', matBase: 2 },
];
export const STAMP_NAMES: Record<StampCat, string> = { combat: '전투', skill: '기술', misc: '기타' };
/** 우표함을 쓸 수 있는 캐릭터 레벨 */
export const STAMP_LV = 12;
export const STAMP_GROW = { coins: 1.17, mats: 1.11 };

/** 후원 계약(원작의 뇌물에 해당): 코인으로 한 번 사는 고정 효과, 앞의 것을 사야 다음이 열린다 */
export type BribeEff = 'stampCost' | 'drop' | 'forgeSpeed' | 'coins' | 'afk' | 'xp';
export interface BribeDef { name: string; eff: BribeEff; v: number; price: number; desc: string }
export const BRIBES: BribeDef[] = [
  { name: '우표 장인 소개장', eff: 'stampCost', v: 0.1, price: 300, desc: '우표 올리는 코인 -10%' },
  { name: '잃어버린 물건 지도', eff: 'drop', v: 0.05, price: 1200, desc: '드롭률 +5%' },
  { name: '풀무 수리 계약', eff: 'forgeSpeed', v: 0.15, price: 2500, desc: '용광로 속도 +15%' },
  { name: '상인 조합 회원증', eff: 'coins', v: 0.05, price: 5000, desc: '코인 획득 +5%' },
  { name: '낮잠 보험', eff: 'afk', v: 0.02, price: 9000, desc: '방치 효율 +2%p' },
  { name: '도서관 출입증', eff: 'xp', v: 0.05, price: 15000, desc: '경험치 +5%' },
];

/** 용광로: 광석 need 개 → 주괴 1개, secs 초(업그레이드·기름 전) */
export interface SmeltDef { ore: string; bar: string; need: number; secs: number }
export const SMELTS: SmeltDef[] = [
  { ore: 'ore', bar: 'bar_red', need: 3, secs: 40 },
  { ore: 'ore_blue', bar: 'bar_blue', need: 4, secs: 90 },
  { ore: 'ore_gold', bar: 'bar_gold', need: 5, secs: 180 },
];
/** 용광로 값: 사는 값, 칸·용량 기본값, 업그레이드(코인, 단계마다 upGrow 배) */
export const FORGE = {
  price: 300, slotsBase: 2, capBase: 60, capPer: 30, speedPer: 0.1, bonusPer: 0.04, oilSpeed: 1.5, oilItem: 'forge_oil',
  upCost: { slots: 800, cap: 150, speed: 200, bonus: 250 }, upGrow: 1.6,
  upMax: { slots: 4, cap: 20, speed: 20, bonus: 10 },
};

const RESOURCE_IDS = ['log', 'silverlog', 'willowlog', 'moonlog', 'ore', 'ore_blue', 'ore_gold', 'bar_red', 'bar_blue', 'bar_gold'];
/** 아이템이 속한 묶음 */
export function stackGroup(id: string): StackGroup {
  const it = ITEMS[id];
  if (!it) return 'misc';
  if (it.kind === 'food') return 'food';
  if (it.kind === 'equip') return 'equip';
  if (it.kind === 'material') return RESOURCE_IDS.includes(id) ? 'resource' : 'material';
  return 'misc';
}
export const GROUP_NAMES: Record<StackGroup, string> = { material: '재료', resource: '통나무·광석', food: '음식', equip: '장비', misc: '기타' };
