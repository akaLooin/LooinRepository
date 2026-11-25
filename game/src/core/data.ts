// 게임 콘텐츠 정의. 이름/수치는 전부 임시(placeholder)이며 나중에 컨셉에 맞춰 교체한다.
// 이 폴더(core)는 DOM/Phaser에 의존하지 않는다 → 추후 서버에서 그대로 재사용.

export type StatKey = 'str' | 'agi' | 'wis' | 'luk';
export type SkillKey = 'mining' | 'chopping' | 'smithing' | 'fishing' | 'catching' | 'trapping' | 'worship' | 'cooking' | 'lab';
export type GatherSkill = 'mining' | 'chopping' | 'fishing' | 'catching';
/** 가방 한 칸에 쌓을 수 있는 양을 나누는 묶음 */
export type StackGroup = 'material' | 'resource' | 'food' | 'equip' | 'misc';
export type FacilityKind = 'npc' | 'anvil' | 'storage' | 'shop' | 'forge' | 'stamps' | 'tasks' | 'statues' | 'pets' | 'owl' | 'games' | 'totem' | 'alchemy' | 'post' | 'traps' | 'build' | 'shrine' | 'kitchen' | 'nest' | 'lab';
export type BaseClass = 'beginner' | 'warrior' | 'archer' | 'mage' | 'wanderer';
export type ClassId = BaseClass | 'guardian' | 'berserker' | 'sharpshooter' | 'ranger' | 'elementalist' | 'hexer' | 'fateweaver' | 'taler' | 'lifeteller'
  | 'bastion' | 'warlord' | 'hawkeye' | 'pathfinder' | 'archmage' | 'oracle';
export type WeaponType = 'sword' | 'bow' | 'wand';
export type EquipSlot = 'weapon' | 'hat' | 'body' | 'legs' | 'shoes' | 'ring' | 'trophy' | 'pickaxe' | 'axe' | 'rod' | 'net';

export interface ItemStats {
  dmg?: number; def?: number; hp?: number;
  str?: number; agi?: number; wis?: number; luk?: number;
  mining?: number; chopping?: number; fishing?: number; catching?: number;
}
export interface ItemDef {
  id: string; name: string; desc: string;
  kind: 'material' | 'equip' | 'food' | 'bag' | 'pouch' | 'chest' | 'key' | 'unlock' | 'stamp' | 'statue' | 'tool' | 'stone';
  /** 가방 확장: 사용하면 이 캐릭터의 가방 칸 +n (종류마다 한 번) */
  bagSlots?: number;
  /** 소지 한도 주머니: 이 묶음의 한 칸 최대치를 cap 으로 */
  pouch?: { group: StackGroup; cap: number };
  /** 창고 확장: 계정 창고 칸 +n (종류마다 한 번) */
  chestSlots?: number;
  /** 음식: 먹으면 회복하는 체력 */
  heal?: number;
  /** 음식: 먹은 뒤 다음 음식을 먹기까지 기다리는 시간(초) */
  cd?: number;
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
  /** 세계의 문: 계정·캐릭터 조건(gateChecks)을 채워야 지난다 */
  gate?: boolean;
  /** 기술 레벨로 여는 문(광산) */
  reqSkill?: { skill: GatherSkill; lv: number } }
export interface FacilityDef { kind: FacilityKind; x: number; y: number; /** NPC 시설이면 어느 NPC인지 */ npc?: string }
export interface MapDef {
  id: string; name: string; width: number;
  theme: 'town' | 'meadow' | 'hills' | 'forest' | 'swamp' | 'cave' | 'ridge' | 'ruins' | 'grove' | 'mine' | 'arena'
    | 'oasis' | 'dunes' | 'canyon' | 'mirage' | 'tomb' | 'saltlake' | 'starfield' | 'sunspire'
    | 'snowtown' | 'snowfield' | 'pinewood' | 'frostlake' | 'icecave' | 'glacier' | 'aurora' | 'frostpeak'
    | 'nebtown' | 'moondust' | 'crater' | 'nebula' | 'asteroid' | 'rings' | 'comet' | 'voidedge';
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
export const SKILL_NAMES: Record<SkillKey, string> = { mining: '채광', chopping: '벌목', smithing: '대장', fishing: '낚시', catching: '곤충 채집', trapping: '덫 사냥', worship: '기도', cooking: '요리', lab: '연구' };
export const FACILITY_NAMES: Record<FacilityKind, string> = { npc: '촌장', anvil: '모루', storage: '창고', shop: '잡화점', forge: '용광로', stamps: '우표함', tasks: '작업판', statues: '석상 받침', pets: '동료 둥지', owl: '부엉이 횃대', games: '미니게임장', totem: '수호 토템', alchemy: '연금 솥', post: '우체국', traps: '덫 오두막', build: '공방 마당', shrine: '기도 토템', kitchen: '별빛 식당', nest: '번식 둥지', lab: '연구실' };
export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '무기', hat: '모자', body: '갑옷', legs: '바지', shoes: '신발', ring: '장신구', trophy: '트로피', pickaxe: '곡괭이', axe: '도끼', rod: '낚싯대', net: '잠자리채',
};

