#!/usr/bin/env python3
"""필름 룩 생성기. 표준 라이브러리만 사용.

films.json(파라미터) -> 앱 assets:
  luts/<id>.png      33x33x33 3D LUT를 가로로 펼친 PNG (가로 33*33, 세로 33)
                     픽셀(x = b*N + r, y = g) = 변환된 색
  swatches/<id>.png  기준 그라데이션 장면에 LUT를 적용한 96x96 색 견본

    python3 tools/lutgen/lutgen.py tools/lutgen/films.json app/src/main/assets

파라미터 (모두 선택, 기본값은 효과 없음):
  temp      -1..1   음수 = 차갑게, 양수 = 따뜻하게
  tint      -1..1   음수 = 초록, 양수 = 마젠타
  contrast  -1..1   S커브 세기
  fade      0..0.3  검정을 띄움 (바랜 느낌)
  roll_off  0..0.3  하이라이트를 눌러 줌
  sat       0..2    채도 배율
  shadows   [r,g,b] 어두운 영역에 섞는 색 (-0.2..0.2)
  highs     [r,g,b] 밝은 영역에 섞는 색
  mono      bool    흑백
  mono_mix  [r,g,b] 흑백 변환 가중치
  gain      [r,g,b] 채널별 배율 (레드스케일 같은 강한 틀어짐용)
"""
import json, math, os, struct, sys, zlib

N = 33

def clamp(x): return 0.0 if x < 0 else 1.0 if x > 1 else x

def png(path, w, h, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def chunk(t, d): return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    data = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) \
        + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, "wb").write(data)

def make_look(p):
    temp, tint = p.get("temp", 0), p.get("tint", 0)
    con, fade, roll = p.get("contrast", 0), p.get("fade", 0), p.get("roll_off", 0)
    sat = p.get("sat", 1.0)
    sh, hi = p.get("shadows", [0, 0, 0]), p.get("highs", [0, 0, 0])
    mono, mix = p.get("mono", False), p.get("mono_mix", [0.30, 0.59, 0.11])
    g2 = p.get("gain", [1, 1, 1])
    gain = ((1 + 0.10 * temp + 0.03 * tint) * g2[0], (1 - 0.05 * tint) * g2[1], (1 - 0.12 * temp + 0.03 * tint) * g2[2])

    def curve(x):
        if con:
            s = 0.5 + 0.5 * math.sin((x - 0.5) * math.pi)      # 부드러운 S
            x = x + (s - x) * con if con > 0 else x + (0.5 - x) * (-con) * 0.5
        x = fade + x * (1 - fade - roll)
        return clamp(x)

    def f(r, g, b):
        c = [clamp(r * gain[0]), clamp(g * gain[1]), clamp(b * gain[2])]
        l = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        if mono:
            m = clamp(c[0] * mix[0] + c[1] * mix[1] + c[2] * mix[2])
            c = [m, m, m]
        else:
            c = [l + (x - l) * sat for x in c]
        c = [curve(clamp(x)) for x in c]
        l2 = 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
        ws, wh = (1 - l2) ** 2, l2 ** 2
        return [clamp(c[i] + sh[i] * ws + hi[i] * wh) for i in range(3)]
    return f

def lut_rows(f):
    rows = []
    for gi in range(N):
        row = []
        for bi in range(N):
            for ri in range(N):
                c = f(ri / (N - 1), gi / (N - 1), bi / (N - 1))
                row += [round(x * 255) for x in c]
        rows.append(row)
    return rows

def scene(x, y):
    """견본용 기준 장면: 하늘 그라데이션 + 해 + 땅. 우리가 만든 합성 이미지."""
    sky = (0.55 + 0.4 * (1 - y), 0.55 + 0.25 * (1 - y), 0.75 - 0.2 * y)
    d = math.hypot(x - 0.7, y - 0.3)
    sun = max(0.0, 1 - d * 4) ** 2
    c = [clamp(sky[0] + sun), clamp(sky[1] + sun * 0.8), clamp(sky[2] + sun * 0.4)]
    if y > 0.68 + 0.08 * math.sin(x * 5):
        c = [0.22 + 0.1 * x, 0.30, 0.18]
    return c

def swatch_rows(f, s=96):
    return [[round(v * 255) for x in range(s) for v in f(*scene(x / s, y / s))] for y in range(s)]

def main(src, out):
    films = json.load(open(src))["films"]
    for p in films:
        f = make_look(p)
        png(os.path.join(out, "luts", p["id"] + ".png"), N * N, N, lut_rows(f))
        png(os.path.join(out, "swatches", p["id"] + ".png"), 96, 96, swatch_rows(f))
        print("ok", p["id"])

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
