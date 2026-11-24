"""
아카엘 (aka eL) 아이콘/로고 생성기.

컨셉: "El"은 히브리어로 '신'. 고대 주화·인장 같은 무채색 원형 문장 한가운데에
고전 세리프체(Cormorant Garamond Bold)로 새긴 eL. 정돈된 이중 고리와 새김 눈금,
은은한 빛줄기, 그 위의 작은 별 하나.

실행: python3 design/akael_icon.py   (결과물은 design/out/ 과 앱 리소스 폴더로 복사됨)
글꼴: design/fonts/ (SIL Open Font License)
"""
import math, os, shutil
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 2048
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, "out")
FONT = os.path.join(HERE, "fonts", "CormorantGaramond.ttf")
os.makedirs(OUT, exist_ok=True)

C = S / 2


def radial(size, inner, outer, cy=0.5, power=1.0):
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    d = np.clip(np.hypot(x - size / 2, y - size * cy) / (size * 0.72), 0, 1) ** power
    img = np.zeros((size, size, 3), np.float32)
    for i in range(3):
        img[..., i] = inner[i] + (outer[i] - inner[i]) * d
    return Image.fromarray(img.astype(np.uint8), "RGB")


def vertical(size, stops):
    """stops: [(t, (r,g,b)), ...] 위→아래 그라데이션"""
    t = np.linspace(0, 1, size, dtype=np.float32)
    col = np.zeros((size, 3), np.float32)
    for (t0, c0), (t1, c1) in zip(stops, stops[1:]):
        m = (t >= t0) & (t <= t1)
        k = ((t[m] - t0) / (t1 - t0))[:, None]
        col[m] = np.array(c0) + (np.array(c1) - np.array(c0)) * k
    return Image.fromarray(np.repeat(col[:, None, :], size, axis=1).astype(np.uint8), "RGB")


PLATINUM = [(0.0, (255, 255, 252)), (0.45, (222, 222, 216)), (0.75, (176, 176, 170)), (1.0, (128, 128, 124))]
SILVER_RING = [(0.0, (236, 236, 232)), (0.5, (170, 170, 166)), (1.0, (110, 110, 106))]


def ring(size, r, w, val=255):
    m = Image.new("L", (size, size), 0)
    R = size * r
    ImageDraw.Draw(m).ellipse([C - R, C - R, C + R, C + R], outline=val, width=max(1, int(size * w)))
    return m


def beads(size, r, n=72, dot=0.0062):
    """고대 주화 테두리의 구슬 장식."""
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    for i in range(n):
        a = 2 * math.pi * i / n - math.pi / 2
        x, y = C + size * r * math.cos(a), C + size * r * math.sin(a)
        rr = size * dot
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
    return m


def ticks(size, r1, r2, n=120, w=0.0028):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    for i in range(n):
        a = 2 * math.pi * i / n
        long = i % 5 == 0
        ra = size * (r1 if long else r1 + (r2 - r1) * 0.35)
        rb = size * r2
        d.line([(C + ra * math.cos(a), C + ra * math.sin(a)), (C + rb * math.cos(a), C + rb * math.sin(a))],
               fill=255 if long else 170, width=max(1, int(size * w)))
    return m


def sunburst(size, r_max=0.37, n=96):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    for i in range(n):
        a = 2 * math.pi * i / n
        r = size * (r_max if i % 2 == 0 else r_max * 0.78)
        d.line([(C, C), (C + r * math.cos(a), C + r * math.sin(a))], fill=255, width=max(1, int(size * 0.0016)))
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    dist = np.hypot(x - C, y - C) / (size * r_max)
    fade = np.clip(1 - dist, 0, 1) ** 1.3 * np.clip(dist / 0.18, 0, 1)  # 가운데는 비우고 바깥으로 희미하게
    return Image.fromarray((np.asarray(m, np.float32) * fade).astype(np.uint8), "L")


def star(size, cx, cy, r):
    m = Image.new("L", (size, size), 0)
    k = r * 0.13
    ImageDraw.Draw(m).polygon([(cx, cy - r), (cx + k, cy - k), (cx + r * 0.7, cy), (cx + k, cy + k),
                               (cx, cy + r), (cx - k, cy + k), (cx - r * 0.7, cy), (cx - k, cy - k)], fill=255)
    return m


def monogram(size, height_ratio=0.335, cy_ratio=0.535):
    """eL 글자 마스크 — 보이는 영역 기준으로 정중앙에 배치."""
    font = ImageFont.truetype(FONT, int(size * 0.5))
    font.set_variation_by_name("Bold")
    tmp = Image.new("L", (size * 2, size), 0)
    d = ImageDraw.Draw(tmp)
    x = size * 0.1
    d.text((x, 0), "e", font=font, fill=255)
    e_w = d.textlength("e", font=font)
    d.text((x + e_w - size * 0.012, 0), "L", font=font, fill=255)  # 살짝 좁혀 한 덩어리로
    box = tmp.getbbox()
    glyph = tmp.crop(box)
    scale = size * height_ratio / glyph.height
    glyph = glyph.resize((int(glyph.width * scale), int(glyph.height * scale)), Image.LANCZOS)
    m = Image.new("L", (size, size), 0)
    m.paste(glyph, (int(C - glyph.width / 2), int(size * cy_ratio - glyph.height / 2)))
    return m


