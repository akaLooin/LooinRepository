// 배경음: 직접 작곡한 곡을 Web Audio 로 연주한다(외부 음원 없음 → 저작권 걱정 없음, 용량 0).
// 곡마다 베이스·화음·선율·드럼 네 파트. 미리 0.2초씩 앞서 예약해 박자가 흔들리지 않게 하고, 곡을 바꿀 때는 천천히 넘긴다.

/** 선율·베이스 한 칸: 음계 안의 몇 번째 음(0 = 으뜸음), null 은 쉼 */
type Step = number | null;
export interface Song {
  bpm: number;
  /** 으뜸음(Hz)과 음계(반음 간격) */
  root: number; scale: number[];
  /** 마디마다 화음(음계 안 몇 번째 음에서 쌓은 3화음) */
  chords: number[];
  /** 16분음표 16칸 × 마디 수 */
  lead: Step[][]; bass: Step[][];
  /** 드럼 한 마디: k 킥, s 스네어, h 하이햇, . 쉼 */
  drums: string;
  /** 음색 */
  leadWave: OscillatorType; padWave: OscillatorType;
  /** 선율 밝기(저역 통과 주파수), 메아리 양 */
  bright: number; echo: number;
  /** 음량(0~1) */
  vol: { lead: number; pad: number; bass: number; drum: number };
}

const MAJOR = [0, 2, 4, 5, 7, 9, 11], MINOR = [0, 2, 3, 5, 7, 8, 10], DORIAN = [0, 2, 3, 5, 7, 9, 10], PENTA = [0, 2, 4, 7, 9];
const n = null;

