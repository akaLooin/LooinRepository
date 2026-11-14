"""페즈뱅크 앱 아이콘을 코드로 그린다: 깃털 모양 만년필이 새겨진 금화.

- 바탕: 앱 주 색(잉크 네이비) 그라데이션
- 동전: 금빛 테두리 + 오목한 면, 테두리 안쪽에 점 31개(한 달의 날짜 = 캘린더 분위기)
- 각인: 대각선으로 놓인 깃털 펜. 위쪽은 깃털(깃대·깃가지 홈), 아래쪽은 만년필 펜촉(슬릿·숨구멍)
  새겨진(오목한) 느낌을 주려고 왼쪽 위에 그림자, 오른쪽 아래에 밝은 테를 깐다

모든 도형은 4배 크기로 그린 뒤 줄여서(슈퍼샘플링) 가장자리를 매끄럽게 한다.
사용: scripts/make_icons.py 가 불러 쓴다. 단독 실행하면 미리보기 PNG 를 만든다.
"""
import math
from PIL import Image, ImageChops, ImageDraw, ImageFilter

NAVY_TOP = (38, 70, 112)
NAVY_BOTTOM = (18, 34, 60)
GOLD_LIGHT = (250, 222, 148)
GOLD_MID = (226, 178, 84)
GOLD_DARK = (176, 124, 38)
FACE_TOP = (214, 160, 62)
FACE_BOTTOM = (244, 204, 118)
GROOVE = (168, 114, 30)
GROOVE_DEEP = (122, 80, 16)
SHINE = (255, 240, 196)

SS = 4  # 슈퍼샘플링 배율


def gradient(size, top, bottom):
    """대각선 선형 그라데이션(왼쪽 위 top → 오른쪽 아래 bottom). 작은 판에 계산한 뒤 부드럽게 키운다."""
    n = 256
    g = Image.new("L", (n, n))
    g.putdata([round(255 * (x + y) / (2 * (n - 1))) for y in range(n) for x in range(n)])
    g = g.resize(size, Image.BICUBIC)
    a = Image.new("RGB", size, top)
    b = Image.new("RGB", size, bottom)
    return Image.composite(b, a, g)


def circle_mask(size, cx, cy, r):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    return m