const items: ItemDef[] = [
  { id: 'moss', name: '이끼 덩이', desc: '촉촉하고 폭신하다.', kind: 'material', sell: 1 },
  { id: 'pebble', name: '조약돌', desc: '손에 쏙 들어오는 돌.', kind: 'material', sell: 3 },
  { id: 'leaf', name: '마른 잎', desc: '바스락거리는 잎.', kind: 'material', sell: 8 },
  { id: 'berry', name: '산딸기', desc: '먹으면 체력 15 회복. 재사용 3초.', kind: 'food', heal: 15, cd: 3, sell: 1 },
  { id: 'mushroom', name: '숲 버섯', desc: '먹으면 체력 45 회복. 재사용 5초.', kind: 'food', heal: 45, cd: 5, sell: 4 },
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
  { id: 'stew', name: '늪 스튜', desc: '먹으면 체력 120 회복. 재사용 7초.', kind: 'food', heal: 120, cd: 7, sell: 10 },
  { id: 'moonpie', name: '달빛 파이', desc: '먹으면 체력 300 회복. 재사용 10초.', kind: 'food', heal: 300, cd: 10, sell: 25 },
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
  { id: 'tp_ticket', name: '순간이동 티켓', desc: '지도에서 마을이 아닌 맵으로 순간이동할 때 1장을 쓴다.', kind: 'key', sell: 1 },
  { id: 'stone_atk', name: '날카로움 강화석', desc: '무기에 붙이면 공격력 +3. 성공률 80%.', kind: 'stone', sell: 20 },
  { id: 'stone_guard', name: '단단함 강화석', desc: '모자·갑옷·바지·신발에 붙이면 방어력 +2, 체력 +15. 성공률 80%.', kind: 'stone', sell: 20 },
  { id: 'stone_stat', name: '네 갈래 강화석', desc: '무기·옷·장신구에 붙이면 힘·민첩·지혜·행운 +1. 성공률 60%.', kind: 'stone', sell: 30 },
  { id: 'stone_mine', name: '광맥 강화석', desc: '곡괭이에 붙이면 채광력 +3. 성공률 70%.', kind: 'stone', sell: 15 },
  { id: 'stone_lure', name: '미끼 강화석', desc: '낚싯대·잠자리채에 붙이면 낚시·곤충 채집력 +3. 성공률 70%.', kind: 'stone', sell: 20 },
  { id: 'stone_chop', name: '나뭇결 강화석', desc: '도끼에 붙이면 벌목력 +3. 성공률 70%.', kind: 'stone', sell: 15 },
  // ───── 2월드: 노을 사막 ─────
  { id: 'cactus_spine', name: '선인장 가시', desc: '끝이 바늘처럼 뾰족하다.', kind: 'material', sell: 44 },
  { id: 'scorp_tail', name: '전갈 꼬리', desc: '독은 빠졌지만 여전히 따끔하다.', kind: 'material', sell: 52 },
  { id: 'heat_feather', name: '열기 깃털', desc: '쥐면 손이 따뜻해진다.', kind: 'material', sell: 60 },
  { id: 'old_bandage', name: '낡은 붕대', desc: '모래 냄새가 밴 오래된 천.', kind: 'material', sell: 70 },
  { id: 'salt_crystal', name: '소금 결정', desc: '반듯한 육각 결정.', kind: 'material', sell: 80 },
  { id: 'worm_scale', name: '모래 비늘', desc: '모래처럼 까끌한 비늘.', kind: 'material', sell: 92 },
  { id: 'sun_ember', name: '태양 불씨', desc: '꺼지지 않는 작은 불꽃.', kind: 'material', sell: 106 },
  { id: 'palmlog', name: '야자나무 통나무', desc: '섬유질이 질긴 사막 목재.', kind: 'material', sell: 46 },
  { id: 'ore_amber', name: '호박 광석', desc: '안쪽이 꿀빛으로 빛나는 광석.', kind: 'material', sell: 40 },
  { id: 'bar_amber', name: '호박 주괴', desc: '용광로에서 호박 광석을 녹였다.', kind: 'material', sell: 160 },
  { id: 'cactus_juice', name: '선인장 주스', desc: '먹으면 체력 450 회복. 재사용 9초.', kind: 'food', heal: 450, cd: 9, sell: 30 },
  { id: 'date_cake', name: '대추야자 케이크', desc: '먹으면 체력 800 회복. 재사용 12초.', kind: 'food', heal: 800, cd: 12, sell: 55 },
  { id: 'sun_key', name: '태양 열쇠', desc: '해탑 꼭대기 거상의 방 문을 연다. 들어갈 때 사라진다.', kind: 'key', sell: 0 },
  { id: 'trophy_sand', name: '사막 거상 트로피', desc: '사막 거상을 쓰러뜨린 증표.', kind: 'equip', slot: 'trophy', stats: { str: 5, agi: 5, wis: 5, luk: 5, def: 6 }, sell: 0 },
  { id: 'sand_crown', name: '모래 왕관', desc: '거상이 쓰던 사암 왕관. 무겁지만 든든하다.', kind: 'equip', slot: 'hat', stats: { def: 22, hp: 160, str: 6, luk: 6 }, reqLv: 40, sell: 1500 },
  { id: 'anvil_exp3', name: '모루 확장 III', desc: '만들면 모루 4단계 레시피가 열린다(계정 공용).', kind: 'unlock', sell: 0 },
  { id: 'sword_amber', name: '호박 검', desc: '꿀빛 칼날에 햇빛이 갇혀 있다.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 100, str: 14 }, reqLv: 50, sell: 2400 },
  { id: 'bow_amber', name: '호박 활', desc: '쏠 때마다 따뜻한 바람이 인다.', kind: 'equip', slot: 'weapon', wtype: 'bow', stats: { dmg: 94, agi: 15 }, reqLv: 50, sell: 2400 },
  { id: 'wand_amber', name: '호박 지팡이', desc: '끝의 호박 속에 불씨가 잠들어 있다.', kind: 'equip', slot: 'weapon', wtype: 'wand', stats: { dmg: 94, wis: 15 }, reqLv: 50, sell: 2400 },
  { id: 'pick_amber', name: '호박 곡괭이', desc: '채광 효율 +28', kind: 'equip', slot: 'pickaxe', stats: { mining: 28 }, reqLv: 42, sell: 1400 },
  { id: 'axe_amber', name: '호박 도끼', desc: '벌목 효율 +28', kind: 'equip', slot: 'axe', stats: { chopping: 28 }, reqLv: 42, sell: 1400 },
  { id: 'helm_amber', name: '호박 투구', desc: '햇빛을 머금은 투구.', kind: 'equip', slot: 'hat', stats: { def: 26, hp: 160 }, reqLv: 48, sell: 1600 },
  { id: 'plate_amber', name: '호박 갑옷', desc: '모래바람에도 끄떡없다.', kind: 'equip', slot: 'body', stats: { def: 38, hp: 240 }, reqLv: 50, sell: 2000 },
  { id: 'legs_amber', name: '호박 다리 갑옷', desc: '뜨거운 모래 위에서도 시원하다.', kind: 'equip', slot: 'legs', stats: { def: 26, hp: 160 }, reqLv: 49, sell: 1700 },
  { id: 'boots_amber', name: '호박 장화', desc: '모래에 빠지지 않는다.', kind: 'equip', slot: 'shoes', stats: { def: 19, agi: 10 }, reqLv: 48, sell: 1600 },
  // ───── 2월드 기술: 낚시·곤충 채집 ─────
  { id: 'fish_minnow', name: '사막 송사리', desc: '오아시스 샘에 사는 작은 물고기.', kind: 'material', sell: 12 },
  { id: 'fish_salt', name: '소금 가자미', desc: '짭짤한 물에서도 잘 사는 납작한 물고기.', kind: 'material', sell: 30 },
  { id: 'fish_star', name: '별빛 메기', desc: '밤이면 수염 끝이 빛난다.', kind: 'material', sell: 70 },
  { id: 'bug_ant', name: '모래개미', desc: '제 몸보다 큰 모래알을 나른다.', kind: 'material', sell: 12 },
  { id: 'bug_firefly', name: '노을 반딧불', desc: '해 질 녘 색으로 깜빡인다.', kind: 'material', sell: 30 },
  { id: 'bug_beetle', name: '황금 풍뎅이', desc: '등딱지가 금화처럼 반짝인다.', kind: 'material', sell: 70 },
  { id: 'rod_reed', name: '갈대 낚싯대', desc: '낚시 효율 +3', kind: 'equip', slot: 'rod', stats: { fishing: 3 }, sell: 100 },
  { id: 'net_cloth', name: '천 잠자리채', desc: '곤충 채집 효율 +3', kind: 'equip', slot: 'net', stats: { catching: 3 }, sell: 100 },
  { id: 'rod_palm', name: '야자 낚싯대', desc: '낚시 효율 +10', kind: 'equip', slot: 'rod', stats: { fishing: 10 }, reqLv: 30, sell: 600 },
  { id: 'net_palm', name: '야자 잠자리채', desc: '곤충 채집 효율 +10', kind: 'equip', slot: 'net', stats: { catching: 10 }, reqLv: 30, sell: 600 },
  { id: 'rod_amber', name: '호박 낚싯대', desc: '낚시 효율 +22', kind: 'equip', slot: 'rod', stats: { fishing: 22 }, reqLv: 42, sell: 1400 },
  { id: 'net_amber', name: '호박 잠자리채', desc: '곤충 채집 효율 +22', kind: 'equip', slot: 'net', stats: { catching: 22 }, reqLv: 42, sell: 1400 },
  // ───── 3월드: 서리 고원 ─────
  { id: 'snow_tuft', name: '눈송이 솜', desc: '손바닥 위에서도 녹지 않는다.', kind: 'material', sell: 120 },
  { id: 'pine_cone', name: '솔방울 비늘', desc: '송진 냄새가 은은하다.', kind: 'material', sell: 136 },
  { id: 'peng_feather', name: '펭귄 깃털', desc: '물이 스며들지 않는 촘촘한 깃털.', kind: 'material', sell: 152 },
  { id: 'icicle_shard', name: '고드름 조각', desc: '끝이 바늘처럼 날카로운 얼음.', kind: 'material', sell: 170 },
  { id: 'yeti_fur', name: '설인 털', desc: '복슬복슬하고 아주 따뜻하다.', kind: 'material', sell: 190 },
  { id: 'aurora_dust', name: '오로라 가루', desc: '보는 각도마다 빛의 색이 바뀐다.', kind: 'material', sell: 212 },
  { id: 'frost_core', name: '서리 핵', desc: '쥐면 손끝이 얼얼해지는 푸른 핵.', kind: 'material', sell: 236 },
  { id: 'pinelog', name: '전나무 통나무', desc: '곧고 단단한 북쪽 목재.', kind: 'material', sell: 90 },
  { id: 'ore_frost', name: '서리 광석', desc: '안쪽에 얼음 결이 갇혀 있다.', kind: 'material', sell: 84 },
  { id: 'bar_frost', name: '서리 주괴', desc: '용광로에서 서리 광석을 녹였다. 그래도 차갑다.', kind: 'material', sell: 340 },
  { id: 'fish_ice', name: '얼음 송어', desc: '얼음 구멍 아래에서 반짝이는 물고기.', kind: 'material', sell: 110 },
  { id: 'bug_frost', name: '서리 나방', desc: '날갯가루가 눈처럼 흩날린다.', kind: 'material', sell: 110 },
  { id: 'hot_cocoa', name: '따끈한 코코아', desc: '먹으면 체력 1400 회복. 재사용 12초.', kind: 'food', heal: 1400, cd: 12, sell: 80 },
  { id: 'pine_soup', name: '솔잎 수프', desc: '먹으면 체력 2400 회복. 재사용 15초.', kind: 'food', heal: 2400, cd: 15, sell: 130 },
  { id: 'frost_key', name: '서리 열쇠', desc: '서리 봉우리 꼭대기, 눈보라 군주의 옥좌 문을 연다. 들어갈 때 사라진다.', kind: 'key', sell: 0 },
  { id: 'trophy_frost', name: '눈보라 군주 트로피', desc: '눈보라 군주를 쓰러뜨린 증표.', kind: 'equip', slot: 'trophy', stats: { str: 9, agi: 9, wis: 9, luk: 9, def: 12 }, sell: 0 },
  { id: 'frost_crown', name: '얼음 왕관', desc: '녹지 않는 얼음을 깎아 만든 왕관.', kind: 'equip', slot: 'hat', stats: { def: 48, hp: 420, str: 12, luk: 12 }, reqLv: 75, sell: 5000 },
  { id: 'anvil_exp4', name: '모루 확장 IV', desc: '만들면 모루 5단계 레시피가 열린다(계정 공용).', kind: 'unlock', sell: 0 },
  { id: 'sword_frost', name: '서리 검', desc: '휘두르면 칼날에서 눈가루가 흩날린다.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 170, str: 24 }, reqLv: 80, sell: 6000 },
  { id: 'bow_frost', name: '서리 활', desc: '얼음 시위가 맑게 운다.', kind: 'equip', slot: 'weapon', wtype: 'bow', stats: { dmg: 160, agi: 26 }, reqLv: 80, sell: 6000 },
  { id: 'wand_frost', name: '서리 지팡이', desc: '끝의 얼음 결정 속에 눈보라가 갇혀 있다.', kind: 'equip', slot: 'weapon', wtype: 'wand', stats: { dmg: 160, wis: 26 }, reqLv: 80, sell: 6000 },
  { id: 'pick_frost', name: '서리 곡괭이', desc: '채광 효율 +46', kind: 'equip', slot: 'pickaxe', stats: { mining: 46 }, reqLv: 70, sell: 3600 },
  { id: 'axe_frost', name: '서리 도끼', desc: '벌목 효율 +46', kind: 'equip', slot: 'axe', stats: { chopping: 46 }, reqLv: 70, sell: 3600 },
  { id: 'rod_frost', name: '서리 낚싯대', desc: '낚시 효율 +40', kind: 'equip', slot: 'rod', stats: { fishing: 40 }, reqLv: 70, sell: 3600 },
  { id: 'net_frost', name: '서리 잠자리채', desc: '곤충 채집 효율 +40', kind: 'equip', slot: 'net', stats: { catching: 40 }, reqLv: 70, sell: 3600 },
  { id: 'helm_frost', name: '서리 투구', desc: '얼음 결이 빛나는 투구.', kind: 'equip', slot: 'hat', stats: { def: 48, hp: 360 }, reqLv: 78, sell: 4200 },
  { id: 'plate_frost', name: '서리 갑옷', desc: '눈보라 속에서도 몸이 따뜻하다.', kind: 'equip', slot: 'body', stats: { def: 70, hp: 520 }, reqLv: 80, sell: 5200 },
  { id: 'legs_frost', name: '서리 다리 갑옷', desc: '빙판 위에서도 미끄러지지 않는다.', kind: 'equip', slot: 'legs', stats: { def: 48, hp: 360 }, reqLv: 79, sell: 4400 },
  { id: 'boots_frost', name: '서리 장화', desc: '눈에 빠지지 않는 넓은 바닥.', kind: 'equip', slot: 'shoes', stats: { def: 36, agi: 18 }, reqLv: 78, sell: 4200 },
  // ───── 4월드: 별빛 성운 ─────
  { id: 'star_sand', name: '별모래', desc: '한 줌 쥐면 손가락 사이로 반짝이며 흘러내린다.', kind: 'material', sell: 300 },
  { id: 'crater_shell', name: '운석 껍데기', desc: '구덩이 진드기가 벗어 둔 단단한 껍데기.', kind: 'material', sell: 340 },
  { id: 'neb_jelly', name: '성운 젤리', desc: '안쪽에서 작은 별들이 천천히 돈다.', kind: 'material', sell: 380 },
  { id: 'meteor_chip', name: '운석 조각', desc: '아직도 미지근하다.', kind: 'material', sell: 420 },
  { id: 'ring_plume', name: '고리 깃털', desc: '고리 행성의 빛을 머금은 깃털.', kind: 'material', sell: 470 },
  { id: 'comet_hair', name: '혜성 꼬리털', desc: '스치기만 해도 긴 빛줄기가 남는다.', kind: 'material', sell: 520 },
  { id: 'void_shard', name: '공허 조각', desc: '들여다보면 빛이 빨려 들어간다.', kind: 'material', sell: 580 },
  { id: 'starlog', name: '별빛나무 통나무', desc: '나이테 대신 별자리가 새겨져 있다.', kind: 'material', sell: 140 },
  { id: 'ore_nova', name: '신성 광석', desc: '별이 터질 때 생긴 무거운 광석.', kind: 'material', sell: 130 },
  { id: 'bar_nova', name: '신성 주괴', desc: '용광로에서 신성 광석을 녹였다. 은은한 보랏빛이 돈다.', kind: 'material', sell: 600 },
  { id: 'fish_neb', name: '성운 해마', desc: '꼬리를 말고 별빛 웅덩이를 떠다닌다.', kind: 'material', sell: 180 },
  { id: 'bug_neb', name: '별똥 반딧불', desc: '날 때마다 짧은 꼬리를 그린다.', kind: 'material', sell: 180 },
  { id: 'moon_cake', name: '달떡', desc: '먹으면 체력 4000 회복. 재사용 14초.', kind: 'food', heal: 4000, cd: 14, sell: 160 },
  { id: 'nova_stew', name: '신성 스튜', desc: '먹으면 체력 7000 회복. 재사용 18초.', kind: 'food', heal: 7000, cd: 18, sell: 260 },
  { id: 'void_key', name: '공허 열쇠', desc: '공허의 끝, 성운 거신이 도는 궤도로 가는 문을 연다. 들어갈 때 사라진다.', kind: 'key', sell: 0 },
  { id: 'trophy_void', name: '성운 거신 트로피', desc: '성운 거신을 쓰러뜨린 증표.', kind: 'equip', slot: 'trophy', stats: { str: 14, agi: 14, wis: 14, luk: 14, def: 20 }, sell: 0 },
  { id: 'void_mask', name: '공허 가면', desc: '눈구멍 너머로 별이 보인다.', kind: 'equip', slot: 'hat', stats: { def: 80, hp: 700, str: 18, luk: 18 }, reqLv: 110, sell: 12000 },
  { id: 'anvil_exp5', name: '모루 확장 V', desc: '만들면 모루 6단계 레시피가 열린다(계정 공용).', kind: 'unlock', sell: 0 },
  { id: 'sword_nova', name: '신성 검', desc: '칼날에 작은 별이 박혀 있다.', kind: 'equip', slot: 'weapon', wtype: 'sword', stats: { dmg: 260, str: 36 }, reqLv: 115, sell: 14000 },
  { id: 'bow_nova', name: '신성 활', desc: '쏠 때마다 시위에서 별빛이 튄다.', kind: 'equip', slot: 'weapon', wtype: 'bow', stats: { dmg: 245, agi: 38 }, reqLv: 115, sell: 14000 },
  { id: 'wand_nova', name: '신성 지팡이', desc: '끝의 구슬 안에서 별이 태어난다.', kind: 'equip', slot: 'weapon', wtype: 'wand', stats: { dmg: 245, wis: 38 }, reqLv: 115, sell: 14000 },
  { id: 'pick_nova', name: '신성 곡괭이', desc: '채광 효율 +72', kind: 'equip', slot: 'pickaxe', stats: { mining: 72 }, reqLv: 100, sell: 8000 },
  { id: 'axe_nova', name: '신성 도끼', desc: '벌목 효율 +72', kind: 'equip', slot: 'axe', stats: { chopping: 72 }, reqLv: 100, sell: 8000 },
  { id: 'rod_nova', name: '신성 낚싯대', desc: '낚시 효율 +62', kind: 'equip', slot: 'rod', stats: { fishing: 62 }, reqLv: 100, sell: 8000 },
  { id: 'net_nova', name: '신성 잠자리채', desc: '곤충 채집 효율 +62', kind: 'equip', slot: 'net', stats: { catching: 62 }, reqLv: 100, sell: 8000 },
  { id: 'helm_nova', name: '신성 투구', desc: '이마에 별 하나가 빛난다.', kind: 'equip', slot: 'hat', stats: { def: 72, hp: 560 }, reqLv: 110, sell: 9500 },
  { id: 'plate_nova', name: '신성 갑옷', desc: '우주의 추위도 막아 준다.', kind: 'equip', slot: 'body', stats: { def: 104, hp: 800 }, reqLv: 112, sell: 11500 },
  { id: 'legs_nova', name: '신성 다리 갑옷', desc: '무중력에서도 발이 땅에 붙는다.', kind: 'equip', slot: 'legs', stats: { def: 72, hp: 560 }, reqLv: 111, sell: 9800 },
  { id: 'boots_nova', name: '신성 장화', desc: '한 걸음마다 별모래가 흩날린다.', kind: 'equip', slot: 'shoes', stats: { def: 54, agi: 26 }, reqLv: 110, sell: 9500 },
  // 덫 사냥: 잡은 동물(재료)과 덫 도구
  { id: 'cr_hare', name: '눈토끼', desc: '덫에 걸린 하얀 토끼. 털이 아주 부드럽다.', kind: 'material', sell: 30 },
  { id: 'cr_fox', name: '서리여우', desc: '꼬리 끝이 얼음처럼 반짝인다.', kind: 'material', sell: 60 },
  { id: 'cr_weasel', name: '얼음족제비', desc: '빙판 위를 미끄러지듯 달린다.', kind: 'material', sell: 110 },
  { id: 'cr_marten', name: '오로라담비', desc: '털 색이 오로라처럼 바뀐다.', kind: 'material', sell: 180 },
  { id: 'cr_reindeer', name: '별빛순록', desc: '뿔 끝에 별빛이 맺혀 있다.', kind: 'material', sell: 280 },
  { id: 'trap_wood', name: '나무 덫 꾸러미', desc: '사용하면 이 캐릭터의 덫이 나무 덫이 된다(잡는 수 ×1.5).', kind: 'tool', sell: 0 },
  { id: 'trap_iron', name: '쇠 덫 꾸러미', desc: '사용하면 이 캐릭터의 덫이 쇠 덫이 된다(잡는 수 ×2.2).', kind: 'tool', sell: 0 },
  { id: 'trap_frost', name: '서리 덫 꾸러미', desc: '사용하면 이 캐릭터의 덫이 서리 덫이 된다(잡는 수 ×3.2).', kind: 'tool', sell: 0 },
  { id: 'fur_scarf', name: '털 목도리', desc: '눈토끼와 여우 털로 짠 목도리.', kind: 'equip', slot: 'ring', stats: { hp: 300, def: 12, luk: 10 }, reqLv: 60, sell: 2500 },
  { id: 'antler_charm', name: '순록뿔 부적', desc: '별빛순록의 뿔을 깎았다. 네 능력이 고루 오른다.', kind: 'equip', slot: 'ring', stats: { str: 14, agi: 14, wis: 14, luk: 14 }, reqLv: 85, sell: 6000 },
  { id: 'four_leaf', name: '네잎 클로버', desc: '풀밭에서 아주 드물게 발견된다. 누군가 이걸 찾고 있다는 소문이 있다.', kind: 'key', sell: 0 },
  { id: 'pet_shard', name: '펫 크리스탈 조각', desc: '동료 둥지에 넣으면 펫 크리스탈 10개가 된다.', kind: 'material', sell: 1 },
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
    drops: [{ item: 'moss_crown', chance: 0.35, qty: [1, 1] }, { item: 'mushroom', chance: 1, qty: [5, 10] }, { item: 'chest_small', chance: 0.5, qty: [1, 1] }, { item: 'stone_stat', chance: 0.5, qty: [1, 1] }, { item: 'stamp_crit', chance: 0.25, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.3, qty: [1, 2] }, { item: 'pet_shard', chance: 1, qty: [3, 5] }, { item: 'trophy_moss', chance: 0.08, qty: [1, 1] }] },
  { id: 'mossblob', name: '이끼방울', hp: 12, atk: 3, acc: 3, defZero: 6, xp: 4, coins: [1, 3], speed: 16, motion: 'hop', radius: 8,
    drops: [{ item: 'moss', chance: 0.5, qty: [1, 1] }, { item: 'four_leaf', chance: 0.003, qty: [1, 1] }, { item: 'berry', chance: 0.15, qty: [1, 2] }, { item: 'stamp_hp', chance: 0.003, qty: [1, 1] }, { item: 'statue_luk', chance: 0.006, qty: [1, 1] }, { item: 'statue_feast', chance: 0.004, qty: [1, 1] }] },
  { id: 'pebbler', name: '돌콩이', hp: 46, atk: 8, acc: 10, defZero: 16, xp: 12, coins: [3, 7], speed: 22, motion: 'waddle', radius: 8,
    drops: [{ item: 'pebble', chance: 0.45, qty: [1, 2] }, { item: 'berry', chance: 0.12, qty: [1, 2] }, { item: 'pebble_charm', chance: 0.004, qty: [1, 1] }, { item: 'stone_mine', chance: 0.003, qty: [1, 1] }, { item: 'stamp_def', chance: 0.003, qty: [1, 1] }, { item: 'statue_str', chance: 0.006, qty: [1, 1] }, { item: 'statue_guard', chance: 0.004, qty: [1, 1] }] },
  { id: 'leafling', name: '잎새깨비', hp: 130, atk: 16, acc: 22, defZero: 34, xp: 30, coins: [8, 15], speed: 28, motion: 'float', radius: 8,
    drops: [{ item: 'leaf', chance: 0.4, qty: [1, 2] }, { item: 'mushroom', chance: 0.12, qty: [1, 1] }, { item: 'forest_key', chance: 0.004, qty: [1, 1] }, { item: 'stone_chop', chance: 0.003, qty: [1, 1] }, { item: 'stamp_acc', chance: 0.003, qty: [1, 1] }, { item: 'statue_agi', chance: 0.006, qty: [1, 1] }, { item: 'statue_wis', chance: 0.006, qty: [1, 1] }] },
  // 미니보스(정해진 시간에만 나타난다)·콜로세움 챔피언: 다른 몬스터 그림을 크게, 물들여 쓴다
  { id: 'stumpelder', name: '숲의 장로', hp: 4200, atk: 30, acc: 30, defZero: 60, xp: 1200, coins: [600, 900], speed: 10, motion: 'float', radius: 18, scale: 2.2, art: 'leafling', tint: 0x9fffa0,
    drops: [{ item: 'statue_wis', chance: 0.6, qty: [1, 3] }, { item: 'stone_atk', chance: 0.4, qty: [1, 1] }, { item: 'stamp_drop', chance: 0.15, qty: [1, 1] }, { item: 'arena_ticket', chance: 0.5, qty: [1, 2] }, { item: 'pet_shard', chance: 1, qty: [2, 4] }, { item: 'mushroom', chance: 1, qty: [5, 10] }] },
  { id: 'ruinwarden', name: '유적 수호자', hp: 16000, atk: 70, acc: 80, defZero: 120, xp: 5000, coins: [2500, 4000], speed: 8, motion: 'waddle', radius: 20, scale: 2.4, art: 'golemite', tint: 0xffd27a,
    drops: [{ item: 'statue_fortune', chance: 0.8, qty: [1, 3] }, { item: 'stone_stat', chance: 0.5, qty: [1, 2] }, { item: 'stamp_xp', chance: 0.2, qty: [1, 1] }, { item: 'chest_small', chance: 0.3, qty: [1, 1] }, { item: 'moonpie', chance: 1, qty: [3, 6] }, { item: 'pet_shard', chance: 1, qty: [5, 8] }] },
  { id: 'champion', name: '콜로세움 챔피언', hp: 9000, atk: 55, acc: 60, defZero: 95, xp: 2500, coins: [0, 0], speed: 18, motion: 'waddle', radius: 18, scale: 2.2, art: 'pebbler', tint: 0xffa0a0, drops: [] },
  // 1월드 후반(숲 오른쪽에서 이어지는 다섯 사냥터)
  { id: 'mudturtle', name: '진흙거북', hp: 300, atk: 26, acc: 34, defZero: 50, xp: 60, coins: [12, 22], speed: 12, motion: 'waddle', radius: 9,
    drops: [{ item: 'shell', chance: 0.4, qty: [1, 2] }, { item: 'stone_guard', chance: 0.004, qty: [1, 1] }, { item: 'stew', chance: 0.06, qty: [1, 1] }, { item: 'statue_guard', chance: 0.006, qty: [1, 1] }, { item: 'stamp_mining', chance: 0.002, qty: [1, 1] }] },
  { id: 'glowbat', name: '반딧박쥐', hp: 480, atk: 36, acc: 46, defZero: 66, xp: 92, coins: [16, 30], speed: 30, motion: 'float', radius: 8,
    drops: [{ item: 'glowdust', chance: 0.4, qty: [1, 2] }, { item: 'stone_atk', chance: 0.003, qty: [1, 1] }, { item: 'stew', chance: 0.06, qty: [1, 1] }, { item: 'statue_agi', chance: 0.006, qty: [1, 1] }, { item: 'stamp_drop', chance: 0.002, qty: [1, 1] }] },
  { id: 'gusthopper', name: '바람메뚜기', hp: 740, atk: 48, acc: 60, defZero: 84, xp: 135, coins: [22, 40], speed: 34, motion: 'hop', radius: 8,
    drops: [{ item: 'feather', chance: 0.4, qty: [1, 2] }, { item: 'stone_stat', chance: 0.002, qty: [1, 1] }, { item: 'moonpie', chance: 0.03, qty: [1, 1] }, { item: 'statue_wis', chance: 0.006, qty: [1, 1] }, { item: 'stamp_xp', chance: 0.002, qty: [1, 1] }] },
  { id: 'golemite', name: '돌골렘', hp: 1150, atk: 62, acc: 76, defZero: 108, xp: 195, coins: [30, 55], speed: 14, motion: 'waddle', radius: 10,
    drops: [{ item: 'runestone', chance: 0.4, qty: [1, 2] }, { item: 'moonpie', chance: 0.04, qty: [1, 1] }, { item: 'statue_str', chance: 0.006, qty: [1, 1] }, { item: 'stamp_chopping', chance: 0.002, qty: [1, 1] }] },
  { id: 'shroomkin', name: '버섯도깨비', hp: 1700, atk: 80, acc: 94, defZero: 132, xp: 280, coins: [40, 75], speed: 22, motion: 'hop', radius: 9,
    drops: [{ item: 'sporecap', chance: 0.4, qty: [1, 2] }, { item: 'moonpie', chance: 0.06, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.004, qty: [1, 1] }, { item: 'stamp_coins', chance: 0.002, qty: [1, 1] }] },
  // ───── 2월드: 노을 사막 ─────
  { id: 'cactling', name: '선인장꼬마', hp: 2300, atk: 92, acc: 110, defZero: 150, xp: 360, coins: [50, 90], speed: 18, motion: 'hop', radius: 9,
    drops: [{ item: 'cactus_spine', chance: 0.4, qty: [1, 2] }, { item: 'cactus_juice', chance: 0.05, qty: [1, 1] }, { item: 'statue_str', chance: 0.005, qty: [1, 1] }, { item: 'stone_guard', chance: 0.004, qty: [1, 1] }] },
  { id: 'scorpip', name: '꼬마전갈', hp: 3200, atk: 108, acc: 128, defZero: 170, xp: 470, coins: [60, 110], speed: 26, motion: 'waddle', radius: 9,
    drops: [{ item: 'scorp_tail', chance: 0.4, qty: [1, 2] }, { item: 'cactus_juice', chance: 0.05, qty: [1, 1] }, { item: 'statue_agi', chance: 0.005, qty: [1, 1] }, { item: 'stone_atk', chance: 0.004, qty: [1, 1] }] },
  { id: 'mirabird', name: '아지랑이새', hp: 4400, atk: 124, acc: 148, defZero: 192, xp: 610, coins: [75, 135], speed: 32, motion: 'float', radius: 8,
    drops: [{ item: 'heat_feather', chance: 0.4, qty: [1, 2] }, { item: 'cactus_juice', chance: 0.06, qty: [1, 1] }, { item: 'statue_wis', chance: 0.005, qty: [1, 1] }, { item: 'stamp_xp', chance: 0.002, qty: [1, 1] }] },
  { id: 'mumbun', name: '붕대돌이', hp: 6000, atk: 142, acc: 170, defZero: 216, xp: 790, coins: [90, 165], speed: 14, motion: 'waddle', radius: 10,
    drops: [{ item: 'old_bandage', chance: 0.4, qty: [1, 2] }, { item: 'date_cake', chance: 0.04, qty: [1, 1] }, { item: 'statue_guard', chance: 0.005, qty: [1, 1] }, { item: 'stone_stat', chance: 0.003, qty: [1, 1] }] },
  { id: 'saltcrab', name: '소금게', hp: 8200, atk: 162, acc: 194, defZero: 242, xp: 1020, coins: [110, 200], speed: 20, motion: 'waddle', radius: 10,
    drops: [{ item: 'salt_crystal', chance: 0.4, qty: [1, 2] }, { item: 'date_cake', chance: 0.05, qty: [1, 1] }, { item: 'statue_feast', chance: 0.005, qty: [1, 1] }, { item: 'stamp_drop', chance: 0.002, qty: [1, 1] }] },
  { id: 'duneworm', name: '모래벌레', hp: 11000, atk: 184, acc: 220, defZero: 270, xp: 1320, coins: [135, 240], speed: 24, motion: 'hop', radius: 10,
    drops: [{ item: 'worm_scale', chance: 0.4, qty: [1, 2] }, { item: 'date_cake', chance: 0.05, qty: [1, 1] }, { item: 'statue_luk', chance: 0.005, qty: [1, 1] }, { item: 'stamp_mining', chance: 0.002, qty: [1, 1] }] },
  { id: 'sunwisp', name: '해불꽃', hp: 15000, atk: 208, acc: 250, defZero: 300, xp: 1700, coins: [160, 290], speed: 30, motion: 'float', radius: 9,
    drops: [{ item: 'sun_ember', chance: 0.4, qty: [1, 2] }, { item: 'sun_key', chance: 0.004, qty: [1, 1] }, { item: 'date_cake', chance: 0.06, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.005, qty: [1, 1] }, { item: 'stamp_coins', chance: 0.002, qty: [1, 1] }] },
  { id: 'sandlord', name: '사막 거상', hp: 90000, atk: 210, acc: 250, defZero: 330, xp: 30000, coins: [8000, 12000], speed: 10, motion: 'waddle', radius: 22, scale: 2.8,
    boss: { slamEvery: 4.5, slamWindup: 1.0, slamRadius: 64, slamDmg: 170, card: 'sandlord' },
    drops: [{ item: 'sand_crown', chance: 0.3, qty: [1, 1] }, { item: 'date_cake', chance: 1, qty: [5, 10] }, { item: 'chest_small', chance: 0.5, qty: [1, 1] }, { item: 'stone_stat', chance: 0.6, qty: [1, 2] }, { item: 'pet_shard', chance: 1, qty: [5, 8] }, { item: 'trophy_sand', chance: 0.08, qty: [1, 1] }] },
  // ───── 3월드: 서리 고원 ─────
  { id: 'snowpuff', name: '눈뭉치', hp: 20000, atk: 232, acc: 280, defZero: 330, xp: 2200, coins: [190, 340], speed: 18, motion: 'hop', radius: 9,
    drops: [{ item: 'snow_tuft', chance: 0.4, qty: [1, 2] }, { item: 'hot_cocoa', chance: 0.05, qty: [1, 1] }, { item: 'statue_feast', chance: 0.005, qty: [1, 1] }, { item: 'stone_guard', chance: 0.004, qty: [1, 1] }] },
  { id: 'pinekin', name: '솔방울이', hp: 27000, atk: 258, acc: 312, defZero: 362, xp: 2850, coins: [220, 400], speed: 24, motion: 'hop', radius: 9,
    drops: [{ item: 'pine_cone', chance: 0.4, qty: [1, 2] }, { item: 'hot_cocoa', chance: 0.05, qty: [1, 1] }, { item: 'statue_str', chance: 0.005, qty: [1, 1] }, { item: 'stone_chop', chance: 0.004, qty: [1, 1] }] },
  { id: 'penglet', name: '꼬마펭귄', hp: 36000, atk: 286, acc: 346, defZero: 396, xp: 3650, coins: [260, 470], speed: 20, motion: 'waddle', radius: 9,
    drops: [{ item: 'peng_feather', chance: 0.4, qty: [1, 2] }, { item: 'hot_cocoa', chance: 0.06, qty: [1, 1] }, { item: 'statue_agi', chance: 0.005, qty: [1, 1] }, { item: 'stone_lure', chance: 0.004, qty: [1, 1] }] },
  { id: 'icicle', name: '고드름이', hp: 48000, atk: 316, acc: 384, defZero: 432, xp: 4700, coins: [300, 550], speed: 28, motion: 'float', radius: 8,
    drops: [{ item: 'icicle_shard', chance: 0.4, qty: [1, 2] }, { item: 'pine_soup', chance: 0.04, qty: [1, 1] }, { item: 'statue_wis', chance: 0.005, qty: [1, 1] }, { item: 'stone_atk', chance: 0.004, qty: [1, 1] }] },
  { id: 'yetiling', name: '아기 설인', hp: 64000, atk: 350, acc: 424, defZero: 472, xp: 6000, coins: [350, 640], speed: 16, motion: 'waddle', radius: 10,
    drops: [{ item: 'yeti_fur', chance: 0.4, qty: [1, 2] }, { item: 'pine_soup', chance: 0.05, qty: [1, 1] }, { item: 'statue_guard', chance: 0.005, qty: [1, 1] }, { item: 'stone_stat', chance: 0.003, qty: [1, 1] }] },
  { id: 'aurowisp', name: '오로라나비', hp: 85000, atk: 386, acc: 468, defZero: 514, xp: 7700, coins: [410, 750], speed: 32, motion: 'float', radius: 8,
    drops: [{ item: 'aurora_dust', chance: 0.4, qty: [1, 2] }, { item: 'pine_soup', chance: 0.05, qty: [1, 1] }, { item: 'statue_luk', chance: 0.005, qty: [1, 1] }, { item: 'stamp_xp', chance: 0.002, qty: [1, 1] }] },
  { id: 'frostgolem', name: '서리 골렘', hp: 112000, atk: 424, acc: 516, defZero: 560, xp: 9800, coins: [480, 880], speed: 12, motion: 'waddle', radius: 11,
    drops: [{ item: 'frost_core', chance: 0.4, qty: [1, 2] }, { item: 'frost_key', chance: 0.004, qty: [1, 1] }, { item: 'pine_soup', chance: 0.06, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.005, qty: [1, 1] }, { item: 'stamp_drop', chance: 0.002, qty: [1, 1] }] },
  { id: 'frostlord', name: '눈보라 군주', hp: 700000, atk: 430, acc: 520, defZero: 600, xp: 250000, coins: [60000, 90000], speed: 10, motion: 'float', radius: 24, scale: 2.8,
    boss: { slamEvery: 4, slamWindup: 0.9, slamRadius: 70, slamDmg: 360, card: 'frostlord' },
    drops: [{ item: 'frost_crown', chance: 0.3, qty: [1, 1] }, { item: 'pine_soup', chance: 1, qty: [5, 10] }, { item: 'chest_small', chance: 0.5, qty: [1, 1] }, { item: 'stone_stat', chance: 0.7, qty: [1, 2] }, { item: 'pet_shard', chance: 1, qty: [8, 12] }, { item: 'trophy_frost', chance: 0.08, qty: [1, 1] }] },
  // ───── 4월드: 별빛 성운 ─────
  { id: 'starling', name: '별모래톨', hp: 150000, atk: 470, acc: 570, defZero: 620, xp: 13000, coins: [600, 1100], speed: 20, motion: 'hop', radius: 9,
    drops: [{ item: 'star_sand', chance: 0.4, qty: [1, 2] }, { item: 'moon_cake', chance: 0.05, qty: [1, 1] }, { item: 'statue_feast', chance: 0.005, qty: [1, 1] }, { item: 'stone_guard', chance: 0.004, qty: [1, 1] }] },
  { id: 'cratermite', name: '구덩이 진드기', hp: 200000, atk: 510, acc: 620, defZero: 670, xp: 16500, coins: [700, 1250], speed: 26, motion: 'waddle', radius: 10,
    drops: [{ item: 'crater_shell', chance: 0.4, qty: [1, 2] }, { item: 'moon_cake', chance: 0.05, qty: [1, 1] }, { item: 'statue_str', chance: 0.005, qty: [1, 1] }, { item: 'stone_chop', chance: 0.004, qty: [1, 1] }] },
  { id: 'nebjelly', name: '성운해파리', hp: 270000, atk: 555, acc: 675, defZero: 725, xp: 21000, coins: [800, 1450], speed: 18, motion: 'float', radius: 9,
    drops: [{ item: 'neb_jelly', chance: 0.4, qty: [1, 2] }, { item: 'moon_cake', chance: 0.06, qty: [1, 1] }, { item: 'statue_wis', chance: 0.005, qty: [1, 1] }, { item: 'stone_lure', chance: 0.004, qty: [1, 1] }] },
  { id: 'meteorite', name: '운석돌이', hp: 360000, atk: 600, acc: 730, defZero: 785, xp: 27000, coins: [900, 1650], speed: 22, motion: 'hop', radius: 10,
    drops: [{ item: 'meteor_chip', chance: 0.4, qty: [1, 2] }, { item: 'nova_stew', chance: 0.04, qty: [1, 1] }, { item: 'statue_agi', chance: 0.005, qty: [1, 1] }, { item: 'stone_atk', chance: 0.004, qty: [1, 1] }] },
  { id: 'ringowl', name: '고리부엉이', hp: 480000, atk: 650, acc: 790, defZero: 850, xp: 34000, coins: [1050, 1900], speed: 30, motion: 'float', radius: 9,
    drops: [{ item: 'ring_plume', chance: 0.4, qty: [1, 2] }, { item: 'nova_stew', chance: 0.05, qty: [1, 1] }, { item: 'statue_luk', chance: 0.005, qty: [1, 1] }, { item: 'stone_stat', chance: 0.003, qty: [1, 1] }] },
  { id: 'cometfox', name: '혜성여우', hp: 640000, atk: 705, acc: 860, defZero: 920, xp: 43000, coins: [1200, 2200], speed: 34, motion: 'waddle', radius: 10,
    drops: [{ item: 'comet_hair', chance: 0.4, qty: [1, 2] }, { item: 'nova_stew', chance: 0.05, qty: [1, 1] }, { item: 'statue_guard', chance: 0.005, qty: [1, 1] }, { item: 'stamp_xp', chance: 0.002, qty: [1, 1] }] },
  { id: 'voidimp', name: '공허 도깨비', hp: 850000, atk: 765, acc: 930, defZero: 1000, xp: 54000, coins: [1400, 2600], speed: 16, motion: 'float', radius: 10,
    drops: [{ item: 'void_shard', chance: 0.4, qty: [1, 2] }, { item: 'void_key', chance: 0.004, qty: [1, 1] }, { item: 'nova_stew', chance: 0.06, qty: [1, 1] }, { item: 'statue_fortune', chance: 0.005, qty: [1, 1] }, { item: 'stamp_drop', chance: 0.002, qty: [1, 1] }] },
  { id: 'nebtitan', name: '성운 거신', hp: 5500000, atk: 780, acc: 950, defZero: 1080, xp: 2000000, coins: [400000, 600000], speed: 10, motion: 'float', radius: 26, scale: 3,
    boss: { slamEvery: 4, slamWindup: 0.9, slamRadius: 76, slamDmg: 640, card: 'nebtitan' },
    drops: [{ item: 'void_mask', chance: 0.3, qty: [1, 1] }, { item: 'nova_stew', chance: 1, qty: [5, 10] }, { item: 'chest_small', chance: 0.5, qty: [1, 1] }, { item: 'stone_stat', chance: 0.8, qty: [1, 2] }, { item: 'pet_shard', chance: 1, qty: [12, 18] }, { item: 'trophy_void', chance: 0.08, qty: [1, 1] }] },
];
// 일반 몬스터는 순간이동 티켓을 드물게 떨어뜨린다
for (const m of monsters) if (!m.boss && !m.scale) m.drops.push({ item: 'tp_ticket', chance: 0.006, qty: [1, 1] });
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(monsters.map((m) => [m.id, m]));
/** 순간이동 티켓 */
export const TP_TICKET = 'tp_ticket';

const nodes: NodeDef[] = [
  { id: 'oak', name: '참나무', skill: 'chopping', reqLv: 1, hp: 6, xp: 3, item: 'log' },
  { id: 'redrock', name: '붉은돌 광맥', skill: 'mining', reqLv: 1, hp: 8, xp: 4, item: 'ore' },
  { id: 'silvertree', name: '은빛나무', skill: 'chopping', reqLv: 5, hp: 22, xp: 11, item: 'silverlog' },
  { id: 'willow', name: '버드나무', skill: 'chopping', reqLv: 12, hp: 50, xp: 26, item: 'willowlog' },
  { id: 'moonbirch', name: '달빛자작', skill: 'chopping', reqLv: 22, hp: 110, xp: 60, item: 'moonlog' },
  { id: 'bluerock', name: '푸른돌 광맥', skill: 'mining', reqLv: 10, hp: 40, xp: 20, item: 'ore_blue' },
  { id: 'goldrock', name: '금빛돌 광맥', skill: 'mining', reqLv: 20, hp: 95, xp: 50, item: 'ore_gold' },
  { id: 'palm', name: '야자나무', skill: 'chopping', reqLv: 30, hp: 200, xp: 110, item: 'palmlog' },
  { id: 'amberrock', name: '호박 광맥', skill: 'mining', reqLv: 30, hp: 180, xp: 100, item: 'ore_amber' },
  // 낚시터·곤충 덤불(2월드). 처음 레벨부터 시작하는 새 기술이라 단계가 낮다
  { id: 'spring', name: '오아시스 샘', skill: 'fishing', reqLv: 1, hp: 8, xp: 5, item: 'fish_minnow' },
  { id: 'saltpool', name: '소금 물가', skill: 'fishing', reqLv: 10, hp: 40, xp: 22, item: 'fish_salt' },
  { id: 'starpool', name: '별빛 웅덩이', skill: 'fishing', reqLv: 22, hp: 100, xp: 55, item: 'fish_star' },
  { id: 'antbush', name: '개미 덤불', skill: 'catching', reqLv: 1, hp: 8, xp: 5, item: 'bug_ant' },
  { id: 'glowbush', name: '반딧불 덤불', skill: 'catching', reqLv: 10, hp: 40, xp: 22, item: 'bug_firefly' },
  { id: 'goldbush', name: '풍뎅이 덤불', skill: 'catching', reqLv: 22, hp: 100, xp: 55, item: 'bug_beetle' },
  // 3월드
  { id: 'pine', name: '전나무', skill: 'chopping', reqLv: 45, hp: 420, xp: 230, item: 'pinelog' },
  { id: 'frostrock', name: '서리 광맥', skill: 'mining', reqLv: 45, hp: 380, xp: 210, item: 'ore_frost' },
  { id: 'icehole', name: '얼음 구멍', skill: 'fishing', reqLv: 35, hp: 200, xp: 110, item: 'fish_ice' },
  { id: 'frostbush', name: '서리 덤불', skill: 'catching', reqLv: 35, hp: 200, xp: 110, item: 'bug_frost' },
  // 4월드
  { id: 'startree', name: '별빛나무', skill: 'chopping', reqLv: 60, hp: 900, xp: 480, item: 'starlog' },
  { id: 'novarock', name: '신성 광맥', skill: 'mining', reqLv: 60, hp: 820, xp: 440, item: 'ore_nova' },
  { id: 'nebpool', name: '성운 웅덩이', skill: 'fishing', reqLv: 50, hp: 420, xp: 230, item: 'fish_neb' },
  { id: 'cometbush', name: '혜성 덤불', skill: 'catching', reqLv: 50, hp: 420, xp: 230, item: 'bug_neb' },
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
    facilities: [{ kind: 'games', x: 660, y: 0 }],
    portals: [{ x: 24, to: 'town', toX: 620, toY: -48 }, { x: 796, to: 'hills', toX: 50, reqKills: 15 }, { x: 590, y: -96, to: 'arena', toX: 60, key: 'arena_ticket', label: '콜로세움' }] },
  { id: 'hills', name: '자갈 언덕', width: 920, theme: 'hills',
    platforms: [{ x: 110, y: -48, w: 180 }, { x: 370, y: -48, w: 140 }, { x: 570, y: -48, w: 230 }, { x: 630, y: -96, w: 140 }],
    spawns: [{ monster: 'pebbler', count: 7 }, { monster: 'mossblob', count: 2 }],
    nodes: [{ node: 'redrock', x: 330 }, { node: 'redrock', x: 535 }],
    ropes: [{ x: 165, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 600, top: -48, bottom: 0 }, { x: 740, top: -96, bottom: -48 }],
    facilities: [{ kind: 'owl', x: 230, y: -48 }, { kind: 'npc', npc: 'stranger', x: 650, y: -96 }],
    portals: [{ x: 24, to: 'meadow', toX: 765 }, { x: 896, to: 'forest', toX: 50, reqKills: 40 }, { x: 700, y: -96, to: 'mine1', toX: 50, reqSkill: { skill: 'mining', lv: 5 }, label: '얕은 광산' }] },
  // 숲: 오른쪽 끝 언덕 위에 보스방 문(열쇠 필요)
  { id: 'forest', name: '속삭임 숲', width: 980, theme: 'forest',
    platforms: [{ x: 90, y: -48, w: 220 }, { x: 180, y: -96, w: 110 }, { x: 430, y: -48, w: 160 }, { x: 660, y: -48, w: 150 }, { x: 860, y: -48, w: 120 }],
    spawns: [{ monster: 'leafling', count: 8 }],
    nodes: [{ node: 'silvertree', x: 380 }, { node: 'oak', x: 620 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 510, top: -48, bottom: 0 }, { x: 760, top: -48, bottom: 0 }, { x: 866, top: -48, bottom: 0 }],
    facilities: [],
    portals: [{ x: 24, to: 'hills', toX: 865 }, { x: 950, y: -48, to: 'lair', toX: 60, reqKills: 60, key: 'forest_key', label: '이끼왕의 둥지' }, { x: 835, to: 'swamp', toX: 50, reqKills: 120 }] },
  { id: 'lair', name: '이끼왕의 둥지', width: 560, theme: 'forest', boss: 'mossking',
    platforms: [], spawns: [], nodes: [], ropes: [], facilities: [],
    portals: [{ x: 24, to: 'forest', toX: 940, toY: -48 }] },
  { id: 'swamp', name: '안개 늪', width: 940, theme: 'swamp',
    platforms: [{ x: 140, y: -48, w: 200 }, { x: 420, y: -48, w: 180 }, { x: 470, y: -96, w: 120 }, { x: 690, y: -48, w: 190 }],
    spawns: [{ monster: 'mudturtle', count: 8 }], nodes: [{ node: 'willow', x: 90 }, { node: 'willow', x: 640 }],
    ropes: [{ x: 170, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 570, top: -96, bottom: -48 }, { x: 860, top: -48, bottom: 0 }],
    facilities: [{ kind: 'totem', x: 300, y: 0 }], portals: [{ x: 24, to: 'forest', toX: 835 }, { x: 916, to: 'cave', toX: 50, reqKills: 150 }] },
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
    facilities: [], portals: [{ x: 24, to: 'ruins', toX: 910 }, { x: 956, to: 'oasis', toX: 60, label: '세계의 문', gate: true }] },
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
  // ───── 2월드: 노을 사막(오아시스 마을에서 동쪽으로 이어진다) ─────
  { id: 'oasis', name: '오아시스 마을', width: 700, theme: 'oasis',
    platforms: [{ x: 420, y: -48, w: 280 }],
    ropes: [{ x: 430, top: -48, bottom: 0 }],
    spawns: [], nodes: [{ node: 'spring', x: 330 }, { node: 'antbush', x: 395 }], campfireX: 72,
    facilities: [{ kind: 'storage', x: 120, y: 0 }, { kind: 'shop', x: 190, y: 0 }, { kind: 'npc', npc: 'caravan', x: 270, y: 0 }, { kind: 'post', x: 470, y: -48 }, { kind: 'anvil', x: 540, y: -48 }, { kind: 'alchemy', x: 620, y: -48 }],
    portals: [{ x: 24, to: 'grove', toX: 920, label: '세계의 문' }, { x: 676, y: -48, to: 'dunes', toX: 50 }] },
  { id: 'dunes', name: '바람 모래톱', width: 940, theme: 'dunes',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 420, y: -48, w: 200 }, { x: 460, y: -96, w: 130 }, { x: 700, y: -48, w: 190 }],
    spawns: [{ monster: 'cactling', count: 9 }], nodes: [{ node: 'palm', x: 90 }, { node: 'palm', x: 650 }, { node: 'antbush', x: 300 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 570, top: -96, bottom: -48 }, { x: 860, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'oasis', toX: 650, toY: -48 }, { x: 916, to: 'canyon', toX: 50, reqKills: 300 }] },
  { id: 'canyon', name: '붉은 협곡', width: 960, theme: 'canyon',
    platforms: [{ x: 110, y: -48, w: 220 }, { x: 150, y: -96, w: 140 }, { x: 450, y: -48, w: 170 }, { x: 700, y: -48, w: 210 }, { x: 740, y: -96, w: 130 }],
    spawns: [{ monster: 'scorpip', count: 9 }], nodes: [{ node: 'amberrock', x: 410 }, { node: 'amberrock', x: 660 }],
    ropes: [{ x: 130, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 470, top: -48, bottom: 0 }, { x: 720, top: -48, bottom: 0 }, { x: 850, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'dunes', toX: 890 }, { x: 936, to: 'mirage', toX: 50, reqKills: 350 }] },
  { id: 'mirage', name: '신기루 평원', width: 960, theme: 'mirage',
    platforms: [{ x: 140, y: -48, w: 200 }, { x: 430, y: -48, w: 220 }, { x: 480, y: -96, w: 130 }, { x: 720, y: -48, w: 190 }],
    spawns: [{ monster: 'mirabird', count: 9 }], nodes: [{ node: 'palm', x: 400 }, { node: 'spring', x: 780 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 450, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }, { x: 880, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'canyon', toX: 910 }, { x: 936, to: 'tomb', toX: 50, reqKills: 400 }] },
  { id: 'tomb', name: '모래 무덤', width: 940, theme: 'tomb',
    platforms: [{ x: 100, y: -48, w: 240 }, { x: 150, y: -96, w: 140 }, { x: 460, y: -48, w: 180 }, { x: 700, y: -48, w: 200 }],
    spawns: [{ monster: 'mumbun', count: 9 }], nodes: [{ node: 'amberrock', x: 420 }, { node: 'glowbush', x: 640 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 230, top: -96, bottom: -48 }, { x: 480, top: -48, bottom: 0 }, { x: 870, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'mirage', toX: 910 }, { x: 916, to: 'saltlake', toX: 50, reqKills: 450 }] },
  { id: 'saltlake', name: '소금 호수', width: 960, theme: 'saltlake',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 420, y: -48, w: 240 }, { x: 470, y: -96, w: 140 }, { x: 740, y: -48, w: 170 }],
    spawns: [{ monster: 'saltcrab', count: 9 }], nodes: [{ node: 'palm', x: 90 }, { node: 'saltpool', x: 330 }, { node: 'saltpool', x: 560 }, { node: 'amberrock', x: 700 }],
    ropes: [{ x: 150, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }, { x: 880, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'tomb', toX: 890 }, { x: 936, to: 'starfield', toX: 50, reqKills: 500 }] },
  { id: 'starfield', name: '별모래 들판', width: 980, theme: 'starfield',
    platforms: [{ x: 120, y: -48, w: 210 }, { x: 160, y: -96, w: 130 }, { x: 450, y: -48, w: 200 }, { x: 730, y: -48, w: 200 }, { x: 770, y: -96, w: 130 }],
    spawns: [{ monster: 'duneworm', count: 9 }], nodes: [{ node: 'glowbush', x: 250 }, { node: 'palm', x: 410 }, { node: 'amberrock', x: 690 }, { node: 'starpool', x: 880 }],
    ropes: [{ x: 140, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 470, top: -48, bottom: 0 }, { x: 750, top: -48, bottom: 0 }, { x: 880, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'saltlake', toX: 910 }, { x: 956, to: 'sunspire', toX: 50, reqKills: 550 }] },
  // 해탑 유적: 오른쪽 위 발판 끝에 거상의 방(열쇠)
  { id: 'sunspire', name: '해탑 유적', width: 980, theme: 'sunspire',
    platforms: [{ x: 100, y: -48, w: 230 }, { x: 420, y: -48, w: 200 }, { x: 460, y: -96, w: 140 }, { x: 760, y: -48, w: 220 }, { x: 820, y: -96, w: 160 }],
    spawns: [{ monster: 'sunwisp', count: 9 }], nodes: [{ node: 'starpool', x: 230 }, { node: 'amberrock', x: 380 }, { node: 'goldbush', x: 660 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 580, top: -96, bottom: -48 }, { x: 780, top: -48, bottom: 0 }, { x: 840, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'starfield', toX: 930 }, { x: 952, y: -96, to: 'sandlair', toX: 60, reqKills: 300, key: 'sun_key', label: '거상의 방' }, { x: 956, to: 'snowtown', toX: 60, label: '세계의 문', gate: true }] },
  { id: 'sandlair', name: '거상의 방', width: 600, theme: 'sunspire', boss: 'sandlord',
    platforms: [], spawns: [], nodes: [], ropes: [], facilities: [],
    portals: [{ x: 24, to: 'sunspire', toX: 930, toY: -96 }] },
  // ───── 3월드: 서리 고원(눈꽃 마을에서 동쪽으로 이어진다) ─────
  { id: 'snowtown', name: '눈꽃 마을', width: 700, theme: 'snowtown',
    platforms: [{ x: 400, y: -48, w: 300 }],
    ropes: [{ x: 410, top: -48, bottom: 0 }],
    spawns: [], nodes: [{ node: 'icehole', x: 330 }], campfireX: 250,
    facilities: [{ kind: 'storage', x: 100, y: 0 }, { kind: 'shop', x: 160, y: 0 }, { kind: 'npc', npc: 'sledder', x: 210, y: 0 }, { kind: 'build', x: 380, y: 0 }, { kind: 'anvil', x: 460, y: -48 }, { kind: 'npc', npc: 'elder3', x: 540, y: -48 }, { kind: 'traps', x: 612, y: -48 }],
    portals: [{ x: 24, to: 'sunspire', toX: 930, label: '세계의 문' }, { x: 676, y: -48, to: 'snowfield', toX: 50 }] },
  { id: 'snowfield', name: '눈송이 벌판', width: 940, theme: 'snowfield',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 420, y: -48, w: 200 }, { x: 460, y: -96, w: 130 }, { x: 700, y: -48, w: 190 }],
    spawns: [{ monster: 'snowpuff', count: 9 }], nodes: [{ node: 'pine', x: 90 }, { node: 'pine', x: 650 }, { node: 'frostbush', x: 300 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 570, top: -96, bottom: -48 }, { x: 860, top: -48, bottom: 0 }],
    facilities: [{ kind: 'shrine', x: 380, y: 0 }], portals: [{ x: 24, to: 'snowtown', toX: 650, toY: -48 }, { x: 916, to: 'pinewood', toX: 50, reqKills: 600 }] },
  { id: 'pinewood', name: '전나무 숲', width: 960, theme: 'pinewood',
    platforms: [{ x: 110, y: -48, w: 220 }, { x: 150, y: -96, w: 140 }, { x: 450, y: -48, w: 170 }, { x: 700, y: -48, w: 210 }, { x: 740, y: -96, w: 130 }],
    spawns: [{ monster: 'pinekin', count: 9 }], nodes: [{ node: 'pine', x: 410 }, { node: 'pine', x: 660 }, { node: 'frostbush', x: 900 }],
    ropes: [{ x: 130, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 470, top: -48, bottom: 0 }, { x: 720, top: -48, bottom: 0 }, { x: 850, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'snowfield', toX: 890 }, { x: 936, to: 'frostlake', toX: 50, reqKills: 650 }] },
  { id: 'frostlake', name: '얼어붙은 호수', width: 960, theme: 'frostlake',
    platforms: [{ x: 140, y: -48, w: 200 }, { x: 430, y: -48, w: 220 }, { x: 480, y: -96, w: 130 }, { x: 720, y: -48, w: 190 }],
    spawns: [{ monster: 'penglet', count: 9 }], nodes: [{ node: 'icehole', x: 380 }, { node: 'icehole', x: 680 }, { node: 'frostrock', x: 800 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 450, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }, { x: 880, top: -48, bottom: 0 }],
    facilities: [{ kind: 'shrine', x: 240, y: 0 }], portals: [{ x: 24, to: 'pinewood', toX: 910 }, { x: 936, to: 'icecave', toX: 50, reqKills: 700 }] },
  { id: 'icecave', name: '고드름 동굴', width: 940, theme: 'icecave',
    platforms: [{ x: 100, y: -48, w: 240 }, { x: 150, y: -96, w: 140 }, { x: 460, y: -48, w: 180 }, { x: 700, y: -48, w: 200 }],
    spawns: [{ monster: 'icicle', count: 9 }], nodes: [{ node: 'frostrock', x: 420 }, { node: 'frostrock', x: 660 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 230, top: -96, bottom: -48 }, { x: 480, top: -48, bottom: 0 }, { x: 870, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'frostlake', toX: 910 }, { x: 916, to: 'glacier', toX: 50, reqKills: 750 }] },
  { id: 'glacier', name: '빙하 절벽', width: 960, theme: 'glacier',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 420, y: -48, w: 240 }, { x: 470, y: -96, w: 140 }, { x: 740, y: -48, w: 170 }],
    spawns: [{ monster: 'yetiling', count: 9 }], nodes: [{ node: 'pine', x: 90 }, { node: 'frostrock', x: 380 }, { node: 'icehole', x: 700 }],
    ropes: [{ x: 150, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }, { x: 880, top: -48, bottom: 0 }],
    facilities: [{ kind: 'shrine', x: 240, y: 0 }], portals: [{ x: 24, to: 'icecave', toX: 890 }, { x: 936, to: 'aurora', toX: 50, reqKills: 800 }] },
  { id: 'aurora', name: '오로라 언덕', width: 980, theme: 'aurora',
    platforms: [{ x: 120, y: -48, w: 210 }, { x: 160, y: -96, w: 130 }, { x: 450, y: -48, w: 200 }, { x: 730, y: -48, w: 200 }, { x: 770, y: -96, w: 130 }],
    spawns: [{ monster: 'aurowisp', count: 9 }], nodes: [{ node: 'frostbush', x: 250 }, { node: 'pine', x: 410 }, { node: 'frostrock', x: 690 }, { node: 'icehole', x: 880 }],
    ropes: [{ x: 140, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 470, top: -48, bottom: 0 }, { x: 750, top: -48, bottom: 0 }, { x: 880, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'glacier', toX: 910 }, { x: 956, to: 'frostpeak', toX: 50, reqKills: 850 }] },
  // 서리 봉우리: 오른쪽 위 발판 끝에 눈보라 군주의 옥좌(열쇠)
  { id: 'frostpeak', name: '서리 봉우리', width: 980, theme: 'frostpeak',
    platforms: [{ x: 100, y: -48, w: 230 }, { x: 420, y: -48, w: 200 }, { x: 460, y: -96, w: 140 }, { x: 760, y: -48, w: 220 }, { x: 820, y: -96, w: 160 }],
    spawns: [{ monster: 'frostgolem', count: 9 }], nodes: [{ node: 'icehole', x: 230 }, { node: 'frostrock', x: 380 }, { node: 'frostbush', x: 660 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 580, top: -96, bottom: -48 }, { x: 780, top: -48, bottom: 0 }, { x: 840, top: -96, bottom: -48 }],
    facilities: [{ kind: 'shrine', x: 520, y: 0 }], portals: [{ x: 24, to: 'aurora', toX: 930 }, { x: 952, y: -96, to: 'frostlair', toX: 60, reqKills: 400, key: 'frost_key', label: '눈보라 옥좌' }, { x: 956, to: 'nebtown', toX: 60, label: '세계의 문', gate: true }] },
  { id: 'frostlair', name: '눈보라 옥좌', width: 600, theme: 'frostpeak', boss: 'frostlord',
    platforms: [], spawns: [], nodes: [], ropes: [], facilities: [],
    portals: [{ x: 24, to: 'frostpeak', toX: 930, toY: -96 }] },
  // ───── 4월드: 별빛 성운(성운 정거장에서 동쪽으로 이어진다) ─────
  { id: 'nebtown', name: '성운 정거장', width: 700, theme: 'nebtown',
    platforms: [{ x: 400, y: -48, w: 300 }],
    ropes: [{ x: 410, top: -48, bottom: 0 }],
    spawns: [], nodes: [{ node: 'nebpool', x: 370 }],
    facilities: [{ kind: 'storage', x: 100, y: 0 }, { kind: 'shop', x: 160, y: 0 }, { kind: 'npc', npc: 'astro', x: 220, y: 0 }, { kind: 'kitchen', x: 292, y: 0 }, { kind: 'anvil', x: 440, y: -48 }, { kind: 'lab', x: 515, y: -48 }, { kind: 'nest', x: 594, y: -48 }],
    portals: [{ x: 24, to: 'frostpeak', toX: 930, label: '세계의 문' }, { x: 676, y: -48, to: 'moondust', toX: 50 }] },
  { id: 'moondust', name: '달먼지 평원', width: 940, theme: 'moondust',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 420, y: -48, w: 200 }, { x: 460, y: -96, w: 130 }, { x: 700, y: -48, w: 190 }],
    spawns: [{ monster: 'starling', count: 9 }], nodes: [{ node: 'startree', x: 90 }, { node: 'startree', x: 650 }, { node: 'cometbush', x: 300 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 570, top: -96, bottom: -48 }, { x: 860, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'nebtown', toX: 650, toY: -48 }, { x: 916, to: 'crater', toX: 50, reqKills: 900 }] },
  { id: 'crater', name: '운석 구덩이', width: 960, theme: 'crater',
    platforms: [{ x: 110, y: -48, w: 220 }, { x: 150, y: -96, w: 140 }, { x: 450, y: -48, w: 170 }, { x: 700, y: -48, w: 210 }, { x: 740, y: -96, w: 130 }],
    spawns: [{ monster: 'cratermite', count: 9 }], nodes: [{ node: 'novarock', x: 420 }, { node: 'novarock', x: 660 }, { node: 'cometbush', x: 900 }],
    ropes: [{ x: 130, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 470, top: -48, bottom: 0 }, { x: 720, top: -48, bottom: 0 }, { x: 850, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'moondust', toX: 890 }, { x: 936, to: 'nebula', toX: 50, reqKills: 950 }] },
  { id: 'nebula', name: '성운 안개', width: 960, theme: 'nebula',
    platforms: [{ x: 140, y: -48, w: 200 }, { x: 430, y: -48, w: 220 }, { x: 480, y: -96, w: 130 }, { x: 720, y: -48, w: 190 }],
    spawns: [{ monster: 'nebjelly', count: 9 }], nodes: [{ node: 'nebpool', x: 380 }, { node: 'nebpool', x: 680 }, { node: 'novarock', x: 800 }],
    ropes: [{ x: 160, top: -48, bottom: 0 }, { x: 450, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }, { x: 880, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'crater', toX: 910 }, { x: 936, to: 'asteroid', toX: 50, reqKills: 1000 }] },
  { id: 'asteroid', name: '소행성 띠', width: 940, theme: 'asteroid',
    platforms: [{ x: 100, y: -48, w: 240 }, { x: 150, y: -96, w: 140 }, { x: 460, y: -48, w: 180 }, { x: 700, y: -48, w: 200 }],
    spawns: [{ monster: 'meteorite', count: 9 }], nodes: [{ node: 'novarock', x: 420 }, { node: 'novarock', x: 660 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 230, top: -96, bottom: -48 }, { x: 480, top: -48, bottom: 0 }, { x: 870, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'nebula', toX: 910 }, { x: 916, to: 'rings', toX: 50, reqKills: 1050 }] },
  { id: 'rings', name: '고리 행성', width: 960, theme: 'rings',
    platforms: [{ x: 130, y: -48, w: 200 }, { x: 420, y: -48, w: 240 }, { x: 470, y: -96, w: 140 }, { x: 740, y: -48, w: 170 }],
    spawns: [{ monster: 'ringowl', count: 9 }], nodes: [{ node: 'startree', x: 90 }, { node: 'novarock', x: 380 }, { node: 'nebpool', x: 700 }],
    ropes: [{ x: 150, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 590, top: -96, bottom: -48 }, { x: 880, top: -48, bottom: 0 }],
    facilities: [], portals: [{ x: 24, to: 'asteroid', toX: 890 }, { x: 936, to: 'comet', toX: 50, reqKills: 1100 }] },
  { id: 'comet', name: '혜성 꼬리', width: 980, theme: 'comet',
    platforms: [{ x: 120, y: -48, w: 210 }, { x: 160, y: -96, w: 130 }, { x: 450, y: -48, w: 200 }, { x: 730, y: -48, w: 200 }, { x: 770, y: -96, w: 130 }],
    spawns: [{ monster: 'cometfox', count: 9 }], nodes: [{ node: 'cometbush', x: 250 }, { node: 'startree', x: 410 }, { node: 'novarock', x: 690 }, { node: 'nebpool', x: 880 }],
    ropes: [{ x: 140, top: -48, bottom: 0 }, { x: 260, top: -96, bottom: -48 }, { x: 470, top: -48, bottom: 0 }, { x: 750, top: -48, bottom: 0 }, { x: 880, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'rings', toX: 910 }, { x: 956, to: 'voidedge', toX: 50, reqKills: 1150 }] },
  { id: 'voidedge', name: '공허의 끝', width: 980, theme: 'voidedge',
    platforms: [{ x: 100, y: -48, w: 230 }, { x: 420, y: -48, w: 200 }, { x: 460, y: -96, w: 140 }, { x: 760, y: -48, w: 220 }, { x: 820, y: -96, w: 160 }],
    spawns: [{ monster: 'voidimp', count: 9 }], nodes: [{ node: 'nebpool', x: 230 }, { node: 'novarock', x: 380 }, { node: 'cometbush', x: 660 }],
    ropes: [{ x: 120, top: -48, bottom: 0 }, { x: 440, top: -48, bottom: 0 }, { x: 580, top: -96, bottom: -48 }, { x: 780, top: -48, bottom: 0 }, { x: 840, top: -96, bottom: -48 }],
    facilities: [], portals: [{ x: 24, to: 'comet', toX: 930 }, { x: 952, y: -96, to: 'voidlair', toX: 60, reqKills: 500, key: 'void_key', label: '거신의 궤도' }] },
  { id: 'voidlair', name: '거신의 궤도', width: 600, theme: 'voidedge', boss: 'nebtitan',
    platforms: [], spawns: [], nodes: [], ropes: [], facilities: [],
    portals: [{ x: 24, to: 'voidedge', toX: 930, toY: -96 }] },
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
  { item: 'anvil_exp3', coins: 20000, mats: [['bar_amber', 20], ['cactus_spine', 40], ['palmlog', 60]], unlock: 4, smithLv: 30, tier: 3 },
  { item: 'rod_palm', coins: 2500, mats: [['palmlog', 25], ['twine', 40], ['fish_minnow', 30]], tier: 3 },
  { item: 'net_palm', coins: 2500, mats: [['palmlog', 25], ['twine', 40], ['bug_ant', 30]], tier: 3 },
  { item: 'rod_amber', coins: 6000, mats: [['bar_amber', 10], ['palmlog', 20], ['fish_salt', 40]], tier: 4 },
  { item: 'net_amber', coins: 6000, mats: [['bar_amber', 10], ['palmlog', 20], ['bug_firefly', 40]], tier: 4 },
  { item: 'sword_amber', coins: 9000, mats: [['bar_amber', 14], ['scorp_tail', 20], ['sun_ember', 6]], tier: 4 },
  { item: 'bow_amber', coins: 9000, mats: [['bar_amber', 10], ['palmlog', 30], ['heat_feather', 20]], tier: 4 },
  { item: 'wand_amber', coins: 9000, mats: [['bar_amber', 10], ['palmlog', 25], ['sun_ember', 10]], tier: 4 },
  { item: 'pick_amber', coins: 6000, mats: [['bar_amber', 12], ['palmlog', 20], ['nail', 30]], tier: 4 },
  { item: 'axe_amber', coins: 6000, mats: [['bar_amber', 12], ['palmlog', 20], ['nail', 30]], tier: 4 },
  { item: 'helm_amber', coins: 7000, mats: [['bar_amber', 12], ['old_bandage', 20]], tier: 4 },
  { item: 'plate_amber', coins: 10000, mats: [['bar_amber', 18], ['salt_crystal', 20], ['old_bandage', 20]], tier: 4 },
  { item: 'legs_amber', coins: 8000, mats: [['bar_amber', 14], ['worm_scale', 16]], tier: 4 },
  { item: 'boots_amber', coins: 7000, mats: [['bar_amber', 10], ['worm_scale', 12], ['twine', 40]], tier: 4 },
  { item: 'anvil_exp4', coins: 60000, mats: [['bar_frost', 25], ['pinelog', 80], ['snow_tuft', 60]], unlock: 5, smithLv: 45, tier: 4 },
  { item: 'trap_iron', coins: 12000, mats: [['bar_frost', 8], ['pinelog', 30], ['nail', 40]], tier: 5 },
  { item: 'trap_frost', coins: 40000, mats: [['bar_frost', 20], ['frost_core', 10], ['cr_fox', 40]], tier: 5 },
  { item: 'fur_scarf', coins: 15000, mats: [['cr_hare', 60], ['cr_fox', 30], ['twine', 50]], tier: 5 },
  { item: 'antler_charm', coins: 45000, mats: [['cr_reindeer', 30], ['cr_marten', 40], ['aurora_dust', 20]], tier: 5 },
  { item: 'rod_frost', coins: 15000, mats: [['bar_frost', 10], ['pinelog', 30], ['fish_ice', 50]], tier: 5 },
  { item: 'net_frost', coins: 15000, mats: [['bar_frost', 10], ['pinelog', 30], ['bug_frost', 50]], tier: 5 },
  { item: 'sword_frost', coins: 24000, mats: [['bar_frost', 16], ['icicle_shard', 24], ['frost_core', 8]], tier: 5 },
  { item: 'bow_frost', coins: 24000, mats: [['bar_frost', 12], ['pinelog', 40], ['peng_feather', 24]], tier: 5 },
  { item: 'wand_frost', coins: 24000, mats: [['bar_frost', 12], ['pinelog', 30], ['aurora_dust', 16]], tier: 5 },
  { item: 'pick_frost', coins: 15000, mats: [['bar_frost', 14], ['pinelog', 30], ['nail', 60]], tier: 5 },
  { item: 'axe_frost', coins: 15000, mats: [['bar_frost', 14], ['pinelog', 30], ['nail', 60]], tier: 5 },
  { item: 'helm_frost', coins: 18000, mats: [['bar_frost', 14], ['yeti_fur', 20]], tier: 5 },
  { item: 'plate_frost', coins: 26000, mats: [['bar_frost', 20], ['yeti_fur', 24], ['pine_cone', 30]], tier: 5 },
  { item: 'legs_frost', coins: 20000, mats: [['bar_frost', 16], ['peng_feather', 24]], tier: 5 },
  { item: 'boots_frost', coins: 18000, mats: [['bar_frost', 12], ['snow_tuft', 30], ['twine', 80]], tier: 5 },
  // 4월드(모루 6단계)
  { item: 'anvil_exp5', coins: 200000, mats: [['bar_nova', 30], ['starlog', 100], ['star_sand', 80]], unlock: 6, smithLv: 60, tier: 5 },
  { item: 'sword_nova', coins: 60000, mats: [['bar_nova', 20], ['meteor_chip', 30], ['void_shard', 10]], tier: 6 },
  { item: 'bow_nova', coins: 60000, mats: [['bar_nova', 16], ['starlog', 50], ['ring_plume', 30]], tier: 6 },
  { item: 'wand_nova', coins: 60000, mats: [['bar_nova', 16], ['starlog', 40], ['neb_jelly', 24]], tier: 6 },
  { item: 'pick_nova', coins: 40000, mats: [['bar_nova', 18], ['starlog', 40], ['bar_frost', 20]], tier: 6 },
  { item: 'axe_nova', coins: 40000, mats: [['bar_nova', 18], ['starlog', 40], ['bar_frost', 20]], tier: 6 },
  { item: 'rod_nova', coins: 40000, mats: [['bar_nova', 14], ['starlog', 40], ['fish_neb', 60]], tier: 6 },
  { item: 'net_nova', coins: 40000, mats: [['bar_nova', 14], ['starlog', 40], ['bug_neb', 60]], tier: 6 },
  { item: 'helm_nova', coins: 45000, mats: [['bar_nova', 18], ['crater_shell', 26]], tier: 6 },
  { item: 'plate_nova', coins: 65000, mats: [['bar_nova', 26], ['crater_shell', 30], ['comet_hair', 24]], tier: 6 },
  { item: 'legs_nova', coins: 50000, mats: [['bar_nova', 20], ['comet_hair', 26]], tier: 6 },
  { item: 'boots_nova', coins: 45000, mats: [['bar_nova', 16], ['star_sand', 40], ['yeti_fur', 30]], tier: 6 },
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
  // 히든 계열(방랑자 → 운명술사)
  { id: 'fortune', name: '행운 폭발', max: 10, cls: 'wanderer', active: { cooldown: 9, mana: 7 }, desc: (lv) => `주변의 모든 적에게 ${200 + lv * 25}% 피해` },
  { id: 'treasure', name: '보물 감각', max: 10, cls: 'wanderer', desc: (lv) => `드롭률 +${lv * 3}%` },
  { id: 'roam', name: '떠돌이 걸음', max: 10, cls: 'wanderer', desc: (lv) => `방치 효율 +${lv}%p` },
  { id: 'destiny', name: '운명의 실', max: 10, cls: 'fateweaver', active: { cooldown: 14, mana: 12 }, desc: (lv) => `가까운 적과 그 주변에 ${300 + lv * 30}% 피해` },
  { id: 'jackpot', name: '대박', max: 10, cls: 'fateweaver', desc: (lv) => `코인 획득 +${lv * 4}%` },
  { id: 'gatherluck', name: '행운의 손', max: 10, cls: 'fateweaver', desc: (lv) => `채집 효율(채광·벌목·낚시·곤충) +${lv * 4}%` },
  { id: 'talestorm', name: '이야기 폭풍', max: 10, cls: 'taler', active: { cooldown: 16, mana: 18 }, desc: (lv) => `넓은 범위의 모든 적에게 ${400 + lv * 40}% 피해` },
  { id: 'narrate', name: '이야기꾼', max: 10, cls: 'taler', desc: (lv) => `경험치 +${lv * 3}%` },
  { id: 'plot', name: '복선', max: 10, cls: 'taler', desc: (lv) => `방치 효율 +${lv}%p` },
  { id: 'lifesong', name: '생명의 노래', max: 10, cls: 'lifeteller', active: { cooldown: 30, mana: 25 }, desc: (lv) => `체력 ${40 + lv * 3}% 회복 + 넓은 범위의 적에게 ${500 + lv * 50}% 피해` },
  { id: 'chronicle', name: '연대기', max: 10, cls: 'lifeteller', desc: (lv) => `채집 효율(채광·벌목·낚시·곤충) +${lv * 5}%` },
  { id: 'legacy', name: '유산', max: 10, cls: 'lifeteller', desc: (lv) => `드롭률·코인 획득 +${lv * 3}%` },
  // 3차 전직(Lv.70)
  { id: 'quake', name: '대지 울림', max: 10, cls: 'bastion', active: { cooldown: 12, mana: 14 }, desc: (lv) => `넓은 범위의 모든 적에게 ${400 + lv * 40}% 피해` },
  { id: 'aegis', name: '성채의 방패', max: 10, cls: 'bastion', desc: (lv) => `방어력 +${lv * 2}` },
  { id: 'stalwart', name: '굳센 뿌리', max: 10, cls: 'bastion', desc: (lv) => `최대 체력 +${lv * 4}%` },
  { id: 'rampage', name: '폭주 난타', max: 10, cls: 'warlord', active: { cooldown: 10, mana: 12 }, desc: (lv) => `주변의 모든 적에게 ${500 + lv * 50}% 피해` },
  { id: 'warcry', name: '함성', max: 10, cls: 'warlord', desc: (lv) => `공격력 +${lv * 4}%` },
  { id: 'carnage', name: '난도질', max: 10, cls: 'warlord', desc: (lv) => `치명타 피해 +${lv * 5}%` },
  { id: 'pierce', name: '관통 화살', max: 10, cls: 'hawkeye', active: { cooldown: 9, mana: 10 }, desc: (lv) => `가까운 적 최대 6마리에게 ${300 + lv * 30}% 피해` },
  { id: 'eagle', name: '독수리 눈', max: 10, cls: 'hawkeye', desc: (lv) => `치명타 확률 +${(lv * 1.2).toFixed(1)}%p` },
  { id: 'focus', name: '집중', max: 10, cls: 'hawkeye', desc: (lv) => `명중 +${lv * 3}` },
  { id: 'arrowrain', name: '화살비', max: 10, cls: 'pathfinder', active: { cooldown: 12, mana: 12 }, desc: (lv) => `사거리 안 모든 적에게 ${250 + lv * 25}% 피해` },
  { id: 'scout', name: '정찰', max: 10, cls: 'pathfinder', desc: (lv) => `드롭률 +${lv * 3}%` },
  { id: 'harvest', name: '수확의 손', max: 10, cls: 'pathfinder', desc: (lv) => `채집 효율(채광·벌목·낚시·곤충) +${lv * 4}%` },
  { id: 'meteor', name: '운석', max: 10, cls: 'archmage', active: { cooldown: 14, mana: 18 }, desc: (lv) => `대상 주변 넓은 범위에 ${450 + lv * 45}% 피해` },
  { id: 'arcana', name: '비전', max: 10, cls: 'archmage', desc: (lv) => `공격력 +${lv * 4}%` },
  { id: 'manawell', name: '마나 샘', max: 10, cls: 'archmage', desc: (lv) => `최대 마나 +${lv * 6}%, 마나 회복 +${lv * 6}%` },
  { id: 'starfall', name: '별똥비', max: 10, cls: 'oracle', active: { cooldown: 12, mana: 14 }, desc: (lv) => `대상 주변의 모든 적에게 ${350 + lv * 35}% 피해` },
  { id: 'prophecy', name: '예언', max: 10, cls: 'oracle', desc: (lv) => `경험치 +${lv * 3}%` },
  { id: 'dreamwalk', name: '꿈길', max: 10, cls: 'oracle', desc: (lv) => `방치 효율 +${(lv * 0.8).toFixed(1)}%p` },
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
export const WORLD2 = ['oasis', 'dunes', 'canyon', 'mirage', 'tomb', 'saltlake', 'starfield', 'sunspire'];
/** 월드마다 순간이동 지도에 오르는 맵(보스방·콜로세움 제외)과 시작 마을 */
export const WORLD3 = ['snowtown', 'snowfield', 'pinewood', 'frostlake', 'icecave', 'glacier', 'aurora', 'frostpeak'];
export const WORLD4 = ['nebtown', 'moondust', 'crater', 'nebula', 'asteroid', 'rings', 'comet', 'voidedge'];
/** spawnX: 마을에서 다시 시작하는 자리 */
export const WORLDS = [
  { n: 1, name: '1월드 · 이끼 들판', town: 'town', spawnX: 120, maps: WORLD1 },
  { n: 2, name: '2월드 · 노을 사막', town: 'oasis', spawnX: 300, maps: WORLD2 },
  { n: 3, name: '3월드 · 서리 고원', town: 'snowtown', spawnX: 300, maps: WORLD3 },
  { n: 4, name: '4월드 · 별빛 성운', town: 'nebtown', spawnX: 300, maps: WORLD4 },
];
/** 보스방·콜로세움처럼 순간이동 지도에 오르지 않는 맵이 속한 월드 */
const EXTRA_WORLD: Record<string, number> = { lair: 1, arena: 1, sandlair: 2, frostlair: 3, voidlair: 4 };
export const TOWNS = WORLDS.map((w) => w.town);
/** 이 맵이 속한 월드(보스방·콜로세움은 이어진 맵을 따라간다) */
export function worldOf(id: string): number {
  for (const w of WORLDS) if (w.maps.includes(id)) return w.n;
  return EXTRA_WORLD[id] ?? 1;
}
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
  /** 히든 직업: 숨은 NPC에게서만, 숨은 조건을 채워야 전직(HIDDEN_CLASS) */
  hidden?: boolean;
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
  wanderer: { id: 'wanderer', name: '낭만가', hidden: true, desc: '어느 길에도 서지 않은 숨겨진 길. 행운이 공격력과 명중이 되고, 드롭률 +6%.', main: 'luk', acc: 'luk', range: 30, weapon: 'sword', perk: { drop: 6 } },
  fateweaver: { id: 'fateweaver', base: 'wanderer', name: '워커', desc: '세상을 걸으며 운을 모은다. 드롭률 +12%, 방치 효율 +3%p, 치명타 +4%p.', main: 'luk', acc: 'luk', range: 30, weapon: 'sword', perk: { drop: 12, afk: 3, crit: 4 } },
  taler: { id: 'taler', base: 'fateweaver', name: '테일러', desc: '걸어온 길을 이야기로 엮는다. 드롭률 +16%, 방치 효율 +4%p, 치명타 +6%p, 경험치 +6%.', main: 'luk', acc: 'luk', range: 34, weapon: 'sword', perk: { drop: 16, afk: 4, crit: 6, xp: 6 } },
  lifeteller: { id: 'lifeteller', base: 'taler', name: '라이프텔러', desc: '삶 전체를 이야기하는 자. 드롭률 +22%, 방치 효율 +6%p, 치명타 +8%p, 경험치 +10%, 최대 체력 +10%.', main: 'luk', acc: 'luk', range: 38, weapon: 'sword', perk: { drop: 22, afk: 6, crit: 8, xp: 10, hpPct: 10 } },
  // 3차 전직(Lv.70, 마을 촌장)
  bastion: { id: 'bastion', base: 'guardian', name: '성채기사', desc: '무너지지 않는 성채. 최대 체력 +30%, 방어력 +8.', main: 'str', acc: 'wis', range: 30, weapon: 'sword', perk: { hpPct: 30, def: 8 } },
  warlord: { id: 'warlord', base: 'berserker', name: '전쟁군주', desc: '전장을 휩쓴다. 공격력 +20%, 치명타 +8%p.', main: 'str', acc: 'wis', range: 30, weapon: 'sword', perk: { dmg: 20, crit: 8 } },
  hawkeye: { id: 'hawkeye', base: 'sharpshooter', name: '매사수', desc: '보이는 곳은 모두 사거리. 치명타 +12%p, 공격력 +10%.', main: 'agi', acc: 'str', range: 135, weapon: 'bow', perk: { crit: 12, dmg: 10 } },
  pathfinder: { id: 'pathfinder', base: 'ranger', name: '개척자', desc: '아무도 모르는 길을 낸다. 드롭률 +18%, 이동 속도 +12.', main: 'agi', acc: 'str', range: 120, weapon: 'bow', perk: { drop: 18, speed: 12 } },
  archmage: { id: 'archmage', base: 'elementalist', name: '대마법사', desc: '원소를 넘어선 힘. 공격력 +22%.', main: 'wis', acc: 'agi', range: 105, weapon: 'wand', perk: { dmg: 22 } },
  oracle: { id: 'oracle', base: 'hexer', name: '예언자', desc: '앞날을 내다보고 기다린다. 경험치 +16%, 방치 효율 +5%p.', main: 'wis', acc: 'agi', range: 100, weapon: 'wand', perk: { xp: 16, afk: 5 } },
  hexer: { id: 'hexer', base: 'mage', name: '주술사', desc: '느긋하게 쌓는다. 경험치 +10%, 방치 효율 +3%p.', main: 'wis', acc: 'agi', range: 95, weapon: 'wand', perk: { xp: 10, afk: 3 } },
};
export const CLASS_LEVEL = 10;
/** 2차 전직 레벨 */
export const SUBCLASS_LEVEL = 30;
/** 단계별 전직 레벨(인덱스 = 단계: 1차 10, 2차 30, 3차 70, 4차 120) */
export const TIER_LEVEL = [0, CLASS_LEVEL, SUBCLASS_LEVEL, 70, 120];
/** 초보자부터 지금 직업까지의 계보 */
export const classLine = (cls: ClassId): ClassId[] => {
  const out: ClassId[] = [];
  for (let k: ClassId | undefined = cls; k && k !== 'beginner'; k = CLASSES[k]?.base) out.unshift(k);
  return ['beginner', ...out];
};
/** 직업 단계(초보자 0, 1차 1, …) */
export const classTier = (cls: ClassId) => classLine(cls).length - 1;
/** 1차 직업(그 위 단계라면 계보의 뿌리) */
export const baseClass = (cls: ClassId): BaseClass => (classLine(cls)[1] ?? 'beginner') as BaseClass;
/** 이 직업에서 이어지는 다음 단계 직업들 */
export const nextClasses = (cls: ClassId) => (Object.keys(CLASSES) as ClassId[]).filter((id) => CLASSES[id].base === cls);
/** 이 1차 직업 계열이 갈 수 있는 가장 높은 단계 */
export function maxTierOf(base: ClassId): number {
  let best = Math.max(2, classTier(base));
  for (const id of Object.keys(CLASSES) as ClassId[]) if (classLine(id)[1] === base) best = Math.max(best, classTier(id));
  return best;
}
/** 다음 단계로 전직할 수 있는가(2차 이상) */
export const canSubclass = (c: { cls: ClassId; level: number }) => c.cls !== 'beginner' && nextClasses(c.cls).length > 0 && c.level >= TIER_LEVEL[classTier(c.cls) + 1];