export const SONGS: Record<string, Song> = {
  // 마을: 느긋한 왈츠 같은 장조, 부드러운 삼각파
  town: { bpm: 92, root: 261.63, scale: MAJOR, chords: [0, 5, 3, 4], leadWave: 'triangle', padWave: 'sine', bright: 2600, echo: 0.28,
    lead: [[4, n, n, 2, 4, n, 7, n, 6, n, 4, n, 2, n, n, n], [5, n, n, 4, 5, n, 9, n, 7, n, n, n, n, n, n, n], [3, n, n, 2, 3, n, 5, n, 4, n, 2, n, 0, n, n, n], [1, n, 2, n, 4, n, 3, n, 1, n, n, n, n, n, n, n]],
    bass: [[0, n, n, n, 4, n, n, n, 0, n, n, n, 4, n, n, n], [5, n, n, n, 2, n, n, n, 5, n, n, n, 2, n, n, n], [3, n, n, n, 0, n, n, n, 3, n, n, n, 0, n, n, n], [4, n, n, n, 1, n, n, n, 4, n, n, n, 6, n, n, n]],
    drums: 'k...h...s...h...', vol: { lead: 0.5, pad: 0.22, bass: 0.55, drum: 0.25 } },
  // 들판: 통통 튀는 모험 곡, 사각파 선율
  field: { bpm: 128, root: 293.66, scale: MAJOR, chords: [0, 4, 5, 3], leadWave: 'square', padWave: 'triangle', bright: 2200, echo: 0.22,
    lead: [[0, n, 2, n, 4, n, 4, 5, 4, n, 2, n, 0, n, n, n], [4, n, 5, n, 7, n, 7, 8, 7, n, 5, n, 4, n, n, n], [5, n, 4, n, 5, n, 7, n, 9, n, 7, n, 5, n, 4, n], [3, n, 4, n, 5, n, 4, n, 2, n, 1, n, 2, n, n, n]],
    bass: [[0, n, 0, n, 4, n, 0, n, 0, n, 0, n, 4, n, 0, n], [4, n, 4, n, 1, n, 4, n, 4, n, 4, n, 1, n, 4, n], [5, n, 5, n, 2, n, 5, n, 5, n, 5, n, 2, n, 5, n], [3, n, 3, n, 0, n, 3, n, 4, n, 4, n, 1, n, 4, n]],
    drums: 'k.h.s.h.k.k.s.h.', vol: { lead: 0.32, pad: 0.18, bass: 0.5, drum: 0.3 } },
  // 깊은 숲·늪·동굴·유적: 도리안의 신비로운 곡, 느리고 메아리 많이
  deep: { bpm: 84, root: 220, scale: DORIAN, chords: [0, 6, 3, 4], leadWave: 'sine', padWave: 'triangle', bright: 1800, echo: 0.45,
    lead: [[n, n, 4, n, n, n, 5, n, 7, n, n, n, 5, n, 4, n], [n, n, 2, n, n, n, 3, n, 4, n, n, n, n, n, n, n], [n, n, 4, n, n, n, 5, n, 9, n, 8, n, 7, n, 5, n], [4, n, n, n, 3, n, n, n, 1, n, n, n, n, n, n, n]],
    bass: [[0, n, n, n, n, n, n, n, 0, n, n, n, n, n, 4, n], [6, n, n, n, n, n, n, n, 6, n, n, n, n, n, 3, n], [3, n, n, n, n, n, n, n, 3, n, n, n, n, n, 0, n], [4, n, n, n, n, n, n, n, 4, n, n, n, 1, n, n, n]],
    drums: 'k.......h...h...', vol: { lead: 0.45, pad: 0.26, bass: 0.5, drum: 0.18 } },
  // 광산: 오음계의 단단한 리듬, 금속성 하이햇
  mine: { bpm: 108, root: 196, scale: PENTA, chords: [0, 3, 1, 4], leadWave: 'square', padWave: 'sine', bright: 1500, echo: 0.3,
    lead: [[0, n, n, 2, n, n, 3, n, 2, n, n, 0, n, n, n, n], [3, n, n, 4, n, n, 5, n, 4, n, n, 3, n, n, n, n], [1, n, n, 2, n, n, 4, n, 3, n, 2, n, 1, n, n, n], [4, n, 3, n, 2, n, 1, n, 0, n, n, n, n, n, n, n]],
    bass: [[0, n, n, 0, n, n, 0, n, 0, n, n, 0, n, n, 2, n], [3, n, n, 3, n, n, 3, n, 3, n, n, 3, n, n, 4, n], [1, n, n, 1, n, n, 1, n, 1, n, n, 1, n, n, 3, n], [4, n, n, 4, n, n, 4, n, 4, n, n, 4, n, n, 0, n]],
    drums: 'k..h.hs.k.hh.hs.', vol: { lead: 0.28, pad: 0.2, bass: 0.55, drum: 0.32 } },
  // 보스: 단조의 빠르고 긴장감 있는 곡
  boss: { bpm: 150, root: 164.81, scale: MINOR, chords: [0, 5, 6, 4], leadWave: 'sawtooth', padWave: 'square', bright: 1700, echo: 0.18,
    lead: [[7, n, 7, 6, 7, n, 4, n, 5, n, 4, n, 2, n, 4, n], [7, n, 7, 6, 7, n, 9, n, 8, n, 7, n, 5, n, 4, n], [9, n, 9, 8, 9, n, 7, n, 8, n, 7, n, 5, n, 4, n], [4, n, 5, n, 6, n, 7, n, 6, n, 5, n, 4, n, 2, n]],
    bass: [[0, 0, n, 0, 0, n, 0, 0, 0, 0, n, 0, 0, n, 4, n], [5, 5, n, 5, 5, n, 5, 5, 5, 5, n, 5, 5, n, 2, n], [6, 6, n, 6, 6, n, 6, 6, 6, 6, n, 6, 6, n, 3, n], [4, 4, n, 4, 4, n, 4, 4, 4, 4, n, 4, 1, n, 4, n]],
    drums: 'k.h.s.hkk.h.s.hs', vol: { lead: 0.22, pad: 0.14, bass: 0.5, drum: 0.36 } },
  // 콜로세움: 밝고 신나는 장조, 빠른 드럼
  arena: { bpm: 140, root: 329.63, scale: MAJOR, chords: [0, 3, 4, 0], leadWave: 'square', padWave: 'triangle', bright: 2600, echo: 0.15,
    lead: [[4, n, 4, n, 5, 4, 2, n, 4, n, 4, n, 7, n, n, n], [5, n, 5, n, 7, 5, 4, n, 3, n, 2, n, 3, n, n, n], [6, n, 6, n, 7, 6, 4, n, 6, n, 7, n, 8, n, n, n], [7, n, 6, n, 4, n, 2, n, 4, n, n, n, 0, n, n, n]],
    bass: [[0, n, 4, n, 0, n, 4, n, 0, n, 4, n, 0, n, 4, n], [3, n, 0, n, 3, n, 0, n, 3, n, 0, n, 3, n, 0, n], [4, n, 1, n, 4, n, 1, n, 4, n, 1, n, 4, n, 1, n], [0, n, 4, n, 0, n, 4, n, 0, 0, 4, n, 0, n, n, n]],
    drums: 'k.hhs.hhk.hhs.hs', vol: { lead: 0.28, pad: 0.16, bass: 0.5, drum: 0.34 } },
};

/** 맵 테마 → 곡 */
export function songFor(theme: string, boss: boolean, arena: boolean): string {
  if (arena) return 'arena';
  if (boss) return 'boss';
  if (theme === 'town') return 'town';
  if (theme === 'mine') return 'mine';
  if (['swamp', 'cave', 'ruins', 'grove'].includes(theme)) return 'deep';
  return 'field';
}

/** 곡 연주기: 곡마다 자기 음량 노드를 두고, 바꿀 때 서로 엇갈려 줄이고 키운다 */
export class Music {
  private cur: { id: string; gain: GainNode; step: number; next: number; timer: number } | null = null;
  constructor(private ctx: AudioContext, private out: GainNode) {}