def soft(mask, radius, gain):
    return mask.filter(ImageFilter.GaussianBlur(radius)).point(lambda v: min(255, int(v * gain)))


def compose(size=S, background=True, scale=1.0, outer=True):
    """outer=False: 바깥 구슬 고리를 뺀다 (런처가 모양대로 잘라내는 적응형 아이콘용)."""
    def place(mask):
        if scale == 1.0:
            return mask
        inner = int(size * scale)
        c = Image.new("L", (size, size), 0)
        c.paste(mask.resize((inner, inner), Image.LANCZOS), ((size - inner) // 2, (size - inner) // 2))
        return c

    base = (radial(size, (46, 46, 50), (8, 8, 10), cy=0.47, power=0.9).convert("RGBA") if background
            else Image.new("RGBA", (size, size), (0, 0, 0, 0)))
    white = Image.new("RGBA", (size, size), (255, 255, 250, 255))
    silver = vertical(size, SILVER_RING).convert("RGBA")
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 255))

    # 은은한 중심광과 빛줄기
    halo = Image.new("L", (size, size), 0)
    ImageDraw.Draw(halo).ellipse([C - size * 0.24, C - size * 0.22, C + size * 0.24, C + size * 0.26], fill=255)
    base = Image.composite(white, base, place(soft(halo, size * 0.08, 1.0)).point(lambda v: int(v * 0.16)))
    base = Image.composite(white, base, place(sunburst(size)).point(lambda v: int(v * 0.22)))

    # 이중 고리 + 새김 눈금 (주화 테두리)
    base = Image.composite(silver, base, place(ring(size, 0.395, 0.007)))
    if outer:
        base = Image.composite(silver, base, place(ring(size, 0.452, 0.0035)))
        base = Image.composite(silver, base, place(beads(size, 0.4235)).point(lambda v: int(v * 0.9)))

    # 별
    st = place(star(size, C, size * 0.245, size * 0.04))
    base = Image.composite(white, base, soft(st, size * 0.012, 1.5).point(lambda v: int(v * 0.6)))
    base = Image.composite(white, base, st)

    # eL: 그림자 → 백금 → 위쪽 하이라이트
    m = place(monogram(size))
    sh = m.transform(m.size, Image.AFFINE, (1, 0, -size * 0.004, 0, 1, -size * 0.008)).filter(ImageFilter.GaussianBlur(size * 0.006))
    base = Image.composite(shadow, base, sh.point(lambda v: int(v * 0.7)))
    base = Image.composite(white, base, soft(m, size * 0.02, 1.0).point(lambda v: int(v * 0.18)))
    # 글자 영역에 맞춘 백금 그라데이션 (위는 거의 흰색, 아래로 은회색)
    box = m.getbbox()
    top, bot = box[1] / size, box[3] / size
    stops = [(0.0, (250, 250, 246)), (top, (255, 255, 252)), (top + (bot - top) * 0.5, (226, 226, 220)),
             (bot, (150, 150, 145)), (1.0, (150, 150, 145))]
    letters = vertical(size, stops).convert("RGBA")
    base = Image.composite(letters, base, m)
    return base


def circle_alpha(img):
    big = Image.new("L", (img.width * 4, img.height * 4), 0)
    ImageDraw.Draw(big).ellipse([0, 0, big.width - 1, big.height - 1], fill=255)
    out = img.copy()
    out.putalpha(big.resize(img.size, Image.LANCZOS))
    return out


def save_all():
    full = compose()
    full.resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, "akael_icon_1024.png"))
    logo = circle_alpha(full.resize((512, 512), Image.LANCZOS))
    logo.save(os.path.join(OUT, "akael_logo_512.png"))
    fg = compose(background=False, scale=0.76, outer=False)  # 안쪽 고리 지름 ≈ 60% (안전 영역 안)
    bg = radial(S, (46, 46, 50), (8, 8, 10), cy=0.47, power=0.9)

    res = os.path.join(ROOT, "composeApp/src/androidMain/res")
    legacy = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
    adaptive = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
    for dens, px in legacy.items():
        d = os.path.join(res, f"mipmap-{dens}")
        os.makedirs(d, exist_ok=True)
        icon = full.resize((px, px), Image.LANCZOS)
        icon.convert("RGB").save(os.path.join(d, "ic_launcher.png"))
        circle_alpha(icon).save(os.path.join(d, "ic_launcher_round.png"))
        a = adaptive[dens]
        fg.resize((a, a), Image.LANCZOS).save(os.path.join(d, "ic_launcher_foreground.png"))
        bg.resize((a, a), Image.LANCZOS).save(os.path.join(d, "ic_launcher_background.png"))
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

    shutil.copy(os.path.join(OUT, "akael_logo_512.png"),
                os.path.join(ROOT, "composeApp/src/commonMain/composeResources/drawable/akael_logo.png"))
    full.resize((256, 256), Image.LANCZOS).save(os.path.join(ROOT, "composeApp/src/jvmMain/resources/akael_icon.png"))
    full.resize((512, 512), Image.LANCZOS).save(os.path.join(ROOT, "site/assets/akael.png"))


if __name__ == "__main__":
    save_all()
    print("done")
