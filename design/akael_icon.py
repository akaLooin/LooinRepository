"""
아카엘 (aka L) 로고/아이콘 생성기.
컨셉: 신성한 후광(halo)과 빛줄기 속에 선 기둥 같은 금빛 'L', 그 위의 빛의 별.
실행: python3 design/akael_icon.py  → design/out/ 에 결과물, 앱 리소스 폴더에 복사
"""
import math, os, shutil
from PIL import Image, ImageDraw, ImageFilter, ImageChops

S = 2048  # 작업 해상도 (마지막에 줄여서 계단 현상 제거)
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOT = os.path.dirname(HERE)
os.makedirs(OUT, exist_ok=True)

GOLD_TOP, GOLD_MID, GOLD_BOT = (255, 244, 200), (232, 186, 74), (150, 98, 22)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def gold_gradient(size):
    g = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / (size - 1)
        c = lerp(GOLD_TOP, GOLD_MID, t / 0.45) if t < 0.45 else lerp(GOLD_MID, GOLD_BOT, (t - 0.45) / 0.55)
        g.putpixel((0, y), c)
    return g.resize((size, size))


def night_background(size):
    """깊은 남보라 → 거의 검정으로 퍼지는 방사형 그라데이션."""
    bg = Image.new("RGB", (size, size))
    px = bg.load()
    cx, cy = size / 2, size * 0.46
    inner, outer = (46, 34, 92), (6, 6, 14)
    maxd = math.hypot(size / 2, size / 2)
    for y in range(size):
        for x in range(0, size):
            d = min(1.0, math.hypot(x - cx, y - cy) / maxd)
            px[x, y] = lerp(inner, outer, d ** 0.8)
    return bg


def rays_mask(size, n=36, inner_r=0.04, outer_r=0.62, width_deg=2.0):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    c = size / 2
    for i in range(n):
        a = math.radians(i * 360 / n - 90)
        long_ray = i % 2 == 0
        r1 = size * inner_r
        r2 = size * (outer_r if long_ray else outer_r * 0.82)
        w = math.radians(width_deg if long_ray else width_deg * 0.6)
        pts = [
            (c + r1 * math.cos(a - w), c + r1 * math.sin(a - w)),
            (c + r2 * math.cos(a), c + r2 * math.sin(a)),
            (c + r1 * math.cos(a + w), c + r1 * math.sin(a + w)),
        ]
        d.polygon(pts, fill=200 if long_ray else 110)
    # 바깥으로 갈수록 희미하게
    fade = Image.new("L", (size, size), 0)
    fp = fade.load()
    for y in range(size):
        for x in range(size):
            r = math.hypot(x - c, y - c) / (size * outer_r)
            fp[x, y] = int(255 * max(0.0, 1 - r) ** 1.6)
    return ImageChops.multiply(m, fade).filter(ImageFilter.GaussianBlur(size * 0.004))


def ring_mask(size, r=0.36, w=0.012):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    c = size / 2
    R, W = size * r, size * w
    d.ellipse([c - R, c - R, c + R, c + R], outline=255, width=int(W))
    # 두 번째 가는 고리
    R2 = size * (r + 0.035)
    d.ellipse([c - R2, c - R2, c + R2, c + R2], outline=110, width=max(2, int(W * 0.35)))
    return m


def L_mask(size):
    """기둥처럼 위로 솟은 L: 위가 살짝 넓어지는 줄기 + 오른쪽으로 뻗은 받침, 끝은 날카롭게."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    u = size / 100.0
    x0, top, base_y, base_h = 41.5 * u, 24 * u, 70 * u, 9 * u
    stem_w_top, stem_w_bot = 12.5 * u, 10.5 * u
    # 줄기 (위가 조금 더 넓은 기둥) + 꼭대기 세리프
    d.polygon([
        (x0 - 2.2 * u, top), (x0 + stem_w_top + 2.2 * u, top),
        (x0 + stem_w_top, top + 3.2 * u), (x0 + stem_w_bot + 0.6 * u, base_y),
        (x0 - 0.6 * u, base_y + base_h), (x0, top + 3.2 * u),
    ], fill=255)
    # 받침: 오른쪽 끝이 위로 살짝 솟는 칼날
    d.polygon([
        (x0 - 0.6 * u, base_y), (67.5 * u, base_y), (73.5 * u, base_y - 4.5 * u),
        (71.5 * u, base_y + base_h), (x0 - 0.6 * u, base_y + base_h),
    ], fill=255)
    return m


def star_mask(size, cx, cy, r):
    """네 갈래 빛의 별 (신성한 불꽃)."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    k = r * 0.16
    d.polygon([(cx, cy - r), (cx + k, cy - k), (cx + r * 0.62, cy), (cx + k, cy + k),
               (cx, cy + r * 0.8), (cx - k, cy + k), (cx - r * 0.62, cy), (cx - k, cy - k)], fill=255)
    return m


def glow(mask, radius, strength):
    g = mask.filter(ImageFilter.GaussianBlur(radius))
    return g.point(lambda v: min(255, int(v * strength)))


