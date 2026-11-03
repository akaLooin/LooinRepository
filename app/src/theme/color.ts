// Colour helpers for user-chosen category colours (not tokens).

const HEX6 = /^#[0-9A-F]{6}$/;

/** "#0f8" / "0F8" / "#00ff88" -> "#00FF88", or null when it is not a colour code. */
export function normalizeHex(input: string): string | null {
  let s = input.trim().toUpperCase();
  if (!s.startsWith("#")) s = "#" + s;
  if (/^#[0-9A-F]{3}$/.test(s)) s = "#" + [...s.slice(1)].map((c) => c + c).join("");
  return HEX6.test(s) ? s : null;
}

function channel(c: number) {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function rgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function luminance(hex: string) {
  const [r, g, b] = rgb(hex).map(channel);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Check mark / number colour on top of a category colour: white when it reads (3:1), else black. */
export function onColor(hex: string) {
  return contrast("#FFFFFF", hex) >= 3 ? "#FFFFFF" : "#000000";
}

function toHex([r, g, b]: number[]) {
  return "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("").toUpperCase();
}

/** Category colour as text on a background: darken or lighten the same hue until it reaches `min`. */
export function readableOn(hex: string, bg: string, min = 4.5) {
  if (contrast(hex, bg) >= min) return hex;
  const towards = luminance(bg) > 0.5 ? 0 : 255;
  const base = rgb(hex);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const mixed = toHex(base.map((c) => c + (towards - c) * t));
    if (contrast(mixed, bg) >= min) return mixed;
  }
  return towards === 0 ? "#000000" : "#FFFFFF";
}

/** A category colour that would vanish on this background (white on white) falls back to `fallback`. */
export function visibleOn(hex: string, bg: string, fallback: string) {
  return contrast(hex, bg) < 1.15 ? fallback : hex;
}