/** 카드: 계정 전체가 함께 모으는 수집 보너스(장착해야 효과). 1/3/10장에서 단계 상승.
 *  id 는 몬스터 id(몬스터 카드) 또는 자원 id(자원 카드: 채집할 때 드물게) */
export type CardBonus = 'hp' | 'dmg' | 'drop' | 'afk' | 'mining' | 'chopping' | 'fishing' | 'catching' | 'afkSkill';
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
  { id: 'cactling', from: 'monster', bonus: 'hp', per: 0.05, label: '최대 체력' },
  { id: 'scorpip', from: 'monster', bonus: 'dmg', per: 0.05, label: '공격력' },
  { id: 'mirabird', from: 'monster', bonus: 'drop', per: 0.05, label: '드롭률' },
  { id: 'mumbun', from: 'monster', bonus: 'hp', per: 0.06, label: '최대 체력' },
  { id: 'saltcrab', from: 'monster', bonus: 'afk', per: 0.03, label: '방치 효율' },
  { id: 'duneworm', from: 'monster', bonus: 'dmg', per: 0.06, label: '공격력' },
  { id: 'sunwisp', from: 'monster', bonus: 'drop', per: 0.06, label: '드롭률' },
  { id: 'sandlord', from: 'monster', bonus: 'afk', per: 0.04, label: '방치 효율' },
  { id: 'palm', from: 'node', bonus: 'chopping', per: 0.08, label: '벌목 효율' },
  { id: 'amberrock', from: 'node', bonus: 'mining', per: 0.1, label: '채광 효율' },
  { id: 'spring', from: 'node', bonus: 'fishing', per: 0.06, label: '낚시 효율' },
  { id: 'saltpool', from: 'node', bonus: 'fishing', per: 0.08, label: '낚시 효율' },
  { id: 'starpool', from: 'node', bonus: 'afkSkill', per: 0.03, label: '채집 방치 효율' },
  { id: 'antbush', from: 'node', bonus: 'catching', per: 0.06, label: '곤충 채집 효율' },
  { id: 'glowbush', from: 'node', bonus: 'catching', per: 0.08, label: '곤충 채집 효율' },
  { id: 'goldbush', from: 'node', bonus: 'afkSkill', per: 0.03, label: '채집 방치 효율' },
  { id: 'snowpuff', from: 'monster', bonus: 'hp', per: 0.07, label: '최대 체력' },
  { id: 'pinekin', from: 'monster', bonus: 'dmg', per: 0.07, label: '공격력' },
  { id: 'penglet', from: 'monster', bonus: 'drop', per: 0.07, label: '드롭률' },
  { id: 'icicle', from: 'monster', bonus: 'dmg', per: 0.08, label: '공격력' },
  { id: 'yetiling', from: 'monster', bonus: 'hp', per: 0.08, label: '최대 체력' },
  { id: 'aurowisp', from: 'monster', bonus: 'afk', per: 0.04, label: '방치 효율' },
  { id: 'frostgolem', from: 'monster', bonus: 'drop', per: 0.08, label: '드롭률' },
  { id: 'frostlord', from: 'monster', bonus: 'afk', per: 0.05, label: '방치 효율' },
  { id: 'pine', from: 'node', bonus: 'chopping', per: 0.1, label: '벌목 효율' },
  { id: 'frostrock', from: 'node', bonus: 'mining', per: 0.12, label: '채광 효율' },
  { id: 'icehole', from: 'node', bonus: 'fishing', per: 0.1, label: '낚시 효율' },
  { id: 'frostbush', from: 'node', bonus: 'catching', per: 0.1, label: '곤충 채집 효율' },
  { id: 'starling', from: 'monster', bonus: 'hp', per: 0.09, label: '최대 체력' },
  { id: 'cratermite', from: 'monster', bonus: 'dmg', per: 0.09, label: '공격력' },
  { id: 'nebjelly', from: 'monster', bonus: 'afk', per: 0.05, label: '방치 효율' },
  { id: 'meteorite', from: 'monster', bonus: 'dmg', per: 0.1, label: '공격력' },
  { id: 'ringowl', from: 'monster', bonus: 'drop', per: 0.09, label: '드롭률' },
  { id: 'cometfox', from: 'monster', bonus: 'hp', per: 0.1, label: '최대 체력' },
  { id: 'voidimp', from: 'monster', bonus: 'drop', per: 0.1, label: '드롭률' },
  { id: 'nebtitan', from: 'monster', bonus: 'afk', per: 0.06, label: '방치 효율' },
  { id: 'startree', from: 'node', bonus: 'chopping', per: 0.12, label: '벌목 효율' },
  { id: 'novarock', from: 'node', bonus: 'mining', per: 0.14, label: '채광 효율' },
  { id: 'nebpool', from: 'node', bonus: 'afkSkill', per: 0.04, label: '채집 방치 효율' },
  { id: 'cometbush', from: 'node', bonus: 'catching', per: 0.12, label: '곤충 채집 효율' },
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

