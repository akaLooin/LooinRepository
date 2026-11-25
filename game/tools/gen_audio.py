"""테일즈토피아 RPG 오디오 생성기 — 효과음과 배경음을 전부 코드로 합성한다 (외부 음원 없음).
사용: python3 tools/gen_audio.py <출력 폴더>   (ffmpeg 로 .ogg 변환)
"""
import os
import subprocess
import sys
import wave

import numpy as np

SR = 22050
OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/audio"
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(42)


def t(sec):
    return np.arange(int(SR * sec)) / SR


def env(n, a=0.005, d=0.1, s=0.0, r=0.05, sus_len=0.0):
    """ADSR 엔벨로프 (초 단위)."""
    A, D, R = int(a * SR), int(d * SR), int(r * SR)
    S = max(0, n - A - D - R)
    e = np.concatenate([
        np.linspace(0, 1, max(A, 1)),
        np.linspace(1, s, max(D, 1)),
        np.full(S, s),
        np.linspace(s, 0, max(R, 1)),
    ])
    return np.pad(e, (0, max(0, n - len(e))))[:n]


def square(freq, sec, duty=0.5):
    ph = np.cumsum(np.broadcast_to(freq, int(SR * sec)) / SR) % 1.0
    return np.where(ph < duty, 1.0, -1.0)


def tri(freq, sec):
    ph = np.cumsum(np.broadcast_to(freq, int(SR * sec)) / SR) % 1.0
    return 4 * np.abs(ph - 0.5) - 1


def noise(sec):
    return rng.uniform(-1, 1, int(SR * sec))


def lowpass(x, k):
    """간단한 1차 저역 통과 (k: 0~1, 작을수록 어두움)."""
    y = np.zeros_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += k * (v - acc)
        y[i] = acc
    return y


def sweep(f0, f1, sec):
    return np.geomspace(f0, f1, int(SR * sec))


def save(name, x, vol=0.8):
    x = np.clip(x / (np.max(np.abs(x)) + 1e-9) * vol, -1, 1)
    pcm = (x * 32767).astype(np.int16)
    wav = os.path.join(OUT, name + ".wav")
    with wave.open(wav, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    ogg = os.path.join(OUT, name + ".ogg")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-c:a", "libvorbis", "-q:a", "4", ogg], check=True)
    os.remove(wav)


# ───────────── 효과음 ─────────────
def sfx():
    n = lambda s: int(SR * s)
    # 베기: 걸러진 노이즈 휙
    x = lowpass(noise(0.14), 0.35) * env(n(0.14), 0.01, 0.12)
    save("slash", x, 0.6)
    # 타격: 짧은 노이즈 + 낮은 펀치
    x = noise(0.09) * env(n(0.09), 0.001, 0.08) * 0.7 + np.sin(2 * np.pi * np.cumsum(sweep(220, 60, 0.09)) / SR) * env(n(0.09), 0.001, 0.08)
    save("hit", x, 0.8)
    # 크리티컬: 타격 + 높은 종이 찢는 소리
    x = noise(0.16) * env(n(0.16), 0.001, 0.15) * 0.6 + square(sweep(1400, 700, 0.16), 0.16, 0.25) * env(n(0.16), 0.001, 0.15) * 0.4
    save("crit", x, 0.8)
    # 점프: 위로 올라가는 사각파
    save("jump", square(sweep(260, 620, 0.12), 0.12, 0.25) * env(n(0.12), 0.002, 0.1), 0.35)
    # 대시: 짧은 바람
    save("dash", lowpass(noise(0.12), 0.18) * env(n(0.12), 0.005, 0.1), 0.6)
    # 필살기: 상승 아르페지오
    notes = [392, 494, 587, 784, 988]
    x = np.concatenate([square(f, 0.05, 0.25) * env(n(0.05), 0.002, 0.045) for f in notes])
    save("skill", x, 0.45)
    # 대단원(3단): 길게 울리는 화음 + 노이즈
    tt = t(0.9)
    x = sum(np.sin(2 * np.pi * f * tt) for f in (196, 247, 294, 392)) * env(len(tt), 0.01, 0.8, 0.0)
    x += lowpass(noise(0.9), 0.08) * env(len(tt), 0.2, 0.6) * 0.8
    save("skill3", x, 0.7)
    # 반격: 금속성 핑
    tt = t(0.25)
    save("counter", (np.sin(2 * np.pi * 1320 * tt) + 0.5 * np.sin(2 * np.pi * 1980 * tt)) * env(len(tt), 0.001, 0.24), 0.5)
    # 포션: 보글
    x = np.concatenate([np.sin(2 * np.pi * np.cumsum(sweep(300 + i * 80, 600 + i * 80, 0.06)) / SR) * env(n(0.06), 0.003, 0.05) for i in range(3)])
    save("potion", x, 0.5)
    # 적 퇴치: 잉크가 터지는 소리
    x = lowpass(noise(0.3), 0.2) * env(n(0.3), 0.002, 0.28) + np.sin(2 * np.pi * np.cumsum(sweep(180, 40, 0.3)) / SR) * env(n(0.3), 0.002, 0.28)
    save("enemy_die", x, 0.7)
    # 피격(플레이어)
    save("hurt", square(sweep(300, 120, 0.15), 0.15, 0.5) * env(n(0.15), 0.001, 0.14), 0.4)
    # 페이지 넘김 (스테이지 이동·포탈)
    x = lowpass(noise(0.35), 0.5) * np.concatenate([env(n(0.15), 0.02, 0.13), env(n(0.2), 0.03, 0.17) * 0.7])
    save("page", x, 0.5)
    # 포탈 열림: 반짝
    x = np.concatenate([tri(f, 0.07) * env(n(0.07), 0.002, 0.065) for f in (880, 1175, 1319, 1760)])
    save("portal", x, 0.45)
    # UI 클릭
    save("click", square(1200, 0.03, 0.5) * env(n(0.03), 0.001, 0.028), 0.25)
    # 코인/보상
    x = np.concatenate([square(988, 0.06, 0.5) * env(n(0.06), 0.001, 0.05), square(1319, 0.16, 0.5) * env(n(0.16), 0.001, 0.15)])
    save("coin", x, 0.3)
    # 레벨 업 / 클리어 팡파르
    seq = [(523, .1), (659, .1), (784, .1), (1047, .35)]
    x = np.concatenate([(square(f, d, 0.25) * 0.5 + tri(f / 2, d) * 0.5) * env(n(d), 0.003, d * 0.9, 0.3) for f, d in seq])
    save("fanfare", x, 0.5)
    # 보스 포효: 낮은 톱니 + 노이즈
    tt = t(0.8)
    saw = 2 * ((np.cumsum(sweep(90, 55, 0.8)) / SR) % 1.0) - 1
    save("boss_roar", (saw * 0.7 + lowpass(noise(0.8), 0.1)) * env(len(tt), 0.05, 0.7), 0.8)
    # 종소리 (보스 2)
    tt = t(1.0)
    x = sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt * dcy) for f, a, dcy in ((220, 1, 2.5), (440, .6, 3), (563, .4, 4), (880, .3, 5)))
    save("bell", x, 0.7)
    # 물보라 (보스 3)
    save("splash", lowpass(noise(0.4), 0.3) * env(n(0.4), 0.005, 0.38), 0.6)


