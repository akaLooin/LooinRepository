// Art gallery: realm map + every building at every level, scaled x3 with crisp pixels.
import { BUILDING_ART, buildingSprite } from './art/buildings';
import { renderMap } from './art/map';
const root = document.getElementById('root')!;
root.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;padding:12px;color:#ccc;font:12px monospace';
const params = new URLSearchParams(location.search);
const ids = ['c1', 'c2', 'c3', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9', 'b10', 'c11'];
const align = params.get('a') ?? 'b';
const owned = ids.map((id, i) => ({ id: i >= 3 && i < 10 ? align + id.slice(1) : id, tier: i + 1, count: [150, 80, 40, 30, 20, 12, 8, 5, 3, 1, 1][i] }));
const map = renderMap(params.has('empty') ? [] : owned);
map.style.cssText = `width:${map.width * 3}px;height:${map.height * 3}px;image-rendering:pixelated`;
root.append(map);
if (!params.has('maponly')) for (const id of Object.keys(BUILDING_ART)) {
  for (let lv = 0; lv < 3; lv++) {
    const { r } = buildingSprite(id, lv);
    const c = r.toCanvas();
    c.style.cssText = `width:${r.w * 3}px;height:${r.h * 3}px;image-rendering:pixelated;background:#3f6a3a`;
    const f = document.createElement('figure'); f.style.margin = '0';
    f.append(c, Object.assign(document.createElement('figcaption'), { textContent: id + ' lv' + lv }));
    root.append(f);
  }
}