  play(id: string) {
    if (this.cur?.id === id) return;
    const song = SONGS[id];
    if (!song) return;
    const c = this.ctx, t = c.currentTime;
    if (this.cur) {
      const old = this.cur;
      old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t); old.gain.gain.linearRampToValueAtTime(0.0001, t + 1.2);
      setTimeout(() => { clearInterval(old.timer); old.gain.disconnect(); }, 1400);
    }
    const gain = c.createGain(); gain.gain.setValueAtTime(0.0001, t); gain.gain.linearRampToValueAtTime(1, t + 1.5);
    // 메아리(되먹임 지연)
    const delay = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
    delay.delayTime.value = (60 / song.bpm) * 0.75; fb.gain.value = song.echo * 0.6; wet.gain.value = song.echo;
    delay.connect(fb).connect(delay); delay.connect(wet).connect(gain);
    gain.connect(this.out);
    const st = { id, gain, step: 0, next: t + 0.1, timer: 0 };
    const sixteenth = 60 / song.bpm / 4, bars = song.lead.length;
    st.timer = window.setInterval(() => {
      // 0.25초 앞까지 예약
      while (st.next < c.currentTime + 0.25) { this.stepAt(song, st.step, st.next, sixteenth, gain, delay); st.step = (st.step + 1) % (16 * bars); st.next += sixteenth; }
    }, 60);
    this.cur = st;
  }
  stop() {
    if (!this.cur) return;
    const old = this.cur, t = this.ctx.currentTime;
    old.gain.gain.cancelScheduledValues(t); old.gain.gain.setValueAtTime(old.gain.gain.value, t); old.gain.gain.linearRampToValueAtTime(0.0001, t + 0.6);
    setTimeout(() => { clearInterval(old.timer); old.gain.disconnect(); }, 800);
    this.cur = null;
  }
  get playing() { return this.cur?.id ?? null; }

  private freq(song: Song, deg: number, oct = 0) {
    const s = song.scale, o = Math.floor(deg / s.length), i = ((deg % s.length) + s.length) % s.length;
    return song.root * Math.pow(2, (s[i] + 12 * (o + oct)) / 12);
  }
  private stepAt(song: Song, step: number, t: number, len: number, out: GainNode, echo: DelayNode) {
    const bar = Math.floor(step / 16), i = step % 16;
    const lead = song.lead[bar][i], bass = song.bass[bar][i], drum = song.drums[i];
    if (lead !== null) {
      // 이어지는 쉼만큼 길게
      let dur = 1; while (i + dur < 16 && song.lead[bar][i + dur] === null && dur < 4) dur++;
      this.note(song.leadWave, this.freq(song, lead), t, len * dur * 0.95, song.vol.lead, out, song.bright, echo);
    }
    if (bass !== null) this.note('triangle', this.freq(song, bass, -2), t, len * 1.8, song.vol.bass, out, 900);
    // 화음: 마디 첫 박과 셋째 박에 3화음
    if (i === 0 || i === 8) {
      const r = song.chords[bar % song.chords.length];
      for (const d of [r, r + 2, r + 4]) this.note(song.padWave, this.freq(song, d, -1), t, len * 7.5, song.vol.pad / 3, out, 1400);
    }
    if (drum === 'k') this.kick(t, song.vol.drum, out);
    else if (drum === 's') this.snare(t, song.vol.drum, out);
    else if (drum === 'h') this.hat(t, song.vol.drum, out);
  }
  private note(wave: OscillatorType, f: number, t: number, dur: number, vol: number, out: GainNode, cutoff: number, echo?: DelayNode) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = wave; o.frequency.setValueAtTime(f, t);
    lp.type = 'lowpass'; lp.frequency.value = cutoff;
    // 부드러운 시작·끝(딸깍 소리 없이)
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.012); g.gain.setTargetAtTime(vol * 0.6, t + 0.05, 0.08); g.gain.setTargetAtTime(0.0001, t + dur, 0.05);
    o.connect(lp).connect(g).connect(out); if (echo) g.connect(echo);
    o.start(t); o.stop(t + dur + 0.3);
  }
  private noiseBuf?: AudioBuffer;
  private noise(): AudioBuffer {
    if (!this.noiseBuf) {
      const c = this.ctx, b = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuf = b;
    }
    return this.noiseBuf;
  }
  private kick(t: number, vol: number, out: GainNode) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol * 1.6, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
  }
  private snare(t: number, vol: number, out: GainNode) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise(); f.type = 'bandpass'; f.frequency.value = 1800;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 0.15);
  }
  private hat(t: number, vol: number, out: GainNode) {
    const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = this.noise(); f.type = 'highpass'; f.frequency.value = 7000;
    g.gain.setValueAtTime(vol * 0.5, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 0.05);
  }
}