# ───────────── 배경음 ─────────────
NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"])}


def f_of(name, octave):
    return NOTE[name] * 2 ** (octave - 4)


def render_song(bpm, bars, chords, scale, lead_pattern, bass_oct=2, lead_oct=5, duty=0.25, drums=True, seed=0):
    """코드 진행 + 규칙 기반 멜로디로 반복 가능한 루프를 만든다."""
    r = np.random.default_rng(seed)
    beat = 60 / bpm
    step = beat / 2                      # 8분음표
    total = int(SR * step * 8 * bars)
    out = np.zeros(total)
    pos = 0
    prev = 2
    for b in range(bars):
        root, quality = chords[b % len(chords)]
        triad = [0, 4, 7] if quality == "M" else [0, 3, 7]
        ri = list(NOTE).index(root)
        chord_notes = [list(NOTE)[(ri + k) % 12] for k in triad]
        for s in range(8):
            n = int(SR * step)
            # 베이스: 근음-5도 왕복
            bn = chord_notes[0] if s % 4 < 2 else chord_notes[2]
            seg = tri(f_of(bn, bass_oct), step) * env(n, 0.005, step * 0.8, 0.4, 0.02) * 0.5
            # 아르페지오(작게)
            an = chord_notes[s % 3]
            seg += square(f_of(an, 4), step, 0.125) * env(n, 0.002, step * 0.6, 0.0) * 0.08
            # 멜로디: 패턴의 1 = 음 연주, 0 = 쉼
            if lead_pattern[(b * 8 + s) % len(lead_pattern)] == 1:
                move = r.choice([-2, -1, -1, 0, 1, 1, 2])
                prev = int(np.clip(prev + move, 0, len(scale) - 1))
                # 마디 첫 박은 코드 음으로 맞춤
                name = chord_notes[r.integers(0, 3)] if s == 0 else scale[prev]
                seg += square(f_of(name, lead_oct), step, duty) * env(n, 0.004, step * 0.7, 0.35, 0.03) * 0.22
            if drums:
                if s % 4 == 0:
                    kick = np.sin(2 * np.pi * np.cumsum(sweep(150, 45, step)) / SR) * env(n, 0.001, 0.12)
                    seg += kick * 0.6
                if s % 4 == 2:
                    seg += noise(step) * env(n, 0.001, 0.07) * 0.25
                seg += lowpass(noise(step), 0.9) * env(n, 0.001, 0.02) * 0.06
            out[pos:pos + n] += seg[: total - pos]
            pos += n
    return out


def music():
    # 열람실: 차분한 F장조, 드럼 없음
    town = render_song(84, 16, [("F", "M"), ("D", "m"), ("A#", "M"), ("C", "M")],
                       ["F", "G", "A", "C", "D", "F", "G"], [1, 0, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 1, 0, 1, 0], 2, 5, 0.5, False, 3)
    save("bgm_town", town, 0.6)
    # 던전: 경쾌한 D도리안
    dun = render_song(132, 16, [("D", "m"), ("C", "M"), ("G", "M"), ("D", "m"), ("A#", "M"), ("C", "M"), ("D", "m"), ("A", "m")],
                      ["D", "E", "F", "G", "A", "B", "C", "D"], [1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1], 2, 5, 0.25, True, 7)
    save("bgm_dungeon", dun, 0.6)
    # 보스: 빠른 C단조
    boss = render_song(156, 16, [("C", "m"), ("G#", "M"), ("A#", "M"), ("G", "M")],
                       ["C", "D", "D#", "F", "G", "G#", "B", "C"], [1, 1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1], 2, 5, 0.125, True, 11)
    save("bgm_boss", boss, 0.6)


if __name__ == "__main__":
    sfx()
    music()
    print("audio written to", OUT)