def compose(size=S, background=True, scale=1.0):
    """scale: 마크(후광+L) 크기 비율. 적응형 아이콘 전경은 작게."""
    base = night_background(size).convert("RGBA") if background else Image.new("RGBA", (size, size), (0, 0, 0, 0))
    inner = int(size * scale)
    off = (size - inner) // 2

    def place(mask):
        canvas = Image.new("L", (size, size), 0)
        canvas.paste(mask.resize((inner, inner), Image.LANCZOS), (off, off))
        return canvas

    gold = gold_gradient(size).convert("RGBA")
    light = Image.new("RGBA", (size, size), (255, 214, 120, 255))
    white = Image.new("RGBA", (size, size), (255, 250, 235, 255))

    rays = place(rays_mask(S))
    ring = place(ring_mask(S))
    L = place(L_mask(S))
    u = S / 100.0
    star = place(star_mask(S, 47.8 * u, 15.0 * u, 7.0 * u))

    core = Image.new("L", (S, S), 0)
    ImageDraw.Draw(core).ellipse([S * 0.3, S * 0.28, S * 0.7, S * 0.68], fill=255)
    core = place(core.filter(ImageFilter.GaussianBlur(S * 0.09)))
    base = Image.composite(light, base, core.point(lambda v: int(v * 0.28)))
    base = Image.composite(light, base, rays.point(lambda v: int(v * 0.5)))
    base = Image.composite(light, base, glow(ring, size * 0.012, 1.4).point(lambda v: int(v * 0.6)))
    base = Image.composite(gold, base, ring)
    # L 뒤의 빛번짐
    base = Image.composite(light, base, glow(L, size * 0.03, 1.2).point(lambda v: int(v * 0.55)))
    base = Image.composite(gold, base, L)
    # L 위쪽 가장자리 하이라이트
    hl = ImageChops.subtract(L, L.transform(L.size, Image.AFFINE, (1, 0, 0, 0, 1, size * 0.006))).filter(ImageFilter.GaussianBlur(size * 0.002))
    base = Image.composite(white, base, hl.point(lambda v: int(v * 0.6)))
    # 별과 그 빛
    base = Image.composite(white, base, glow(star, size * 0.02, 1.6).point(lambda v: int(v * 0.8)))
    base = Image.composite(white, base, star)
    return base


def save_all():
    full = compose()
    full.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, "akael_icon_1024.png"))
    fg = compose(background=False, scale=0.74)            # 적응형 아이콘 전경 (안전 영역 안에)
    bgimg = night_background(S).convert("RGBA")           # 적응형 아이콘 배경
    # 앱 안에서 쓰는 로고: 밤하늘 배경을 둥글게 오려서 밝은/어두운 화면 모두에서 같게 보이도록
    logo = full.resize((512, 512), Image.LANCZOS)
    cm = Image.new("L", (2048, 2048), 0)
    ImageDraw.Draw(cm).ellipse([0, 0, 2047, 2047], fill=255)
    logo.putalpha(cm.resize((512, 512), Image.LANCZOS))
    logo.save(os.path.join(OUT, "akael_logo_512.png"))

    res = os.path.join(ROOT, "composeApp/src/androidMain/res")
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    adaptive = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for dens, px in legacy.items():
        d = os.path.join(res, f"mipmap-{dens}")
        os.makedirs(d, exist_ok=True)
        icon = full.resize((px, px), Image.LANCZOS)
        icon.convert("RGB").save(os.path.join(d, "ic_launcher.png"))
        # 둥근 아이콘
        mask = Image.new("L", (px * 4, px * 4), 0)
        ImageDraw.Draw(mask).ellipse([0, 0, px * 4 - 1, px * 4 - 1], fill=255)
        r = icon.copy(); r.putalpha(mask.resize((px, px), Image.LANCZOS))
        r.save(os.path.join(d, "ic_launcher_round.png"))
        a = adaptive[dens]
        fg.resize((a, a), Image.LANCZOS).save(os.path.join(d, "ic_launcher_foreground.png"))
        bgimg.resize((a, a), Image.LANCZOS).convert("RGB").save(os.path.join(d, "ic_launcher_background.png"))
    anydpi = os.path.join(res, "mipmap-anydpi-v26")
    os.makedirs(anydpi, exist_ok=True)
    xml = ('<?xml version="1.0" encoding="utf-8"?>\n'
           '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
           '    <background android:drawable="@mipmap/ic_launcher_background" />\n'
           '    <foreground android:drawable="@mipmap/ic_launcher_foreground" />\n'
           '    <monochrome android:drawable="@mipmap/ic_launcher_foreground" />\n'
           '</adaptive-icon>\n')
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        open(os.path.join(anydpi, name), "w").write(xml)

    shutil.copy(os.path.join(OUT, "akael_logo_512.png"), os.path.join(ROOT, "composeApp/src/commonMain/composeResources/drawable/akael_logo.png"))
    full.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "composeApp/src/jvmMain/resources/akael_icon.png"))
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "site/assets/akael.png"))


if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "composeApp/src/commonMain/composeResources/drawable"), exist_ok=True)
    save_all()
    print("done")
