import { describe, expect, it } from 'vitest';
import { CLIPS, FH, FW, ROOT_Y, bakeClip } from '../src/render/mannequin';

describe('mannequin frames', () => {
  it('bakes every clip with drawn pixels and finite anchors', () => {
    for (const name of Object.keys(CLIPS)) {
      const c = bakeClip(name);
      expect(c.body.length).toBe(CLIPS[name].frames);
      for (let f = 0; f < c.frames; f++) {
        expect(c.body[f].some((t) => t >= 0)).toBe(true);
        const a = c.anchors[f];
        for (const v of [...a.hand, ...a.head, a.wpn]) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
  it('keeps the figure inside the frame and standing on the root line', () => {
    const idle = bakeClip('idle').body[0];
    let top = FH, bottom = 0;
    idle.forEach((t, i) => { if (t >= 0) { const y = Math.floor(i / FW); top = Math.min(top, y); bottom = Math.max(bottom, y); } });
    expect(top).toBeGreaterThan(0);
    expect(Math.abs(bottom - ROOT_Y)).toBeLessThanOrEqual(1);
    // 모든 프레임이 가장자리에 닿지 않는다(잘림 없음)
    for (const name of Object.keys(CLIPS)) for (const layer of [...bakeClip(name).body, ...bakeClip(name).front]) {
      layer.forEach((t, i) => { if (t >= 0) { const x = i % FW, y = Math.floor(i / FW); expect(x > 0 && x < FW - 1 && y > 0 && y < FH - 1).toBe(true); } });
    }
  });
});
