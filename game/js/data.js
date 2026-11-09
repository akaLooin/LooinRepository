/* Talestopia Tycoon — game data (all names, numbers and text are original). */
(function (root) {
  'use strict';

  // 11 buildings. cost = base cost, cps = base coins per second per building.
  var BUILDINGS = [
    { id: 'bard',      icon: '🪕', ko: '떠돌이 이야기꾼', en: 'Wandering Storyteller', cost: 10,     cps: 0.2,   tier: 1, desc: '마을 광장에서 옛이야기를 들려주고 동전을 받아요.' },
    { id: 'mushroom',  icon: '🍄', ko: '버섯 오두막',     en: 'Mushroom Cottage',      cost: 120,    cps: 1.5,   tier: 2, desc: '숲속 작은 이웃들이 이야기를 사러 와요.' },
    { id: 'candy',     icon: '🍬', ko: '과자 공방',       en: 'Candy Workshop',        cost: 1.4e3,  cps: 9,     tier: 3, desc: '달콤한 과자집 모형이 날개 돋친 듯 팔려요.' },
    { id: 'beanstalk', icon: '🌱', ko: '콩나무 농장',     en: 'Beanstalk Farm',        cost: 1.6e4,  cps: 50,    tier: 4, desc: '하늘까지 자라는 콩나무에서 황금 꼬투리를 거둬요.' },
    { id: 'clock',     icon: '🕰️', ko: '자정의 시계탑',   en: 'Midnight Clocktower',   cost: 2e5,    cps: 280,   tier: 5, desc: '열두 시 종이 울릴 때마다 마법이 풀려 동전이 쏟아져요.' },
    { id: 'library',   icon: '📚', ko: '마법 도서관',     en: 'Enchanted Library',     cost: 2.5e6,  cps: 1600,  tier: 6, desc: '책장 사이로 아직 쓰이지 않은 이야기가 흘러나와요.' },
    { id: 'harbor',    icon: '⛵', ko: '구름 항구',       en: 'Cloud Harbor',          cost: 3.2e7,  cps: 9500,  tier: 7, desc: '하늘을 나는 배들이 먼 나라의 이야기를 실어 와요.' },
    { id: 'hoard',     icon: '🐉', ko: '용의 보물고',     en: "Dragon's Vault",        cost: 4e8,    cps: 6e4,   tier: 8, desc: '은퇴한 용이 보물을 빌려주고 이자를 받아요.' },
    { id: 'theater',   icon: '🎭', ko: '별빛 극장',       en: 'Starlight Theater',     cost: 5.5e9,  cps: 4e5,   tier: 9, desc: '별들이 배우가 되어 매일 밤 새 공연을 올려요.' },
    { id: 'mirror',    icon: '🪞', ko: '거울 미궁',       en: 'Mirror Labyrinth',      cost: 7.5e10, cps: 2.8e6, tier: 10, desc: '거울마다 다른 결말이 비쳐 관람객이 끊이지 않아요.' },
    { id: 'taletree',  icon: '🌳', ko: '이야기의 나무',   en: 'Great Tale Tree',       cost: 1e12,   cps: 2e7,   tier: 11, desc: '세상 모든 이야기가 열매로 맺히는 전설의 나무.' }
  ];

  var COST_GROWTH = 1.14;
  var MILESTONES = [10, 25, 50, 100, 150, 200]; // per-building x2 upgrades

  // Story genres (chosen once per edition, i.e. per prestige run).
  var GENRES = [
    { id: 'hero',      icon: '⚔️', color: '#d9534f', ko: '영웅담', en: 'Heroic Saga',
      passive: '책 두드리기 위력 x3, 두드릴 때마다 초당 생산량의 2%를 추가로 얻어요.',
      spell: { id: 'roar', ko: '용사의 함성', cost: 40, duration: 20, desc: '20초 동안 두드리기 위력 x10' } },
    { id: 'romance',   icon: '💞', color: '#e07bb5', ko: '로맨스', en: 'Romance',
      passive: '보유한 건물 종류마다 전체 생산 +8%.',
      spell: { id: 'fate', ko: '운명의 만남', cost: 50, duration: 30, desc: '30초 동안 전체 생산 x2' } },
    { id: 'mystery',   icon: '🔍', color: '#6c63c7', ko: '미스터리', en: 'Mystery',
      passive: '두드리기 15% 확률로 단서 발견: 위력 x20.',
      spell: { id: 'clue', ko: '결정적 단서', cost: 60, duration: 0, desc: '즉시 90초 분량의 생산량을 얻어요.' } },
    { id: 'fable',     icon: '🐢', color: '#4caf7a', ko: '우화', en: 'Fable',
      passive: '1~3단계 건물 생산 x5.',
      spell: { id: 'ant', ko: '부지런한 개미', cost: 45, duration: 30, desc: '30초 동안 1~3단계 건물 생산 x10' } },
    { id: 'ghost',     icon: '🕯️', color: '#5a6b7d', ko: '괴담', en: 'Ghost Story',
      passive: '이번 판에서 흐른 1분마다 생산 +1% (최대 +300%).',
      spell: { id: 'midnight', ko: '자정의 종소리', cost: 70, duration: 15, desc: '15초 동안 전체 생산 x4' } },
    { id: 'adventure', icon: '🗺️', color: '#e0a03a', ko: '모험기', en: 'Adventure Tale',
      passive: '모든 건물 가격 -20%.',
      spell: { id: 'map', ko: '보물 지도', cost: 55, duration: 0, desc: '보유 금화의 15%를 즉시 얻어요 (최대 10분 생산량).' } }
  ];
  var GENRE_UNLOCK = 5e4; // coins earned this edition before a genre can be chosen

  // Genre-specific upgrades (bought with coins after picking the genre).
  var GENRE_UPGRADES = [
    { id: 'hero1', genre: 'hero', ko: '전설의 검', cost: 2e5, effect: { click: 2 }, desc: '두드리기 위력 x2' },
    { id: 'hero2', genre: 'hero', ko: '동료의 맹세', cost: 5e7, effect: { clickCps: 0.03 }, desc: '두드릴 때 초당 생산량의 3% 추가' },
    { id: 'hero3', genre: 'hero', ko: '마왕의 몰락', cost: 2e10, effect: { global: 1.5 }, desc: '전체 생산 x1.5' },
    { id: 'romance1', genre: 'romance', ko: '첫 편지', cost: 2e5, effect: { global: 1.3 }, desc: '전체 생산 x1.3' },
    { id: 'romance2', genre: 'romance', ko: '무도회의 밤', cost: 5e7, effect: { synergy: 0.04 }, desc: '건물 종류당 보너스 +4%p' },
    { id: 'romance3', genre: 'romance', ko: '영원한 약속', cost: 2e10, effect: { global: 1.5 }, desc: '전체 생산 x1.5' },
    { id: 'mystery1', genre: 'mystery', ko: '돋보기', cost: 2e5, effect: { critChance: 0.05 }, desc: '단서 확률 +5%p' },
    { id: 'mystery2', genre: 'mystery', ko: '탐정의 수첩', cost: 5e7, effect: { critMult: 2 }, desc: '단서 위력 x2' },
    { id: 'mystery3', genre: 'mystery', ko: '밀실의 비밀', cost: 2e10, effect: { global: 1.5 }, desc: '전체 생산 x1.5' },
    { id: 'fable1', genre: 'fable', ko: '토끼와 거북', cost: 2e5, effect: { lowTier: 2 }, desc: '1~3단계 건물 생산 x2 추가' },
    { id: 'fable2', genre: 'fable', ko: '여우와 포도', cost: 5e7, effect: { global: 1.3 }, desc: '전체 생산 x1.3' },
    { id: 'fable3', genre: 'fable', ko: '황금알 거위', cost: 2e10, effect: { global: 1.5 }, desc: '전체 생산 x1.5' },
    { id: 'ghost1', genre: 'ghost', ko: '삐걱이는 계단', cost: 2e5, effect: { ghostRate: 0.5 }, desc: '시간 보너스 증가 속도 +50%' },
    { id: 'ghost2', genre: 'ghost', ko: '빈 초상화', cost: 5e7, effect: { global: 1.3 }, desc: '전체 생산 x1.3' },
    { id: 'ghost3', genre: 'ghost', ko: '끝나지 않는 밤', cost: 2e10, effect: { ghostCap: 2 }, desc: '시간 보너스 최대치 +200%p' },
    { id: 'adventure1', genre: 'adventure', ko: '낡은 나침반', cost: 2e5, effect: { discount: 0.05 }, desc: '건물 가격 추가 -5%' },
    { id: 'adventure2', genre: 'adventure', ko: '용감한 선원', cost: 5e7, effect: { global: 1.3 }, desc: '전체 생산 x1.3' },
    { id: 'adventure3', genre: 'adventure', ko: '세계 일주', cost: 2e10, effect: { global: 1.5 }, desc: '전체 생산 x1.5' }
  ];

  // Click upgrades: each adds a share of cps to every tap.
  var CLICK_UPGRADES = [
    { id: 'quill1', ko: '깃펜', cost: 100, clickCps: 0.01, desc: '두드릴 때 초당 생산량의 1% 추가' },
    { id: 'quill2', ko: '은빛 잉크', cost: 1e4, clickCps: 0.01, desc: '두드릴 때 초당 생산량의 1% 추가' },
    { id: 'quill3', ko: '금박 표지', cost: 1e6, clickCps: 0.02, desc: '두드릴 때 초당 생산량의 2% 추가' },
    { id: 'quill4', ko: '살아있는 삽화', cost: 1e8, clickCps: 0.02, desc: '두드릴 때 초당 생산량의 2% 추가' },
    { id: 'quill5', ko: '말하는 책', cost: 1e10, clickCps: 0.04, desc: '두드릴 때 초당 생산량의 4% 추가' }
  ];

  // Highlights (achievements). Each one: +1% global production.
  var HIGHLIGHTS = [
    { id: 'tap1',    ko: '첫 장을 넘기다',    desc: '책을 1번 두드리기',        check: function (s) { return s.stats.clicks >= 1; } },
    { id: 'tap500',  ko: '손끝의 마법',       desc: '책을 500번 두드리기',      check: function (s) { return s.stats.clicks >= 500; } },
    { id: 'tap5k',   ko: '닳아버린 표지',     desc: '책을 5,000번 두드리기',    check: function (s) { return s.stats.clicks >= 5000; } },
    { id: 'b10',     ko: '작은 마을',         desc: '건물 10채 보유',            check: function (s, E) { return E.totalBuildings(s) >= 10; } },
    { id: 'b100',    ko: '이야기 도시',       desc: '건물 100채 보유',           check: function (s, E) { return E.totalBuildings(s) >= 100; } },
    { id: 'b500',    ko: '테일즈토피아',      desc: '건물 500채 보유',           check: function (s, E) { return E.totalBuildings(s) >= 500; } },
    { id: 'all',     ko: '모든 이야기의 주인', desc: '11종 건물을 모두 1채 이상', check: function (s) { return BUILDINGS.every(function (b) { return (s.buildings[b.id] || 0) > 0; }); } },
    { id: 'c1m',     ko: '백만장자 이야기꾼', desc: '이번 판에서 금화 100만 벌기', check: function (s) { return s.runEarned >= 1e6; } },
    { id: 'c1b',     ko: '억만장자 이야기꾼', desc: '이번 판에서 금화 10억 벌기', check: function (s) { return s.runEarned >= 1e9; } },
    { id: 'c1t',     ko: '전설의 부호',       desc: '이번 판에서 금화 1조 벌기',  check: function (s) { return s.runEarned >= 1e12; } },
    { id: 'genre',   ko: '장르를 정하다',     desc: '처음으로 장르 선택',        check: function (s) { return !!s.genre; } },
    { id: 'spell1',  ko: '영감이 떠올랐다',   desc: '주문을 1번 사용',           check: function (s) { return s.stats.spells >= 1; } },
    { id: 'spell50', ko: '영감의 샘',         desc: '주문을 50번 사용',          check: function (s) { return s.stats.spells >= 50; } },
    { id: 'rw1',     ko: '개정판',            desc: '처음으로 다시 쓰기',        check: function (s) { return s.rewrites >= 1; } },
    { id: 'rw10',    ko: '스테디셀러',        desc: '10번 다시 쓰기',            check: function (s) { return s.rewrites >= 10; } },
    { id: 'leg100',  ko: '살아있는 전설',     desc: '전설 100개 보유',           check: function (s) { return s.legends >= 100; } }
  ];

  var CONFIG = {
    baseClick: 1,
    manaBase: 100,
    manaPerLegend: 1,
    manaRegen: 0.5,          // per second
    legendBonus: 0.02,       // +2% production per Legend
    highlightBonus: 0.01,    // +1% per Highlight
    legendDivisor: 1e9,      // legends = floor(sqrt(lifetime / divisor))
    offlineRate: 0.5,        // offline earns 50%
    offlineCapSec: 24 * 3600,
    tickMs: 100,
    autosaveMs: 10000,
    saveKey: 'talestopia-tycoon-save-v1'
  };

  var DATA = {
    BUILDINGS: BUILDINGS, COST_GROWTH: COST_GROWTH, MILESTONES: MILESTONES,
    GENRES: GENRES, GENRE_UNLOCK: GENRE_UNLOCK, GENRE_UPGRADES: GENRE_UPGRADES,
    CLICK_UPGRADES: CLICK_UPGRADES, HIGHLIGHTS: HIGHLIGHTS, CONFIG: CONFIG
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.TT_DATA = DATA;
})(this);
