// 게임 콘텐츠 정의. 이름/수치는 전부 임시(placeholder)이며 나중에 컨셉에 맞춰 교체한다.
// 이 폴더(core)는 DOM/Phaser에 의존하지 않는다 → 추후 서버에서 그대로 재사용.

export type StatKey = 'str' | 'agi' | 'wis' | 'luk';
export type SkillKey = 'mining' | 'chopping';
export type EquipSlot = 'weapon' | 'hat' | 'body' | 'pickaxe' | 'axe';

export interface ItemStats {
  dmg?: number; def?: number; hp?: number;
  str?: number; agi?: number; wis?: number; luk?: number;
  mining?: number; chopping?: number;
}
export interface ItemDef {
  id: string; name: string; desc: string;
  kind: 'material' | 'equip';
  slot?: EquipSlot; stats?: ItemStats; reqLv?: number;
  sell: number;
}
export interface DropDef { item: string; chance: number; qty: [number, number] }
export interface MonsterDef {
  id: string; name: string; hp: number; atk: number; xp: number;
  coins: [number, number]; speed: number; drops: DropDef[];
  /** 렌더러가 쓰는 움직임 유형 */
  motion: 'hop' | 'waddle' | 'float';
  radius: number;
}
export interface NodeDef {
  id: string; name: string; skill: SkillKey; reqLv: number;
  hp: number; xp: number; item: string;
}
export interface Platform { x: number; y: number; w: number }
export interface PortalDef { x: number; to: string; toX: number; reqKills?: number }
export interface MapDef {
  id: string; name: string; width: number;
  theme: 'town' | 'meadow' | 'hills' | 'forest';
  /** 지면(y=0)을 제외한 발판. y는 위쪽이 음수. */
  platforms: Platform[];
  spawns: { monster: string; count: number }[];
  nodes: { node: string; x: number }[];
  portals: PortalDef[];
  /** 제작대 위치(마을 전용) */
  craftX?: number;
}
export interface RecipeDef { item: string; coins: number; mats: [string, number][] }

export const STAT_NAMES: Record<StatKey, string> = { str: '힘', agi: '민첩', wis: '지혜', luk: '행운' };
export const STAT_DESC: Record<StatKey, string> = {
  str: '공격력과 최대 체력 증가', agi: '공격/이동 속도 증가',
  wis: '경험치 획득량과 채집 효율 증가', luk: '치명타와 드롭률 증가',
};
export const SKILL_NAMES: Record<SkillKey, string> = { mining: '채광', chopping: '벌목' };
export const SLOT_NAMES: Record<EquipSlot, string> = {
  weapon: '무기', hat: '모자', body: '갑옷', pickaxe: '곡괭이', axe: '도끼',
};

const items: ItemDef[] = [
  { id: 'moss', name: '이끼 덩이', desc: '촉촉하고 폭신하다.', kind: 'material', sell: 1 },
  { id: 'pebble', name: '조약돌', desc: '손에 쏙 들어오는 돌.', kind: 'material', sell: 3 },
  { id: 'leaf', name: '마른 잎', desc: '바스락거리는 잎.', kind: 'material', sell: 8 },
  { id: 'log', name: '참나무 통나무', desc: '튼튼한 목재.', kind: 'material', sell: 2 },
  { id: 'ore', name: '붉은돌 광석', desc: '붉은 빛이 도는 광석.', kind: 'material', sell: 4 },
  { id: 'silverlog', name: '은빛 통나무', desc: '은은하게 빛나는 목재.', kind: 'material', sell: 9 },
  { id: 'sword_wood', name: '나무 검', desc: '초보자의 친구.', kind: 'equip', slot: 'weapon', stats: { dmg: 3 }, sell: 2 },
  { id: 'sword_stone', name: '돌날 검', desc: '묵직한 한 방.', kind: 'equip', slot: 'weapon', stats: { dmg: 9, str: 1 }, reqLv: 5, sell: 20 },
  { id: 'sword_leaf', name: '잎새 칼', desc: '바람처럼 가볍다.', kind: 'equip', slot: 'weapon', stats: { dmg: 18, agi: 3 }, reqLv: 12, sell: 120 },
  { id: 'hat_moss', name: '이끼 모자', desc: '머리가 시원해진다.', kind: 'equip', slot: 'hat', stats: { def: 2, hp: 10 }, sell: 8 },
  { id: 'armor_log', name: '통나무 갑옷', desc: '조금 뻣뻣하다.', kind: 'equip', slot: 'body', stats: { def: 4, hp: 25 }, reqLv: 4, sell: 25 },
  { id: 'pick_stone', name: '돌 곡괭이', desc: '채광 효율 +2', kind: 'equip', slot: 'pickaxe', stats: { mining: 2 }, sell: 12 },
  { id: 'axe_stone', name: '돌 도끼', desc: '벌목 효율 +2', kind: 'equip', slot: 'axe', stats: { chopping: 2 }, sell: 12 },
];
export const ITEMS: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));