const CARAVAN_QUESTS: QuestDef[] = [
  { name: '모래 위의 첫 발', text: '문을 건너왔다고? 대단하군! 우선 모래톱의 선인장꼬마들부터 좀 치워 주게. 짐수레가 못 지나가.', goal: { kill: 'cactling', n: 30 }, reward: { coins: 2000, xp: 3000 } },
  { name: '따끔한 납품', text: '선인장 가시는 바늘로 쓰기 딱 좋아. 넉넉히 모아 오면 값은 쳐 주지.', goal: { item: 'cactus_spine', n: 25 }, reward: { item: 'cactus_juice', xp: 5000 } },
  { name: '협곡의 꼬리들', text: '붉은 협곡 전갈들이 짐꾼을 겁줘서 큰일이야.', goal: { kill: 'scorpip', n: 60 }, reward: { coins: 6000, xp: 9000 } },
  { name: '호박 주괴', text: '호박 광석을 녹이면 꿀빛 주괴가 나오지. 대장장이들이 탐내는 물건이라네.', goal: { item: 'bar_amber', n: 10 }, reward: { item: 'chest_small', xp: 15000 } },
  { name: '해탑의 불씨', text: '해탑 꼭대기에 거상이 산다더군. 불씨를 모으다 보면 열쇠를 얻을지도 몰라.', goal: { item: 'sun_ember', n: 20 }, reward: { item: 'sun_key', xp: 30000 } },
];

