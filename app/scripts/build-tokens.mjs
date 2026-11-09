// Generates CSS custom properties from replica/design/tokens.json.
import { readFileSync, writeFileSync } from 'node:fs';
const src = new URL('../../replica/design/tokens.json', import.meta.url);
const t = JSON.parse(readFileSync(src, 'utf8'));
const lines = [':root {'];
for (const [k, v] of Object.entries(t.color)) lines.push(`  --c-${k}: ${v};`);
for (const [k, v] of Object.entries(t.font)) if (!k.startsWith('_')) lines.push(`  --font-${k}: ${v};`);
for (const [k, v] of Object.entries(t.type)) {
  lines.push(`  --t-${k}-size: ${v.size}px;`, `  --t-${k}-line: ${v.line}px;`, `  --t-${k}-weight: ${v.weight};`, `  --t-${k}-font: var(--font-${v.font});`);
}
t.space.forEach((v, i) => lines.push(`  --s-${i}: ${v}px;`));
for (const [k, v] of Object.entries(t.radius)) lines.push(`  --r-${k}: ${v}px;`);
for (const [k, v] of Object.entries(t['border-width'])) lines.push(`  --bw-${k}: ${v}px;`);
for (const [k, v] of Object.entries(t.shadow)) lines.push(`  --sh-${k}: ${v};`);
for (const [k, v] of Object.entries(t.motion)) lines.push(`  --m-${k}: ${v};`);
for (const [k, v] of Object.entries(t.layout)) if (typeof v === 'number') lines.push(`  --l-${k}: ${v}px;`); else if (/^\d+vh$/.test(v)) lines.push(`  --l-${k}: ${v};`);
lines.push('}', '');
const css = '/* Generated from replica/design/tokens.json by scripts/build-tokens.mjs. Do not edit by hand. */\n' + lines.join('\n');
writeFileSync(new URL('../src/styles/tokens.css', import.meta.url), css);
writeFileSync(new URL('../../replica/design/tokens.css', import.meta.url), css);
console.log('tokens.css written');
