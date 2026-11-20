// Renders icon.svg into the PNGs Android needs (run: node assets/libmark/render.js). Admin app: orange ribbon.
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
(async () => {
  const dir = __dirname;
  const svg = fs.readFileSync(path.join(dir, "icon.svg"), "utf8");
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
  const shot = async (name, markup, transparent) => {
    await p.setContent(`<html><body style="margin:0;background:transparent">${markup}</body></html>`);
    await p.screenshot({ path: path.join(dir, name), omitBackground: transparent, clip: { x: 0, y: 0, width: 1024, height: 1024 } });
  };
  const variants = { "": svg, "admin-": svg.replace(/#00ff7f/g, "#ff9f0a").replace(/#00c864/g, "#e07b00").replace(/#00a956/g, "#b85f00") };
  for (const [pre, s] of Object.entries(variants)) {
    await shot(`${pre}icon.png`, s, false);
    // adaptive icon: the mark alone, shrunk into the 66% safe zone, on a transparent layer; the dark background separately
    const fg = s.replace('<g id="bgLayer"><rect width="1024" height="1024" fill="url(#bg)"/></g>', "")
      .replace('<g id="mark" filter="url(#shadow)">', '<g id="mark" filter="url(#shadow)" transform="translate(512 512) scale(0.88) translate(-512 -506)">');
    await shot(`${pre}adaptive-foreground.png`, fg, true);
  }
  await shot("adaptive-background.png", '<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17201c"/><stop offset="1" stop-color="#0a0d0c"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/></svg>', false);
  // themed (monochrome) icon: one-colour silhouette of the note and ribbon
  await shot("adaptive-monochrome.png", `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
    <defs><mask id="cut"><rect width="1024" height="1024" fill="#fff"/>
      <path d="M574 180 h128 v350 l-64 -54 l-64 54 z" fill="#000"/>
      <path d="M430 330 C440 372 452 384 494 394 C452 404 440 416 430 458 C420 416 408 404 366 394 C408 384 420 372 430 330 Z" fill="#000"/>
      <rect x="384" y="550" width="250" height="20" rx="10" fill="#000"/><rect x="384" y="640" width="200" height="20" rx="10" fill="#000"/>
    </mask></defs>
    <g transform="translate(512 512) scale(0.88) translate(-512 -506)" fill="#fff">
      <rect x="262" y="236" width="500" height="580" rx="44" mask="url(#cut)"/>
      <path d="M590 196 h96 v300 l-48 -42 l-48 42 z"/>
    </g></svg>`, true);
  await b.close();
  console.log("rendered");
})();
