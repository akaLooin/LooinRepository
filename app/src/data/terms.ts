// In-game terms. Every UI label that names a game concept reads from here, so the admin panel can rename them.
export const TERMS = {
  gameTitle: '테일즈토피아 타이쿤',
  coin: '금화',
  mana: '영감',
  gem: '전설',
  fc: '이야기 조각',
  fcShort: '조각',
  assistant: '견습생',
  ruby: '별사탕',
  abdicate: '다시 쓰기',
  reincarnate: '새 시리즈',
  reincarnationPower: '시리즈의 힘',
  exchange: '출판 계약',
  trophy: '명장면',
  challenge: '특별 원고',
  research: '집필 연구',
  researchPoint: '집필 포인트',
  excavation: '서고 탐사',
  artifact: '유물',
  heritage: '유산',
  bloodline: '혈통',
  alignment: '성향',
  faction: '진영',
  scry: '점술',
  shop: '상점',
  autocast1: '1순위',
  autocast2: '2순위',
  tabBuildings: '건물',
  tabUpgrades: '개선',
  tabExplore: '탐사',
  tabTrophies: '명장면',
  tabChallenges: '도전',
  tabEvents: '이벤트',
  tabStats: '기록',
  buyAll: '모두 구매',
  alignBright: '밝은 이야기',
  alignDark: '어두운 이야기',
  alignLegend: '옛 전설',
};
export type TermKey = keyof typeof TERMS;
export const TERM_LABELS: Record<TermKey, string> = {
  gameTitle: '게임 이름', coin: '기본 화폐', mana: '마나', gem: '퇴위 화폐(보석)', fc: '진영 코인', fcShort: '진영 코인 (짧게)', assistant: '조수', ruby: '루비(프리미엄)',
  abdicate: '퇴위', reincarnate: '환생', reincarnationPower: '환생의 힘', exchange: '왕실 교환', trophy: '업적', challenge: '도전', research: '연구',
  researchPoint: '연구 포인트', excavation: '발굴', artifact: '유물', heritage: '유산', bloodline: '혈통', alignment: '성향', faction: '진영',
  scry: '점술', shop: '상점', autocast1: '자동 시전 1순위', autocast2: '자동 시전 2순위', tabBuildings: '탭: 건물', tabUpgrades: '탭: 업그레이드',
  tabExplore: '탭: 발굴', tabTrophies: '탭: 업적', tabChallenges: '탭: 도전', tabEvents: '탭: 이벤트', tabStats: '탭: 통계', buyAll: '모두 구매 버튼',
  alignBright: '선 성향', alignDark: '악 성향', alignLegend: '중립 성향',
};
export const t = (k: TermKey) => TERMS[k];

/** Replaces {term} tokens in any text with the current term (data and UI strings use these tokens). */
export function tr(s: string): string {
  return s.indexOf('{') < 0 ? s : s.replace(/\{(\w+)\}/g, (m, k: string) => (k in TERMS ? TERMS[k as TermKey] : m));
}

const ATTRS = ['title', 'alt', 'aria-label', 'placeholder'];
/** Keeps every {term} token under `root` translated, whatever code renders it. */
export function watchTerms(root: Node) {
  const fixText = (n: Node) => { if (n.nodeValue && n.nodeValue.includes('{')) { const v = tr(n.nodeValue); if (v !== n.nodeValue) n.nodeValue = v; } };
  const fixEl = (el: Element) => { for (const a of ATTRS) { const v = el.getAttribute(a); if (v && v.includes('{')) el.setAttribute(a, tr(v)); } };
  const walk = (n: Node) => {
    if (n.nodeType === Node.TEXT_NODE) { fixText(n); return; }
    if (n.nodeType !== Node.ELEMENT_NODE) return;
    fixEl(n as Element);
    const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    for (let c = w.nextNode(); c; c = w.nextNode()) c.nodeType === Node.TEXT_NODE ? fixText(c) : fixEl(c as Element);
  };
  walk(root);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixEl(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
