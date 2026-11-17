// 메뉴 아이콘: 직접 그린 12x12 픽셀 도안을 SVG로 만든다(원작 아이콘을 쓰지 않음).
// 글자 의미: o 외곽선, a 주색, b 보조색, c 밝은 점. 색은 currentColor 계열로 둬서 버튼 글자색을 따른다.
const ART: Record<string, string[]> = {
  auto: ['....oooo....', '..oo....oo..', '.o..aaaa..o.', '.o.a....a.o.', 'o.a..oo..a.o', 'o.a.oaao.a.o', 'o.a.oaao.a.o', 'o.a..oo..a.o', '.o.a....a.oo', '.o..aaaa..oa', '..oo....oooo', '....oooo....'],
  attacks: ['..........oo', '.........oco', '........oco.', '.......oco..', '......oco...', '.oo..oco....', '.oaooco.....', '..oaaoo.....', '...oao......', '..oaoao.....', '.oao.oao....', '.oo...oo....'],
  items: ['...oooooo...', '..oaaaaaao..', '.oaoooooaao.', '.oao....oao.', 'oooooooooooo', 'oaaaaaaaaaao', 'oabbbbbbbbao', 'oabbbccbbbao', 'oabbbccbbbao', 'oabbbbbbbbao', 'oaaaaaaaaaao', 'oooooooooooo'],
  talents: ['.....oo.....', '....oaao....', '....oaao....', 'oooooaaooooo', 'oaaaaccaaaao', '.oaaaccaaao.', '..oaaaaaao..', '..oaaaaaao..', '.oaaaoaaaao.', '.oaao..oaao.', 'oaao....oaao', 'ooo......ooo'],
  codex: ['.oooooooooo.', 'oaaaaoaaaaao', 'oabbaoabbbao', 'oaaaaoaaaaao', 'oabbaoabbbao', 'oaaaaoaaaaao', 'oabbaoabbbao', 'oaaaaoaaaaao', 'oabbaoabbbao', 'oaaaaoaaaaao', 'oooooooooooo', '.....oo.....'],
  map: ['oooo....oooo', 'oaaooooooaao', 'oaaoaaaaoaao', 'oaaoaacaoaao', 'oaoaaacccaao', 'oaoaaaacaaao', 'oaaoaaaaoaao', 'oaaoaaaaoaao', 'oaaoaaaaoaao', 'oaaoooooooao', 'oooo....oooo', '............'],
  chat: ['............', '.oooooooooo.', 'oaaaaaaaaaao', 'oacacacaaaao', 'oaaaaaaaaaao', 'oacacacacaao', 'oaaaaaaaaaao', '.oooaaoooooo', '...oao......', '...oo.......', '............', '............'],
  menu: ['............', 'oooooooooooo', 'oaaaaaaaaaao', 'oooooooooooo', '............', 'oooooooooooo', 'oaaaaaaaaaao', 'oooooooooooo', '............', 'oooooooooooo', 'oaaaaaaaaaao', 'oooooooooooo'],
  shop: ['.oooooooooo.', 'oaoaoaoaoaao', 'oooooooooooo', '.obbbbbbbbo.', '.obooobooob.', '.obocobocob.', '.obooobooob.', '.obbbbbbbbo.', '.obbooobbbo.', '.obbocobbbo.', '.obbocobbbo.', 'oooooooooooo'],
};
const FILL: Record<string, string> = { o: '#1c1322', a: 'currentColor', b: '#8f7fa8', c: '#ffe98a' };

export function pixelIcon(name: string): string {
  const rows = ART[name] ?? ART.menu;
  let rects = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const f = FILL[row[x]];
      if (f) rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${f}"/>`;
    }
  });
  return `<svg class="px" viewBox="0 0 12 12" aria-hidden="true">${rects}</svg>`;
}
