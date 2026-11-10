"""티저 영상용 효과음/앰비언스를 합성해 out/audio.wav 로 저장한다. (numpy만 사용)
장면 시작 시각은 src/main.js 의 SCENES 와 맞춘다."""
import numpy as np, wave, os

SR = 44100
OFFICE, TRAVEL, ALLEY, PHONE, SCAN, L3D, END = 0, 11.6, 22.8, 36.0, 40.6, 45.2, 58.8
N = int(END * SR)
T = np.arange(N) / SR
rng = np.random.default_rng(7)
out = np.zeros((N, 2))

def band(x, lo, hi):
    f = np.fft.rfftfreq(len(x), 1 / SR); X = np.fft.rfft(x)
    X *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X, len(x))
def env(t0, t1, a=0.05, r=0.2):
    return np.clip((T - t0) / a, 0, 1) * np.clip((t1 - T) / r, 0, 1)
def add(x, gain=1.0, pan=0.0):
    out[:, 0] += x * gain * (1 - max(0, pan)); out[:, 1] += x * gain * (1 + min(0, pan))
def hit(t0, freq, dec, gain=1.0, drop=0.0, pan=0.0, shape='sin'):
    i0 = int(t0 * SR); n = min(N - i0, int(dec * 8 * SR))
    if n <= 0: return
    t = np.arange(n) / SR
    ph = 2 * np.pi * (freq * t - drop * freq * (1 - np.exp(-t * 20)) / 20)
    s = np.sin(ph) if shape == 'sin' else np.sign(np.sin(ph)) * 0.5
    x = np.zeros(N); x[i0:i0 + n] = s * np.exp(-t / dec) * np.clip(t / 0.003, 0, 1); add(x, gain, pan)
def click(t0, gain=0.5, lo=1500, hi=9000, dec=0.012):
    i0 = int(t0 * SR); n = int(0.15 * SR); x = np.zeros(N)
    x[i0:i0 + n] = rng.standard_normal(n) * np.exp(-np.arange(n) / SR / dec); add(band(x, lo, hi), gain)

white = rng.standard_normal(N)
low = band(white, 30, 220); mid = band(white, 250, 1400); high = band(white, 3500, 12000); air = band(white, 6000, 16000)
lfo = lambda f, p=0.0: 0.5 + 0.5 * np.sin(2 * np.pi * f * T + p)

# --- 사무실: 방 울림, 문, 발소리, 펜 긁는 소리, 노크 ---
add(low * env(0, TRAVEL, 0.8, 0.6), 0.5)
add(band(white, 300, 900) * env(0.05, 0.55, 0.1, 0.3) * lfo(23), 0.25)           # 문 삐걱
for i in range(6): hit(0.55 + i * 0.32, 70, 0.05, 0.6, pan=0.4 - i * 0.12); click(0.55 + i * 0.32, 0.12, 200, 1200, 0.03)
hit(2.65, 55, 0.09, 0.7); click(3.3, 0.2, 800, 5000, 0.05)                         # 앉기, 종이
scratch = high * (0.35 + 0.65 * lfo(9.3) * lfo(3.1, 1)) * (np.abs(np.sin(2 * np.pi * 2.4 * T)) ** 0.5)
add(scratch * env(5.0, 8.2, 0.1, 0.15), 0.32)
for i in range(3): hit(8.62 + i * 0.13, 180, 0.03, 0.9, pan=0.6); click(8.62 + i * 0.13, 0.3, 300, 2000, 0.02)
for i in range(5): hit(9.05 + i * 0.19, 75, 0.045, 0.6, pan=i * 0.14)
# 동화풍 오르골 선율
scale = [293.66, 349.23, 440.0, 523.25, 587.33, 698.46, 880.0]
mel = [0, 2, 4, 3, 2, 5, 4, 2, 0, 2, 3, 4, 6, 5, 4, 2, 3, 1, 2, 0, 2, 4, 5, 4]
for i, m in enumerate(mel):
    t0 = 0.8 + i * 0.44
    hit(t0, scale[m] * 2, 0.35, 0.10, pan=0.3 * np.sin(i)); hit(t0, scale[m] * 4, 0.12, 0.04)