const SLEDDER_QUESTS: QuestDef[] = [
  { name: '눈길 치우기', text: '사막에서 왔다고? 얼어 죽기 전에 일이나 하자고! 벌판의 눈뭉치들이 썰매 길을 막았어.', goal: { kill: 'snowpuff', n: 50 }, reward: { coins: 15000, xp: 40000 } },
  { name: '불쏘시개', text: '전나무 통나무를 넉넉히 가져다주면 마을 난로에 불을 지필 수 있겠어.', goal: { item: 'pinelog', n: 40 }, reward: { item: 'hot_cocoa', xp: 60000 } },
  { name: '호수의 소동', text: '얼어붙은 호수에서 꼬마펭귄들이 낚시꾼 물고기를 훔쳐 가.', goal: { kill: 'penglet', n: 100 }, reward: { coins: 40000, xp: 120000 } },
  { name: '차가운 쇳덩이', text: '서리 광석을 녹인 주괴는 녹슬지 않아. 썰매 날로 딱이지.', goal: { item: 'bar_frost', n: 15 }, reward: { item: 'chest_small', xp: 200000 } },
  { name: '봉우리의 군주', text: '서리 봉우리에 눈보라를 부르는 군주가 있대. 골렘의 핵을 모으면 옥좌 열쇠가 나온다던데.', goal: { item: 'frost_core', n: 30 }, reward: { item: 'frost_key', xp: 400000 } },
];

