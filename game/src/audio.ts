// 효과음·배경음. 음원 파일 없이 Web Audio 로 짧은 소리를 만든다(나중에 실제 음원으로 바꿀 때 play() 이름만 유지).
// 브라우저·안드로이드 WebView 는 사용자가 한 번 터치해야 소리를 낼 수 있어, 첫 터치 때 켠다.
type Sfx = 'hit' | 'crit' | 'miss' | 'hurt' | 'coin' | 'item' | 'level' | 'chop' | 'mine' | 'slam' | 'click' | 'heal' | 'skill';
const PREF = 'looin-idle-audio-v1';

export class Audio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private last: Partial<Record<Sfx, number>> = {};
  private bgmTimer = 0;
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
    }
  }

  // 배경음: 짧은 8마디 선율을 반복(직접 만든 진행)
  private startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    const lead = [0, 4, 7, 4, 9, 7, 4, 2, 0, 4, 7, 12, 11, 7, 4, 2];
    const bass = [0, 0, -5, -5, -3, -3, -7, -7];
    const beat = 0.32, root = 330;
    const f = (semi: number) => root * Math.pow(2, semi / 12);
    let step = 0;
    const tick = () => {
      if (!this.ctx || !this.bgmOn) return;
      this.tone('triangle', f(lead[step % 16]), f(lead[step % 16]), beat * 0.9, 0.5, 0, this.music);
      if (step % 2 === 0) this.tone('sine', f(bass[(step / 2) % 8] - 12), f(bass[(step / 2) % 8] - 12), beat * 1.8, 0.6, 0, this.music);
      step++;
    };
    this.bgmTimer = window.setInterval(tick, beat * 1000);
  }
  private stopBgm() { clearInterval(this.bgmTimer); this.bgmTimer = 0; }
}
