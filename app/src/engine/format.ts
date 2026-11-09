import Decimal from 'break_infinity.js';
import type { NumberFormat } from './state';

const BASIC = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No'];
const UNITS = ['', 'U', 'D', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'O', 'N'];
const TENS = ['', 'Dc', 'Vg', 'Tg', 'Qag', 'Qig', 'Sxg', 'Spg', 'Ocg', 'Ng'];
const HUNDREDS = ['', 'Ce', 'DCe', 'TCe', 'QaCe', 'QiCe', 'SxCe', 'SpCe', 'OCe', 'NCe'];

/** Short-scale suffix for 1000^tier (tier 1 = K). Latin-style names past No. */
export function suffix(tier: number): string {
  if (tier < BASIC.length) return BASIC[tier];
  const n = tier - 1; // 1e33 = Dc -> n = 10
  return UNITS[n % 10] + TENS[Math.floor(n / 10) % 10] + HUNDREDS[Math.floor(n / 100) % 10];
}

export function fmt(v: Decimal | number, style: NumberFormat = 'short'): string {
  const d = v instanceof Decimal ? v : new Decimal(v);
  if (d.lt(0)) return '-' + fmt(d.neg(), style);
  if (d.lt(1000)) { const n = d.toNumber(); return n < 100 && n % 1 ? n.toFixed(n < 10 ? 2 : 1) : Math.floor(n).toString(); }
  const e = Math.floor(d.log10());
  if (style === 'scientific' || e >= 3003) return d.mantissa.toFixed(2) + 'e' + d.exponent;
  const tier = Math.floor(e / 3);
  const v3 = d.div(Decimal.pow(10, tier * 3)).toNumber();
  return (v3 >= 100 ? v3.toFixed(1) : v3.toFixed(2)) + ' ' + suffix(tier);
}

export function fmtTime(sec: number): string {
  sec = Math.floor(sec);
  const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  if (d) return `${d}일 ${h}시간`;
  if (h) return `${h}시간 ${m}분`;
  if (m) return `${m}분 ${x}초`;
  return `${x}초`;
}