const ASTRO_QUESTS: QuestDef[] = [
  { name: '별모래 쓸기', text: '눈 덮인 봉우리를 넘어왔다고? 반가워! 정거장 앞 평원에 별모래톨이 너무 많아져서 착륙장이 막혔어.', goal: { kill: 'starling', n: 60 }, reward: { coins: 60000, xp: 200000 } },
  { name: '별빛 목재', text: '정거장 벽을 덧대려면 별빛나무 통나무가 필요해.', goal: { item: 'starlog', n: 50 }, reward: { item: 'moon_cake', xp: 300000 } },
  { name: '안개 속 해파리', text: '성운 안개의 해파리들이 통신 안테나에 엉겨 붙었어. 좀 떼어 줘.', goal: { kill: 'nebjelly', n: 120 }, reward: { coins: 150000, xp: 600000 } },
  { name: '보랏빛 쇳덩이', text: '신성 주괴는 우주선 선체로 그만이야.', goal: { item: 'bar_nova', n: 20 }, reward: { item: 'chest_small', xp: 900000 } },
  { name: '궤도의 거신', text: '공허의 끝 너머 궤도를 거신이 돌고 있어. 도깨비들이 모은 공허 조각으로 문을 열 수 있대.', goal: { item: 'void_shard', n: 40 }, reward: { item: 'void_key', xp: 1500000 } },
];

