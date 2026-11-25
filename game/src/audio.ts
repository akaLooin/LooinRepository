// 효과음·배경음. 음원 파일 없이 Web Audio 로 만든다(직접 만든 소리와 곡이라 저작권 걱정이 없다).
// 브라우저·안드로이드 WebView 는 사용자가 한 번 터치해야 소리를 낼 수 있어, 첫 터치 때 켠다.
import { Music } from './music';

export type Sfx = 'hit' | 'crit' | 'miss' | 'hurt' | 'coin' | 'item' | 'level' | 'chop' | 'mine' | 'slam' | 'click' | 'heal' | 'skill'
  | 'open' | 'portal' | 'quest' | 'card' | 'craft' | 'warn' | 'buy' | 'fail' | 'kill';
const PREF = 'looin-idle-audio-v1';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private last: Partial<Record<Sfx, number>> = {};
  private mus: Music | null = null;
  sfxOn = true; bgmOn = true;

  constructor() {
    try { const p = JSON.parse(localStorage.getItem(PREF) ?? '{}'); this.sfxOn = p.sfx ?? true; this.bgmOn = p.bgm ?? true; } catch { /* 기본값 */ }
    const start = () => { this.unlock(); removeEventListener('pointerdown', start); };
    addEventListener('pointerdown', start);
  }
  private unlock() {
    if (this.ctx) { this.ctx.resume(); return; }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = 0.35; this.master.connect(this.ctx.destination);
    this.music = this.ctx.createGain(); this.music.gain.value = 0.12; this.music.connect(this.master);
    if (this.bgmOn) this.startBgm();
  }
  private save() { try { localStorage.setItem(PREF, JSON.stringify({ sfx: this.sfxOn, bgm: this.bgmOn })); } catch { /* 저장 불가 */ } }
  setSfx(on: boolean) { this.sfxOn = on; this.save(); }
  setBgm(on: boolean) { this.bgmOn = on; this.save(); if (on) this.startBgm(); else this.stopBgm(); }
  suspend() { this.ctx?.suspend(); }
  resume() { this.ctx?.resume(); }

  /** 음 하나: 주파수가 f0→f1 로 미끄러지며 dur 초 동안 */
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0, out: GainNode | null = this.master) {
    const c = this.ctx; if (!c || !out) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out); o.start(t); o.stop(t + dur + 0.02);
  }
  /** 짧은 잡음(타격·벌목·내려찍기) */
  private noise(dur: number, vol: number, hp: number, delay = 0) {
    const c = this.ctx; if (!c || !this.master) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
    s.connect(f).connect(g).connect(this.master); s.start(t);
  }

  play(k: Sfx) {
    if (!this.sfxOn || !this.ctx) return;
    // 같은 소리가 한꺼번에 겹쳐 시끄럽지 않게
    const now = this.ctx.currentTime;
    if (now - (this.last[k] ?? -1) < 0.05) return;
    this.last[k] = now;
    switch (k) {
      case 'hit': this.noise(0.06, 0.5, 1800); this.tone('square', 220, 110, 0.07, 0.12); break;
      case 'crit': this.noise(0.09, 0.6, 1200); this.tone('square', 440, 160, 0.12, 0.18); this.tone('triangle', 880, 660, 0.12, 0.1, 0.03); break;
      case 'miss': this.tone('sine', 600, 900, 0.08, 0.06); break;
      case 'hurt': this.tone('sawtooth', 200, 80, 0.14, 0.12); break;
      case 'coin': this.tone('square', 988, 988, 0.05, 0.08); this.tone('square', 1319, 1319, 0.12, 0.08, 0.05); break;
      case 'item': this.tone('triangle', 660, 990, 0.09, 0.12); break;
      case 'heal': this.tone('sine', 520, 780, 0.18, 0.1); this.tone('sine', 780, 1040, 0.18, 0.08, 0.08); break;
      case 'skill': this.tone('sawtooth', 300, 900, 0.15, 0.1); this.noise(0.12, 0.3, 600, 0.04); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this.tone('square', f, f, 0.12, 0.1, i * 0.08)); break;
      case 'chop': this.noise(0.05, 0.6, 400); this.tone('triangle', 180, 120, 0.06, 0.15); break;
      case 'mine': this.tone('square', 1400, 900, 0.05, 0.08); this.noise(0.04, 0.4, 3000); break;
      case 'slam': this.noise(0.35, 0.9, 60); this.tone('sine', 90, 40, 0.35, 0.4); break;
      case 'click': this.tone('square', 1200, 1200, 0.025, 0.05); break;
      case 'open': this.tone('triangle', 520, 780, 0.06, 0.06); break;
      case 'portal': this.tone('sine', 300, 1200, 0.35, 0.12); this.tone('triangle', 600, 1800, 0.3, 0.06, 0.05); break;
      case 'quest': [784, 988, 1175, 1568].forEach((f, i) => this.tone('triangle', f, f, 0.16, 0.12, i * 0.09)); break;
      case 'card': [1047, 1319, 1568, 2093].forEach((f, i) => this.tone('sine', f, f * 1.01, 0.22, 0.09, i * 0.06)); break;
      case 'craft': this.noise(0.05, 0.5, 2500); this.tone('square', 880, 880, 0.04, 0.08); this.tone('square', 1320, 1320, 0.1, 0.07, 0.07); break;
      case 'warn': this.tone('sawtooth', 220, 220, 0.18, 0.1); this.tone('sawtooth', 220, 220, 0.18, 0.1, 0.25); break;
      case 'buy': this.tone('square', 1319, 1319, 0.04, 0.06); this.tone('square', 1760, 1760, 0.08, 0.06, 0.04); break;
      case 'fail': this.tone('square', 300, 200, 0.12, 0.06); break;
      case 'kill': this.tone('triangle', 520, 260, 0.08, 0.08); this.noise(0.05, 0.25, 2200); break;
    }
  }

  // 배경음: 장소마다 직접 작곡한 곡(music.ts). 곡을 바꾸면 천천히 넘어간다
  private song = 'town';
  setSong(id: string) { this.song = id; if (this.bgmOn && this.mus) this.mus.play(id); }
  private startBgm() { if (!this.ctx || !this.music) return; this.mus ??= new Music(this.ctx, this.music); this.mus.play(this.song); }
  private stopBgm() { this.mus?.stop(); }
}