# --- 바람과 시간 여행 ---
wind = mid * (0.3 + 0.7 * lfo(0.35) * lfo(0.9, 2)) + air * 0.25 * lfo(0.6, 1)
add(wind * env(9.7, ALLEY + 1.6, 1.2, 1.5), 0.9)
ed = (ALLEY - TRAVEL) / 7
for i in range(7):
    t0 = TRAVEL + (i + 1) * ed - 0.35
    sw = band(white, 400, 3000) * np.exp(-((T - t0 - 0.2) / 0.16) ** 2); add(sw, 0.8, pan=0.5 if i % 2 else -0.5)
    for j, m in enumerate([0, 2, 4]):                                                # 시대가 바뀔 때마다 음이 올라간다
        hit(TRAVEL + i * ed + 0.1 + j * 0.16, scale[(i + m) % 7] * (1 + i // 4) * 2, 0.3, 0.09)
pad = sum(np.sin(2 * np.pi * f * T + i) for i, f in enumerate([73.4, 110, 146.8, 220.5])) / 4
add(pad * env(TRAVEL, ALLEY, 2, 1.5) * (0.6 + 0.4 * lfo(0.2)), 0.22)

# --- 골목: 도시 소음, 스프레이 ---
add(low * env(ALLEY, SCAN, 1, 0.5), 0.45); add(mid * env(ALLEY, PHONE + 3.4, 1, 0.3) * 0.25, 0.3)
for i in range(4): click(ALLEY + 2.55 + i * 0.09, 0.3, 2500, 9000, 0.008)            # 캔 흔들기
spray = band(white, 4000, 14000)
add(spray * env(ALLEY + 3.1, ALLEY + 5.5, 0.03, 0.08) * (0.55 + 0.45 * np.sign(np.sin(2 * np.pi * 3.2 * T))), 0.42)
for i in range(4): click(ALLEY + 6.9 + i * 0.09, 0.3, 2500, 9000, 0.008)
add(spray * env(ALLEY + 7.3, ALLEY + 11.5, 0.1, 0.2) * (0.25 + 0.75 * (lfo(0.9) > 0.3)), 0.3)
for i in range(4): hit(ALLEY + 11.6 + i * 0.07, 1760 * (1 + i * 0.25), 0.25, 0.07)   # 완성 반짝임
for i in range(3): hit(PHONE + 0.15 + i * 0.3, 80, 0.04, 0.5, pan=-0.5 + i * 0.2)    # 행인 발소리
hit(PHONE + 3.0, 1900, 0.05, 0.12); hit(PHONE + 3.12, 2500, 0.05, 0.12)              # 초점 삑삑
click(PHONE + 3.42, 1.0, 1200, 9000, 0.01); click(PHONE + 3.5, 0.8, 800, 6000, 0.02); hit(PHONE + 3.42, 140, 0.03, 0.5)  # 찰칵

# --- 스캔, 글리치 ---
sw_f = 180 + 900 * np.clip((T - SCAN) / 2.2, 0, 1) ** 2
add(np.sin(2 * np.pi * np.cumsum(sw_f) / SR) * env(SCAN + 0.15, SCAN + 2.2, 0.3, 0.05), 0.14)
add(np.sign(np.sin(2 * np.pi * 55 * T)) * env(SCAN, SCAN + 3.5, 0.5, 0.2), 0.05)
for i in range(12): hit(SCAN + 0.3 + i * 0.16, 2400, 0.012, 0.06, pan=0.4)
hit(SCAN + 2.25, 1318, 0.3, 0.14); hit(SCAN + 2.37, 1976, 0.4, 0.14)
def glitchfx(t0, t1, gain=0.6):
    g = white * (rng.random(N // 900 + 1).repeat(900)[:N] > 0.45) + np.sign(np.sin(2 * np.pi * (60 + 2000 * rng.random(N // 2200 + 1).repeat(2200)[:N]) * T)) * 0.6
    add(band(g, 200, 9000) * env(t0, t1, 0.01, 0.02), gain)
glitchfx(SCAN + 3.5, SCAN + 4.3)

# --- 3D 로고: 서브 베이스, 패드, 컷마다 우쉬, 상승음 ---
hit(L3D + 0.45, 48, 0.9, 1.0, drop=0.6)
chord = [73.42, 110.0, 146.83, 174.61, 220.0, 329.63]
syn = sum(np.sin(2 * np.pi * f * T * (1 + 0.002 * np.sin(T * 0.7 + i))) + 0.3 * np.sin(4 * np.pi * f * T) for i, f in enumerate(chord)) / 6
add(syn * env(L3D + 0.4, L3D + 12.8, 1.5, 0.15) * (0.7 + 0.3 * lfo(0.5)), 0.42)
for c in [2.7, 4.5, 6.3, 8.0]:
    add(band(white, 300, 5000) * np.exp(-((T - L3D - c) / 0.11) ** 2), 0.7); hit(L3D + c, 52, 0.5, 0.8, drop=0.5)
rise = 300 * 2 ** (np.clip((T - L3D - 8.0) / 3.4, 0, 1) * 1.6)
add(np.sin(2 * np.pi * np.cumsum(rise) / SR) * env(L3D + 8.0, L3D + 11.4, 2.5, 0.05), 0.07)
add(air * env(L3D + 8.0, L3D + 11.5, 3.0, 0.1), 0.25)
for f in [587.33, 880.0, 1174.66, 1760.0]: hit(L3D + 11.5, f, 0.9, 0.11)             # 2D 로고로 전환
hit(L3D + 11.5, 55, 0.8, 0.7, drop=0.3)
glitchfx(L3D + 12.7, L3D + 13.42, 0.7)

out /= max(1.0, np.abs(out).max() / 0.92)
out = np.tanh(out * 1.3) / np.tanh(1.3)
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'), exist_ok=True)
with wave.open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out', 'audio.wav'), 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out * 32000).astype('<i2').tobytes())
print('audio.wav', END, 's, peak', float(np.abs(out).max()))