export interface NpcDef { id: string; name: string; look: { hair: number; hairColor: string; skin: string; outfit: string }; quests: QuestDef[] }
export const NPCS: Record<string, NpcDef> = {
  elder: { id: 'elder', name: '촌장 바루', look: { hair: 2, hairColor: '#e9e4f0', skin: '#efe6f6', outfit: '#8a6fd1' }, quests: ELDER_QUESTS },
  smith: { id: 'smith', name: '대장장이 도리', look: { hair: 1, hairColor: '#2f2a3a', skin: '#d9c3ad', outfit: '#d9574a' }, quests: SMITH_QUESTS },
  stranger: { id: 'stranger', name: '수상한 나그네', look: { hair: 1, hairColor: '#5a4a6a', skin: '#d8c8b8', outfit: '#3a5a4a' }, quests: [] },
  sledder: { id: 'sledder', name: '썰매꾼 노라', look: { hair: 0, hairColor: '#e8b24a', skin: '#f6e6d6', outfit: '#4e8de2' }, quests: SLEDDER_QUESTS },
  // 3월드에도 전직을 맡는 촌장이 있다(3·4차 전직)
  elder3: { id: 'elder3', name: '설원 장로 하윤', look: { hair: 2, hairColor: '#e9eef6', skin: '#e9eef6', outfit: '#6a9ae8' }, quests: [] },
  astro: { id: 'astro', name: '별지기 루미', look: { hair: 1, hairColor: '#c8a8ff', skin: '#f6e6d6', outfit: '#5a3aa8' }, quests: ASTRO_QUESTS },
  caravan: { id: 'caravan', name: '대상 카림', look: { hair: 2, hairColor: '#3a2a1a', skin: '#c9946a', outfit: '#e0a83a' }, quests: CARAVAN_QUESTS },
};
/** 히든 직업 조건: 초보자로 이 레벨 이상, 이 아이템 1개, 숨은 NPC가 있는 맵에서 */
export const HIDDEN_CLASS = { cls: 'wanderer' as ClassId, npc: 'stranger', map: 'hills', level: 15, item: 'four_leaf' };
/** 전직을 맡는 NPC */
export const CLASS_NPC = 'elder';
/** 전직을 맡는 NPC들(월드마다 한 명) */
export const CLASS_NPCS = ['elder', 'elder3'];
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

