// Talestopia Tycoon — save data shape (the "schema" of an offline game).
// Big numbers are stored as strings and loaded into Decimal (break_infinity.js).

export type Big = string; // e.g. "1.23e45"
export type Alignment = 'bright' | 'dark' | 'legend'; // good / evil / neutral roles
export type FactionId =
  | 'woodland' | 'minstrel' | 'starmage'   // bright: assistants&low tiers / clicks&coins / mana&spells
  | 'thieves' | 'ghost' | 'witch'          // dark:   cheap buildings&gold / time&offline / high tiers&trophies
  | 'pirate' | 'sage' | 'puppet'           // legend: pairs (starmage+thieves) (minstrel+witch) (woodland+ghost)
  | 'clockmaker' | 'shadow' | 'phoenix'    // prestige bright / dark / legend
  | 'freelancer';                          // mercenary role
export type CoinType = 'woodland' | 'minstrel' | 'starmage' | 'thieves' | 'ghost' | 'witch' | 'clockmaker' | 'shadow';
export type AutocastTier = 'off' | 'silver' | 'gold';

export interface SaveV1 {
  meta: { version: 1; createdAt: number; lastSeen: number };

  // reset on abdication
  run: {
    coins: Big;
    coinsThisRun: Big;          // drives gem gain: total coins = n(n+1)*5e11
    mana: number;
    buildings: Record<string, number>;       // building id -> owned
    upgrades: string[];                      // purchased upgrade ids
    alignment: Alignment | null;
    faction: FactionId | null;
    prestigeFaction: FactionId | null;
    activeSpells: Record<string, number>;    // spell id -> ends at (ms)
    autocast: Record<string, AutocastTier>;
    autocastThreshold: number;               // 0..1 of max mana
    royalExchanges: Partial<Record<CoinType, number>>;
    startedAt: number;
    stats: { clicks: number; coinsByClicking: Big; spellsCast: number; coinsFound: number };
  };

  factionCoins: Partial<Record<CoinType, Big>>;
  gems: Big;
  rubies: number;

  reincarnation: { count: number; bloodline: FactionId | null; ascension: number };
  trophies: string[];
  unlocks: { factions: FactionId[]; challengesDone: string[] };
  excavation: { depth: number; maxDepth: number; artifacts: string[] };
  research: { points: Big; slots: Record<string, string | null> };
  premium: { purchases: string[] };

  stats: {
    totalCoins: Big;
    totalClicks: number;
    abdications: number;
    timePlayedSec: number;
    timeOfflineSec: number;
    alliedWith: Partial<Record<FactionId, number>>;
  };

  settings: {
    numberFormat: 'short' | 'scientific' | 'engineering';
    buyAllUpgrades: boolean;
    buyAllExchanges: boolean;
    hidePurchasedUpgrades: boolean;
    sortUpgradesByPrice: boolean;
    sound: number; music: number;
    language: 'ko' | 'en';
  };
}
