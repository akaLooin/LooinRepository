// Exports launcher icons and splash screens into the Android project. Needs `vite preview` on :4173.
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const RES = path.join(__dirname, '../android/app/src/main/res');
const save = (file, url) => fs.writeFileSync(file, Buffer.from(url.split(',')[1], 'base64'));
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://localhost:4173/icon.html'); await p.waitForFunction(() => window.icons);
  const icons = await p.evaluate(() => window.icons);
  const dens = { mdpi: [48, 108], hdpi: [72, 162], xhdpi: [96, 216], xxhdpi: [144, 324], xxxhdpi: [192, 432] };
  for (const [d, [n, fg]] of Object.entries(dens)) {
    save(`${RES}/mipmap-${d}/ic_launcher.png`, icons['sq' + n]);
    save(`${RES}/mipmap-${d}/ic_launcher_round.png`, icons['rd' + n]);
    save(`${RES}/mipmap-${d}/ic_launcher_foreground.png`, icons['fg' + fg]);
  }
  fs.mkdirSync(path.join(__dirname, '../store'), { recursive: true });
  save(path.join(__dirname, '../store/icon-512.png'), icons.square512);
  // splash screens: keep each file's existing size
  for (const dir of fs.readdirSync(RES).filter((x) => x.startsWith('drawable'))) {
    const f = `${RES}/${dir}/splash.png`; if (!fs.existsSync(f)) continue;
    const buf = fs.readFileSync(f); const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20);
    save(f, await p.evaluate(([w, h]) => window.splash(w, h), [w, h]));
  }
  await b.close(); console.log('icons and splash exported');
})();