// ───────── 장비 강화석: 장비마다 정해진 강화 칸을 쓴다(실패해도 칸은 쓰인다) ─────────
/** 한 장비에 붙은 강화 기록: 쓴 칸 수와 더해진 능력치 */
export interface Upg { n: number; s: ItemStats }
export interface StoneDef { item: string; stats: ItemStats; chance: number; slots: EquipSlot[] }
const WEAR: EquipSlot[] = ['hat', 'body', 'legs', 'shoes'];
export const STONES: StoneDef[] = [
  { item: 'stone_atk', stats: { dmg: 3 }, chance: 0.8, slots: ['weapon'] },
  { item: 'stone_guard', stats: { def: 2, hp: 15 }, chance: 0.8, slots: WEAR },
  { item: 'stone_stat', stats: { str: 1, agi: 1, wis: 1, luk: 1 }, chance: 0.6, slots: ['weapon', ...WEAR, 'ring'] },
  { item: 'stone_mine', stats: { mining: 3 }, chance: 0.7, slots: ['pickaxe'] },
  { item: 'stone_lure', stats: { fishing: 3, catching: 3 }, chance: 0.7, slots: ['rod', 'net'] },
  { item: 'stone_chop', stats: { chopping: 3 }, chance: 0.7, slots: ['axe'] },
];
export const STONE_BY_ID: Record<string, StoneDef> = Object.fromEntries(STONES.map((s) => [s.item, s]));
/** 부위별 강화 칸 수 */
export const UP_SLOTS: Record<EquipSlot, number> = { weapon: 4, hat: 3, body: 3, legs: 3, shoes: 3, ring: 2, trophy: 0, pickaxe: 3, axe: 3, rod: 3, net: 3 };
export const upSlotsOf = (id: string) => { const s = ITEMS[id]?.slot; return s ? UP_SLOTS[s] : 0; };
export const MAX_CHARACTERS = 6;

// ───────── 덫 사냥(3월드 기술) ─────────
/** mins: 한 마리 잡히는 데 드는 기본 분, map: 이 맵이 열려야 덫을 놓을 수 있다 */
export interface CritterDef { id: string; name: string; map: string; lv: number; mins: number; xp: number }
export const CRITTERS: CritterDef[] = [
  { id: 'cr_hare', name: '눈토끼', map: 'snowfield', lv: 1, mins: 6, xp: 8 },
  { id: 'cr_fox', name: '서리여우', map: 'pinewood', lv: 8, mins: 10, xp: 18 },
  { id: 'cr_weasel', name: '얼음족제비', map: 'frostlake', lv: 16, mins: 15, xp: 34 },
  { id: 'cr_marten', name: '오로라담비', map: 'aurora', lv: 28, mins: 22, xp: 60 },
  { id: 'cr_reindeer', name: '별빛순록', map: 'frostpeak', lv: 40, mins: 32, xp: 100 },
];
export const CRITTER: Record<string, CritterDef> = Object.fromEntries(CRITTERS.map((x) => [x.id, x]));
/** 덫 시간: 길게 놓을수록 시간당 효율이 조금 오른다 */
export const TRAP_TIMES = [{ min: 20, mult: 1, label: '20분' }, { min: 60, mult: 1.1, label: '1시간' }, { min: 240, mult: 1.25, label: '4시간' }, { min: 720, mult: 1.4, label: '12시간' }];
/** 덫 도구 단계별 잡는 수 배율(맨손 · 나무 · 쇠 · 서리) */
export const TRAP_MULT = [1, 1.5, 2.2, 3.2];
export const TRAP_KITS: Record<string, number> = { trap_wood: 1, trap_iron: 2, trap_frost: 3 };
export const TRAP_NAMES = ['맨손 덫', '나무 덫', '쇠 덫', '서리 덫'];
/** 덫 칸: 기본 1칸, 덫 사냥 10레벨마다 1칸(최대 5) */
export const trapSlots = (lv: number) => Math.min(5, 1 + Math.floor(lv / 10));
/** 음식 칸 수: 위 칸부터 먹는다 */
export const FOOD_SLOTS = 3;
/** 2월드로 가는 세계의 문(달빛 숲 끝): 계정이 이끼왕을 토벌하고, 이 캐릭터가 레벨·달빛 숲 처치를 채워야 한다 */
export interface GateDef { to: number; boss: string; bossKills: number; level: number; map: string; kills: number; text: string }
export const WORLD_GATES: GateDef[] = [
  { to: 2, boss: 'mossking', bossKills: 1, level: 30, map: 'grove', kills: 400, text: '달빛 숲 끝에 오래된 문이 서 있다. 문 너머로 따뜻한 모래바람이 불어온다.' },
  { to: 3, boss: 'sandlord', bossKills: 1, level: 60, map: 'sunspire', kills: 600, text: '해탑 유적 끝, 모래에 반쯤 묻힌 문 너머로 차가운 눈바람이 새어 나온다.' },
  { to: 4, boss: 'frostlord', bossKills: 1, level: 90, map: 'frostpeak', kills: 800, text: '서리 봉우리 끝, 얼음 속에 박힌 문 너머로 별빛이 쏟아진다.' },
];
export const WORLD_GATE = WORLD_GATES[0];
/** n월드로 가는 문 */
export const gateTo = (n: number) => WORLD_GATES.find((g) => g.to === n) ?? WORLD_GATE;

// ───────── 별빛 특성(캐릭터마다, 직업과 상관없는 공용 특성 탭) ─────────
// 포인트: 레벨 2마다 1 + 받은 업적마다 1. 쓴 만큼 빠진다(따로 저장하지 않고 계산)
export interface StarTalDef { id: string; name: string; max: number; icon: string; desc: (lv: number) => string }
export const STAR_TALS: StarTalDef[] = [
  { id: 'sl_speed', name: '가벼운 발걸음', max: 10, icon: 'st_agi', desc: (lv) => `이동 속도 +${(lv * 1.5).toFixed(1)}%` },
  { id: 'sl_food', name: '알뜰한 식사', max: 10, icon: 'it_berry', desc: (lv) => `음식 재사용 대기 -${lv * 4}%` },
  { id: 'sl_mine', name: '광맥 감각', max: 10, icon: 'wp_pick_stone', desc: (lv) => `채광 효율 +${lv * 4}%` },
  { id: 'sl_chop', name: '나뭇결 감각', max: 10, icon: 'wp_axe_stone', desc: (lv) => `벌목 효율 +${lv * 4}%` },
  { id: 'sl_smith', name: '망치 리듬', max: 10, icon: 'obj_craft', desc: (lv) => `모루 생산 속도 +${lv * 3}%` },
  { id: 'sl_coins', name: '동전 냄새', max: 10, icon: 'ui_coin', desc: (lv) => `코인 획득 +${lv * 2}%` },
  { id: 'sl_xp', name: '배움의 별빛', max: 10, icon: 'ui_xp', desc: (lv) => `경험치 +${(lv * 1.5).toFixed(1)}%` },
  { id: 'sl_afk', name: '꿈꾸는 사냥꾼', max: 10, icon: 'ui_afk', desc: (lv) => `방치 효율(전투·채집) +${lv}%p` },
  { id: 'sl_crit', name: '반짝 일격', max: 10, icon: 'st_str', desc: (lv) => `치명타 확률 +${(lv * 0.5).toFixed(1)}%p` },
  { id: 'sl_drop', name: '눈썰미', max: 10, icon: 'ui_items', desc: (lv) => `드롭률 +${lv * 2}%` },
  { id: 'sl_mp', name: '고요한 마음', max: 10, icon: 'ui_mana', desc: (lv) => `마나 회복 +${lv * 5}%` },
];
export const STAR_TAL: Record<string, StarTalDef> = Object.fromEntries(STAR_TALS.map((t) => [t.id, t]));
/** 음식 재사용 대기(초). 먹은 음식의 값을 쓴다 */
export const foodCd = (id: string) => ITEMS[id]?.cd ?? 5;
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
/** w: 이 월드에 가 본 캐릭터에게만 판다 */
export interface ShopEntry { item: string; price: number; daily: number; w?: number }
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
  { item: 'tp_ticket', price: 60, daily: 8 },
  { item: 'pet_shard', price: 300, daily: 2 },
  { item: 'cactus_juice', price: 140, daily: 30, w: 2 },
  { item: 'rod_reed', price: 1500, daily: 1, w: 2 },
  { item: 'net_cloth', price: 1500, daily: 1, w: 2 },
  { item: 'stone_lure', price: 700, daily: 1, w: 2 },
  { item: 'stone_mine', price: 500, daily: 1 },
  { item: 'stone_chop', price: 500, daily: 1 },
  { item: 'stone_guard', price: 900, daily: 1 },
  { item: 'hot_cocoa', price: 360, daily: 30, w: 3 },
  { item: 'trap_wood', price: 3000, daily: 1, w: 3 },
  { item: 'moon_cake', price: 600, daily: 30, w: 4 },
];

// ───────── 석상(캐릭터마다): 조각을 바쳐 레벨을 올린다 ─────────
export type BonusKey = 'str' | 'agi' | 'wis' | 'luk' | 'def' | 'hp' | 'hpPct' | 'drop' | 'dmg' | 'xp' | 'afk' | 'coins' | 'mining' | 'chopping' | 'fishing' | 'catching' | 'acc';
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
  wanderer: { eff: 'drop', a: 8, b: 50, label: '드롭률' },
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

// ───────── 동료(계정, 원작의 펫): 하루 한 번 무료 뽑기 + 펫 크리스탈로 간식을 사서 뽑기 ─────────
// 가지고만 있으면 모든 캐릭터에 효과(장착 없음). 이미 있는 동료가 또 나오면 크리스탈로 바뀐다. 크리스탈로 '+' 강화(효과 2배)
export type PetRarity = 0 | 1 | 2 | 3;
export const RARITY_NAMES = ['일반', '희귀', '영웅', '전설'];
export interface PetDef { id: string; name: string; rarity: PetRarity; eff: BonusKey; per: number; unit: '' | '%' | '%p'; color: string }
export const PETS: PetDef[] = [
  { id: 'pup', name: '솜뭉치 강아지', rarity: 0, eff: 'hpPct', per: 2, unit: '%', color: '#f2e6d0' },
  { id: 'kit', name: '얼룩 고양이', rarity: 0, eff: 'drop', per: 2, unit: '%', color: '#e8a03a' },
  { id: 'frog', name: '연잎 개구리', rarity: 0, eff: 'xp', per: 2, unit: '%', color: '#5fb859' },
  { id: 'mole', name: '두더지 광부', rarity: 1, eff: 'mining', per: 6, unit: '%', color: '#8a6a4a' },
  { id: 'squirrel', name: '도토리 다람쥐', rarity: 1, eff: 'chopping', per: 6, unit: '%', color: '#c9805a' },
  { id: 'owlet', name: '아기 부엉이', rarity: 1, eff: 'xp', per: 4, unit: '%', color: '#9a7a5a' },
  { id: 'hedgehog', name: '고슴도치', rarity: 2, eff: 'def', per: 3, unit: '', color: '#9a8a7a' },
  { id: 'firefly', name: '반딧불이', rarity: 2, eff: 'coins', per: 6, unit: '%', color: '#f6e46a' },
  { id: 'fox', name: '여우 탐정', rarity: 2, eff: 'drop', per: 6, unit: '%', color: '#e8833a' },
  { id: 'sloth', name: '느림보 나무늘보', rarity: 3, eff: 'afk', per: 3, unit: '%p', color: '#a89a80' },
  { id: 'dragonling', name: '아기 용', rarity: 3, eff: 'dmg', per: 8, unit: '%', color: '#d9574a' },
];
/** 간식(뽑기): 값(펫 크리스탈)과 등급별 확률. 무료 뽑기는 첫 간식과 같은 확률 */
export const TREATS: { name: string; cost: number; odds: [number, number, number, number] }[] = [
  { name: '풀잎 간식', cost: 40, odds: [0.8, 0.17, 0.03, 0] },
  { name: '꿀떡 간식', cost: 120, odds: [0.55, 0.32, 0.11, 0.02] },
  { name: '별빛 간식', cost: 300, odds: [0.25, 0.4, 0.27, 0.08] },
];
/** 산 간식으로 뽑은 횟수가 이만큼 쌓이도록 그 등급 이상이 안 나오면 보장 */
export const PET_PITY = { rare: 10, epic: 30 };
/** 겹친 동료를 크리스탈로(등급별, 무료 뽑기는 절반) */
export const PET_RECYCLE = [6, 18, 45, 120];
/** '+' 강화 값(등급별) */
export const PET_PLUS = [100, 250, 600, 1500];
/** 펫 크리스탈 조각(아이템) 하나 = 크리스탈 수 */
export const CRYSTAL_ITEM = 'pet_shard', CRYSTAL_PER_ITEM = 10;

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
    { waves: 6, coins: 400, items: [['forge_oil', 3], ['statue_luk', 2], ['stone_guard', 1]] },
    { waves: 10, coins: 1200, items: [['moonpie', 3], ['statue_fortune', 2], ['pet_shard', 2], ['stone_atk', 1]] },
    { waves: 15, coins: 3000, items: [['stamp_crit', 1], ['chest_small', 1], ['pet_shard', 5]] },
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
  { ore: 'ore_amber', bar: 'bar_amber', need: 6, secs: 300 },
  { ore: 'ore_frost', bar: 'bar_frost', need: 7, secs: 480 },
  { ore: 'ore_nova', bar: 'bar_nova', need: 8, secs: 720 },
];
/** 용광로 값: 사는 값, 칸·용량 기본값, 업그레이드(코인, 단계마다 upGrow 배) */
export const FORGE = {
  price: 300, slotsBase: 2, capBase: 60, capPer: 30, speedPer: 0.1, bonusPer: 0.04, oilSpeed: 1.5, oilItem: 'forge_oil',
  upCost: { slots: 800, cap: 150, speed: 200, bonus: 250 }, upGrow: 1.6,
  upMax: { slots: 4, cap: 20, speed: 20, bonus: 10 },
};

const RESOURCE_IDS = ['log', 'silverlog', 'willowlog', 'moonlog', 'palmlog', 'ore', 'ore_blue', 'ore_gold', 'ore_amber', 'bar_red', 'bar_blue', 'bar_gold', 'bar_amber', 'pinelog', 'ore_frost', 'bar_frost', 'starlog', 'ore_nova', 'bar_nova'];
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
