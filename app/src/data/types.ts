export type Alignment = 'bright' | 'dark' | 'legend';
export type FactionId =
  | 'woodland' | 'minstrel' | 'starmage'
  | 'thieves' | 'ghost' | 'witch'
  | 'pirate' | 'sage' | 'puppet'
  | 'clockmaker' | 'shadow' | 'phoenix'
  | 'freelancer';
export type CoinType = 'woodland' | 'minstrel' | 'starmage' | 'thieves' | 'ghost' | 'witch' | 'clockmaker' | 'shadow';
export const VANILLA_COINS: CoinType[] = ['woodland', 'minstrel', 'starmage', 'thieves', 'ghost', 'witch'];
export const COIN_TYPES: CoinType[] = [...VANILLA_COINS, 'clockmaker', 'shadow'];