class Pen:
    """동전 중심 (cx, cy), 반지름 R 기준의 펜 좌표계. u = 펜 축(왼쪽 아래 → 오른쪽 위), v = 축에 수직."""

    def __init__(self, cx, cy, R):
        self.cx, self.cy, self.R = cx, cy, R * 1.15  # 면을 넉넉히 채우도록 조금 키움
        s = 1 / math.sqrt(2)
        self.d = (s, -s)   # 오른쪽 위
        self.n = (s, s)    # 오른쪽 아래

    def p(self, u, v):
        return (self.cx + (u * self.d[0] + v * self.n[0]) * self.R,
                self.cy + (u * self.d[1] + v * self.n[1]) * self.R)

    # 깃털: 축이 끝으로 갈수록 살짝 휜다
    U0, U1 = -0.20, 0.80

    def bend(self, t):
        return 0.07 * t * t

    def feather_outline(self, steps=80):
        upper, lower = [], []
        for i in range(steps + 1):
            t = i / steps
            u = self.U0 + (self.U1 - self.U0) * t
            c = self.bend(t)
            base = 0.10  # 아래쪽 10%는 깃이 없는 깃대
            if t < base:
                wu = wl = 0.022
            else:
                k = (t - base) / (1 - base)
                shape = math.sin(math.pi * min(1.0, k * 0.98 + 0.02)) ** 0.75
                wu = 0.215 * shape * (1 - 0.22 * k) + 0.012
                wl = 0.140 * shape * (1 - 0.10 * k) + 0.012
            upper.append(self.p(u, c - wu))
            lower.append(self.p(u, c + wl))
        tip = self.p(self.U1 + 0.035, self.bend(1.0) + 0.01)
        return upper + [tip] + lower[::-1]

    def shaft(self, steps=40):
        pts = []
        for i in range(steps + 1):
            t = i / steps
            pts.append(self.p(self.U0 + (self.U1 - self.U0) * t * 0.97, self.bend(t)))
        return pts

    def _edge(self, t, side):
        """깃 가장자리 위치(side: -1 위쪽, +1 아래쪽)."""
        base = 0.10
        k = (t - base) / (1 - base)
        shape = math.sin(math.pi * min(1.0, k * 0.98 + 0.02)) ** 0.75
        w = (0.215 * shape * (1 - 0.22 * k) if side < 0 else 0.140 * shape * (1 - 0.10 * k)) + 0.012
        return self.bend(t) + side * w

    def _uv(self, t):
        return self.U0 + (self.U1 - self.U0) * t

    def notches(self):
        """깃이 갈라진 틈: 가장자리에서 깃대 쪽으로 파고든 쐐기(깃털로 보이게 하는 핵심)."""
        out = []
        for t, side, depth in [(0.34, -1, 0.55), (0.55, -1, 0.45), (0.74, -1, 0.40), (0.47, 1, 0.50), (0.70, 1, 0.40)]:
            u = self._uv(t)
            c = self.bend(t)
            e = self._edge(t, side)
            ein = c + (e - c) * (1 - depth)
            out.append([self.p(u + 0.035, e + side * 0.03), self.p(u - 0.035, ein), self.p(u - 0.005, e + side * 0.03)])
        return out

    def barb_cuts(self):
        """깃가지 결: 깃대에서 바깥·끝 쪽으로 비스듬한 가는 선."""
        cuts = []
        t = 0.16
        while t < 0.94:
            for side in (-1, 1):
                c = self.bend(t)
                e = self._edge(t + 0.05, side)
                cuts.append((self.p(self._uv(t), c + side * 0.015), self.p(self._uv(t + 0.07), c + (e - c) * 0.92)))
            t += 0.055
        return cuts

    def nib(self):
        """만년필 펜촉: 어깨가 둥근 방패 모양, 끝이 뾰족."""
        pts = []
        top, shoulder, tip = -0.30, -0.45, -0.78
        half = 0.088
        # 위쪽 가장자리(펜대 쪽) → 오른쪽 어깨 → 끝 → 왼쪽 어깨
        pts.append(self.p(top, -half))
        pts.append(self.p(top, half))
        for i in range(1, 13):
            a = i / 12
            u = top + (shoulder - top) * a
            v = half + 0.012 * math.sin(math.pi * a)
            pts.append(self.p(u, v))
        for i in range(1, 17):
            a = i / 16
            u = shoulder + (tip - shoulder) * a
            v = half * (1 - a) ** 1.15
            pts.append(self.p(u, v))
        for i in range(16, 0, -1):
            a = i / 16
            u = shoulder + (tip - shoulder) * a
            v = -half * (1 - a) ** 1.15
            pts.append(self.p(u, v))
        for i in range(12, 0, -1):
            a = i / 12
            u = top + (shoulder - top) * a
            v = -half - 0.012 * math.sin(math.pi * a)
            pts.append(self.p(u, v))
        return pts

    def collar(self):
        a, b, h = -0.30, -0.20, 0.072
        return [self.p(a, -h), self.p(b, -h * 0.85), self.p(b, h * 0.85), self.p(a, h)]


def engraving_mask(size, pen):
    m = Image.new("L", size, 0)
    d = ImageDraw.Draw(m)
    d.polygon(pen.feather_outline(), fill=255)
    for tri in pen.notches():
        d.polygon(tri, fill=0)
    d.polygon(pen.nib(), fill=255)
    d.polygon(pen.collar(), fill=255)
    return m


