import { describe, it, expect } from 'vitest';
import { SPRITES, PALETTE } from '../src/art/sprites';

describe('sprites', () => {
  for (const [name, rows] of Object.entries(SPRITES)) {
    it(`${name} is 16x16 and uses known colours`, () => {
      expect(rows.length).toBe(16);
      rows.forEach((r) => expect(r.length, `${name} row "${r}"`).toBe(16));
      for (const ch of rows.join('')) if (ch !== '.') expect(PALETTE[ch], `${name} char ${ch}`).toBeDefined();
    });
  }
});