const monsters: MonsterDef[] = [
  { id: 'mossblob', name: '이끼방울', hp: 12, atk: 3, xp: 4, coins: [1, 3], speed: 16, motion: 'hop', radius: 8,
    drops: [{ item: 'moss', chance: 0.5, qty: [1, 1] }] },
  { id: 'pebbler', name: '돌콩이', hp: 46, atk: 8, xp: 12, coins: [3, 7], speed: 22, motion: 'waddle', radius: 8,
    drops: [{ item: 'pebble', chance: 0.45, qty: [1, 2] }] },
  { id: 'leafling', name: '잎새깨비', hp: 130, atk: 16, xp: 30, coins: [8, 15], speed: 28, motion: 'float', radius: 8,
    drops: [{ item: 'leaf', chance: 0.4, qty: [1, 2] }] },
];
export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(monsters.map((m) => [m.id, m]));

const nodes: NodeDef[] = [
  { id: 'oak', name: '참나무', skill: 'chopping', reqLv: 1, hp: 6, xp: 3, item: 'log' },
  { id: 'redrock', name: '붉은돌 광맥', skill: 'mining', reqLv: 1, hp: 8, xp: 4, item: 'ore' },
  { id: 'silvertree', name: '은빛나무', skill: 'chopping', reqLv: 5, hp: 22, xp: 11, item: 'silverlog' },
];
export const NODES: Record<string, NodeDef> = Object.fromEntries(nodes.map((n) => [n.id, n]));

const maps: MapDef[] = [
  { id: 'town', name: '모닥불 마을', width: 520, theme: 'town', platforms: [], spawns: [], nodes: [],
    craftX: 210, portals: [{ x: 496, to: 'meadow', toX: 50 }] },
  { id: 'meadow', name: '이슬 풀밭', width: 820, theme: 'meadow',
    platforms: [{ x: 150, y: -48, w: 170 }, { x: 420, y: -48, w: 210 }, { x: 490, y: -96, w: 130 }],
    spawns: [{ monster: 'mossblob', count: 8 }],
    nodes: [{ node: 'oak', x: 95 }, { node: 'oak', x: 705 }],
    portals: [{ x: 24, to: 'town', toX: 455 }, { x: 796, to: 'hills', toX: 50, reqKills: 15 }] },
  { id: 'hills', name: '자갈 언덕', width: 920, theme: 'hills',
    platforms: [{ x: 110, y: -48, w: 180 }, { x: 370, y: -48, w: 140 }, { x: 570, y: -48, w: 230 }, { x: 630, y: -96, w: 140 }],
    spawns: [{ monster: 'pebbler', count: 7 }, { monster: 'mossblob', count: 2 }],
    nodes: [{ node: 'redrock', x: 330 }, { node: 'redrock', x: 535 }],
    portals: [{ x: 24, to: 'meadow', toX: 765 }, { x: 896, to: 'forest', toX: 50, reqKills: 40 }] },
  { id: 'forest', name: '속삭임 숲', width: 920, theme: 'forest',
    platforms: [{ x: 90, y: -48, w: 220 }, { x: 180, y: -96, w: 110 }, { x: 430, y: -48, w: 160 }, { x: 660, y: -48, w: 190 }],
    spawns: [{ monster: 'leafling', count: 8 }],
    nodes: [{ node: 'silvertree', x: 380 }, { node: 'oak', x: 620 }],
    portals: [{ x: 24, to: 'hills', toX: 865 }] },
];
export const MAPS: Record<string, MapDef> = Object.fromEntries(maps.map((m) => [m.id, m]));

export const RECIPES: RecipeDef[] = [
  { item: 'hat_moss', coins: 20, mats: [['moss', 8]] },
  { item: 'axe_stone', coins: 30, mats: [['pebble', 6], ['log', 3]] },
  { item: 'pick_stone', coins: 30, mats: [['pebble', 6], ['log', 3]] },
  { item: 'sword_stone', coins: 40, mats: [['pebble', 10], ['log', 5]] },
  { item: 'armor_log', coins: 60, mats: [['log', 12], ['moss', 5]] },
  { item: 'sword_leaf', coins: 250, mats: [['leaf', 15], ['ore', 10]] },
];

export const HAIR_COLORS = ['#6b4a3a', '#2f2a3a', '#e8b24a', '#d9574a', '#5aa9e6', '#f2a0c8', '#8fde5d', '#e9e4f0'];
export const SKIN_COLORS = ['#ffd9b8', '#f2bd94', '#c98a5e', '#8a5a3c'];
export const OUTFIT_COLORS = ['#e25d4e', '#4e8de2', '#5fb859', '#f6c945', '#8a6fd1', '#e9e4f0'];
export const HAIR_STYLES = 3;

export const INVENTORY_SIZE = 24;
export const MAX_CHARACTERS = 4;
export const AFK_MIN_SECONDS = 60;
export const AFK_MAX_SECONDS = 12 * 3600;
export const AFK_EFFICIENCY = 0.6;