def coin(size, cx, cy, R, mono=False):
    """동전 하나를 RGBA 로 그린다(배경 투명). mono=True 면 흰 실루엣(Android 테마 아이콘)."""
    W, H = size
    img = Image.new("RGBA", size, (0, 0, 0, 0))
    rim = circle_mask(size, cx, cy, R)
    face_r = R * 0.80
    face = circle_mask(size, cx, cy, face_r)
    pen = Pen(cx, cy, face_r)
    eng = engraving_mask(size, pen)
    lw = max(1, round(R * 0.018))

    if mono:
        # 테두리 고리 + 각인(펜)만 남기고 나머지는 비운다 → 시스템이 단색으로 칠함
        ring = ImageChops.subtract(rim, circle_mask(size, cx, cy, R * 0.86))
        dots = Image.new("L", size, 0)
        dd = ImageDraw.Draw(dots)
        for i in range(31):
            a = 2 * math.pi * i / 31 - math.pi / 2
            x, y = cx + math.cos(a) * R * 0.80, cy + math.sin(a) * R * 0.80
            r = R * 0.022
            dd.ellipse((x - r, y - r, x + r, y + r), fill=255)
        alpha = ImageChops.lighter(ImageChops.lighter(ring, dots), eng)
        cut = Image.new("L", size, 0)
        cd = ImageDraw.Draw(cut)
        tipu = pen.p(-0.76, 0), pen.p(-0.52, 0)
        cd.line(tipu, fill=255, width=lw * 2)
        hx, hy = pen.p(-0.50, 0); hr = face_r * 0.03
        cd.ellipse((hx - hr, hy - hr, hx + hr, hy + hr), fill=255)
        alpha = ImageChops.subtract(alpha, cut)
        white = Image.new("RGBA", size, (255, 255, 255, 255))
        img.paste(white, (0, 0), alpha)
        return img

    # 그림자
    shadow = Image.new("RGBA", size, (0, 0, 0, 0))
    sh = circle_mask(size, cx + R * 0.05, cy + R * 0.09, R * 1.0)
    shadow.paste((0, 0, 0, 120), (0, 0), sh)
    shadow = shadow.filter(ImageFilter.GaussianBlur(R * 0.08))
    img.alpha_composite(shadow)

    # 테두리(밝은 왼쪽 위 → 어두운 오른쪽 아래)
    img.paste(gradient(size, GOLD_LIGHT, GOLD_DARK), (0, 0), rim)
    # 테두리 바깥 선
    ImageDraw.Draw(img).ellipse((cx - R, cy - R, cx + R, cy + R), outline=GOLD_DARK + (255,), width=lw)
    # 오목한 면(반대 방향 그라데이션) + 안쪽 테
    img.paste(gradient(size, FACE_TOP, FACE_BOTTOM), (0, 0), face)
    d = ImageDraw.Draw(img)
    d.ellipse((cx - face_r, cy - face_r, cx + face_r, cy + face_r), outline=GOLD_DARK + (255,), width=lw)
    # 날짜 점 31개(테두리 위)
    for i in range(31):
        a = 2 * math.pi * i / 31 - math.pi / 2
        x, y = cx + math.cos(a) * R * 0.90, cy + math.sin(a) * R * 0.90
        r = R * 0.014
        d.ellipse((x - r, y - r, x + r, y + r), fill=(196, 146, 58, 255))

    # 각인: 오른쪽 아래 밝은 테, 왼쪽 위 그림자, 그 위에 홈 색
    o = max(1, round(face_r * 0.018))
    hi = ImageChops.offset(eng, o, o)
    lo = ImageChops.offset(eng, -o, -o)
    img.paste(SHINE + (255,), (0, 0), ImageChops.multiply(hi, face))
    img.paste(GROOVE_DEEP + (255,), (0, 0), ImageChops.multiply(lo, face))
    img.paste(gradient(size, GROOVE_DEEP, GROOVE), (0, 0), eng)

    # 세부: 깃대(밝은 선), 깃가지 홈(면 색), 펜촉 슬릿·숨구멍(진한 홈)
    d = ImageDraw.Draw(img)
    d.line(pen.shaft(), fill=(236, 196, 112, 255), width=round(lw * 1.4), joint="curve")
    for a, b in pen.barb_cuts():
        d.line([a, b], fill=(196, 140, 52, 255), width=max(1, round(lw * 0.7)))
    d.line([pen.p(-0.765, 0), pen.p(-0.52, 0)], fill=GROOVE_DEEP + (255,), width=round(lw * 1.3))
    hx, hy = pen.p(-0.50, 0)
    hr = face_r * 0.028
    d.ellipse((hx - hr, hy - hr, hx + hr, hy + hr), fill=(236, 196, 112, 255))
    # 펜대와 펜촉 사이 띠의 선
    a1, a2 = pen.p(-0.255, -0.07), pen.p(-0.255, 0.07)
    d.line([a1, a2], fill=(226, 184, 98, 255), width=lw)

    # 테두리 왼쪽 위 반짝임
    glare = Image.new("L", size, 0)
    ImageDraw.Draw(glare).arc((cx - R * 0.94, cy - R * 0.94, cx + R * 0.94, cy + R * 0.94), 200, 260, fill=170, width=round(R * 0.035))
    glare = glare.filter(ImageFilter.GaussianBlur(R * 0.012))
    img.paste((255, 255, 255, 255), (0, 0), glare)
    return img


def render(size, kind="full", coin_ratio=0.36):
    """kind: full(바탕+동전, 정사각) / foreground(투명+동전) / monochrome(흰 실루엣) / background(바탕만)."""
    S = size * SS
    canvas = (S, S)
    if kind == "background":
        out = gradient(canvas, NAVY_TOP, NAVY_BOTTOM).convert("RGBA")
    else:
        out = gradient(canvas, NAVY_TOP, NAVY_BOTTOM).convert("RGBA") if kind == "full" else Image.new("RGBA", canvas, (0, 0, 0, 0))
        out.alpha_composite(coin(canvas, S / 2, S / 2, S * coin_ratio, mono=(kind == "monochrome")))
    return out.resize((size, size), Image.LANCZOS)


if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "icon-preview.png"
    render(1024).save(path)
    print(path)
