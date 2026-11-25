"""테일즈토피아 RPG — 최종 그래픽 예상도 (필드 전투). 600x270 픽셀 → x4 업스케일.
모든 캐릭터·몬스터·UI 는 오리지널 디자인."""
import math, random, sys
from PIL import Image, ImageDraw, ImageFont

W, H = 600, 270
SCALE = 4
random.seed(3)
HERE = sys.argv[1] if len(sys.argv) > 1 else "."

def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

OUT = C("1b1530")
img = Image.new("RGBA", (W, H), C("f6e8cc"))
d = ImageDraw.Draw(img)

F11 = ImageFont.truetype(f"{HERE}/Galmuri11.ttf", 11)
F11B = ImageFont.truetype(f"{HERE}/Galmuri11-Bold.ttf", 11)
F9 = ImageFont.truetype(f"{HERE}/Galmuri9.ttf", 10)
F22 = ImageFont.truetype(f"{HERE}/Galmuri11-Bold.ttf", 22)
d.fontmode = "1"

BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(4))

def dither_grad(x0, y0, x1, y1, c0, c1, steps=6):
    """세로 그라데이션을 단계별 색 + 베이어 디더링으로."""
    cols = [lerp(c0, c1, i / (steps - 1)) for i in range(steps)]
    hgt = y1 - y0
    for y in range(y0, y1):
        f = (y - y0) / max(1, hgt - 1) * (steps - 1)
        i = int(f)
        frac = f - i
        for x in range(x0, x1):
            j = min(steps - 1, i + (1 if frac * 16 > BAYER[y % 4][x % 4] else 0))
            img.putpixel((x, y), cols[j])

def blend_px(x, y, col):
    if 0 <= x < W and 0 <= y < H:
        base = img.getpixel((x, y))
        a = col[3] / 255
        img.putpixel((x, y), tuple(int(base[i] * (1 - a) + col[i] * a) for i in range(3)) + (255,))

def rect(x, y, w, h, col):
    if col[3] == 255:
        d.rectangle([x, y, x + w - 1, y + h - 1], fill=col)
    else:
        for yy in range(y, y + h):
            for xx in range(x, x + w):
                blend_px(xx, yy, col)

def sprite(grid, pal, x, y, flip=False, outline=OUT, white=False):
    """문자 격자 → 스프라이트. 외곽선 자동 생성. (x,y)=왼쪽 위."""
    h = len(grid); w = max(len(r) for r in grid)
    cells = {}
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch != ".":
                ii = w - 1 - i if flip else i
                cells[(ii, j)] = (255, 255, 255, 255) if white else pal[ch]
    if outline:
        for (i, j) in list(cells):
            for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (i + di, j + dj)
                if n not in cells:
                    blend_px(x + n[0], y + n[1], outline)
    for (i, j), col in cells.items():
        blend_px(x + i, y + j, col)

def text(x, y, s, col, font=F11, outline=OUT, center=False):
    if center:
        x -= d.textlength(s, font=font) / 2
    if outline:
        for ox, oy in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (1, -1), (-1, 1)):
            d.text((x + ox, y + oy), s, font=font, fill=outline)
    d.text((x, y), s, font=font, fill=col)

# ───────────────────────── 배경 ─────────────────────────
dither_grad(0, 0, W, 200, C("f8eed6"), C("e9c596"), 7)

# 페이지 태양: 글줄이 적힌 둥근 종이
cx, cy, r = 470, 62, 30
for y in range(cy - r - 6, cy + r + 7):
    for x in range(cx - r - 6, cx + r + 7):
        dd = math.hypot(x - cx, y - cy)
        if dd <= r:
            blend_px(x, y, C("fff7e2"))
        elif dd <= r + 6 and BAYER[y % 4][x % 4] < (r + 6 - dd) * 2.5:
            blend_px(x, y, C("fff3d6", 200))
for i, yy in enumerate(range(cy - 18, cy + 20, 5)):
    half = int(math.sqrt(max(0, r * r - (yy - cy) ** 2))) - 6
    if half > 4:
        rect(cx - half, yy, half * 2 - (i * 7 % 11), 1, C("e2cfa8"))

# 잉크 구름 띠
for (x0, y0, w0) in [(40, 40, 120), (230, 28, 90), (330, 70, 70), (520, 110, 60)]:
    for k in range(3):
        rect(x0 + k * 10, y0 + k * 4, w0 - k * 20, 3, C("e8d3b5"))
        rect(x0 + k * 10 + 4, y0 + k * 4 + 3, w0 - k * 20 - 8, 1, C("d9bfa0"))

# 먼 배경: 거인의 책들(도시 실루엣)
x = -10
i = 0
while x < W + 20:
    bw = 18 + (i * 37) % 22
    bh = 50 + (i * 53) % 60
    lean = (i % 5 == 2)
    base = 204
    colA = C("dcbf94") if i % 2 else C("d4b487")
    for yy in range(base - bh, base):
        off = int((base - yy) * 0.25) if lean else 0
        rect(x + off, yy, bw, 1, colA)
    rect(x + (int(bh * 0.25) if lean else 0), base - bh, bw, 2, C("ead3ab"))
    for k in range(2):
        yy = base - bh + 8 + k * (bh // 3)
        rect(x + (int((base - yy) * 0.25) if lean else 0) + 2, yy, bw - 4, 2, C("c9a676"))
    x += bw + 2 + (i * 7) % 6
    i += 1

# 먼 땅 띠 (종이 풀밭)
rect(0, 204, W, 22, C("caa77a"))
for x in range(0, W, 3):
    if (x * 7) % 5 == 0:
        rect(x, 204, 2, 1, C("b8956a"))
for x in range(0, W, 5):
    hh = 2 + (x * 13) % 4
    rect(x, 226 - hh, 1, hh, C("b8956a"))
    rect(x + 2, 226 - hh + 1, 1, hh - 1, C("d9bb8a"))

# 중경: 잉크로 그린 동화 나무
def ink_tree(tx, ty, s):
    trunk = C("4a3858"); dark = C("3a2a4a"); mid = C("5b4a72"); hi = C("7a6898")
    th = 30 * s // 10
    rect(tx - 3, ty - th, 7, th, OUT)
    rect(tx - 2, ty - th, 5, th, trunk)
    rect(tx - 1, ty - th, 1, th, C("6b5880"))
    rect(tx - 7, ty - 3, 15, 3, trunk)
    rect(tx + 2, ty - th // 2, 7, 2, trunk)
    for (ox, oy, rr) in [(0, -40, 14), (-12, -33, 10), (12, -32, 10), (0, -51, 9)]:
        ox, oy, rr = ox * s // 10, oy * s // 10, rr * s // 10
        for y in range(-rr, rr + 1):
            for x in range(-rr, rr + 1):
                dd = math.hypot(x, y)
                if dd <= rr:
                    col = mid
                    if x + y < -rr * 0.6:
                        col = hi if (x + y) % 2 == 0 else mid
                    elif x + y > rr * 0.5:
                        col = dark if (x ^ y) & 1 else mid
                    blend_px(tx + ox + x, ty + oy + y, col)
                elif dd <= rr + 1:
                    blend_px(tx + ox + x, ty + oy + y, OUT)
    # 나뭇가지에 걸린 책갈피 리본
    rect(tx + 9 * s // 10, ty - 22 * s // 10, 1, 8, C("d64a5a"))
    rect(tx + 9 * s // 10 - 1, ty - 14 * s // 10, 3, 2, C("d64a5a"))

for (tx, s) in [(60, 12), (175, 9), (520, 11), (588, 8)]:
    ink_tree(tx, 228, s)


# ───────────────────────── 지면: 층층이 쌓인 페이지 ─────────────────────────
GY = 226
rect(0, GY - 1, W, 1, OUT)
rect(0, GY, W, 3, C("f6ebcd"))
rect(0, GY + 3, W, 1, C("d9c39a"))
strata = [C("ead8ad"), C("dcc595"), C("e5d1a4"), C("cdb281"), C("d8c08e"), C("bfa271"), C("b0915f"), C("9c7e52")]
y = GY + 4
k = 0
while y < H:
    rect(0, y, W, 3, strata[k % len(strata)])
    rect(0, y + 3, W, 1, C("a88a5c") if k < 4 else C("7d6040"))
    y += 4
    k += 1
# 페이지 모서리 들뜸 + 글자 자국
for x in range(10, W, 47):
    rect(x, GY + 1, 14, 1, C("e6d6b0"))
    rect(x + 20, GY + 9, 9, 1, C("c2a674"))

# 잉크 오염 웅덩이
def puddle(px_, w_):
    for xx in range(-w_, w_ + 1):
        hh = int(math.sqrt(max(0, 1 - (xx / w_) ** 2)) * 3)
        for yy in range(0, hh + 1):
            blend_px(px_ + xx, GY + yy, C("2b1f4a"))
    rect(px_ - w_ // 2, GY, w_ // 2, 1, C("6a52b8"))

puddle(318, 22)
puddle(452, 14)

# 떠 있는 펼친 책 발판
def book_platform(x0, y0, w0, cover):
    rect(x0 + 2, y0 + 7, w0 - 4, 3, C("2a1f38", 90))  # 그림자
    rect(x0, y0 + 3, w0, 4, cover)
    rect(x0, y0 + 6, w0, 1, OUT)
    mid_ = x0 + w0 // 2
    for xx in range(x0 + 1, x0 + w0 - 1):
        curve = int(2 * (1 - abs(xx - mid_) / (w0 / 2)))
        rect(xx, y0 - curve + 2, 1, 2 + curve, C("fbf3dc"))
        blend_px(xx, y0 - curve + 1, OUT)
    rect(mid_, y0 - 1, 1, 5, C("c9b28a"))
    for k_ in range(3):
        rect(x0 + 6, y0 + 1 + k_ * 0, 1, 1, C("fbf3dc"))
    for xx in range(x0 + 5, mid_ - 3, 6):
        rect(xx, y0 + 3, 4, 1, C("cfbd99"))
    for xx in range(mid_ + 4, x0 + w0 - 5, 6):
        rect(xx, y0 + 3, 4, 1, C("cfbd99"))
    rect(x0 + w0 - 12, y0 + 7, 2, 6, C("d64a5a"))  # 리본

book_platform(116, 170, 92, C("3f5f8a"))
book_platform(372, 140, 84, C("7a3f2e"))

# ───────────────────────── 캐릭터 / 몬스터 ─────────────────────────
HERO = {
    "h": C("5a3a2a"), "H": C("82563a"), "s": C("f3cfab"), "S": C("d9a383"), "e": C("1b1530"),
    "c": C("2f3a7a"), "C": C("1f2754"), "k": C("4f60b0"), "g": C("e8b64c"), "G": C("b4842f"),
    "w": C("f6eedb"), "W": C("cbbb93"), "b": C("4a3326"), "B": C("2e1f17"), "p": C("26304f"),
}
hero = [
    ".......hhhhh..........",
    ".....hhHHHhhh.........",
    "....hhHHhhhhhh........",
    "...hhhhhhhhhhhh.......",
    "...hhhhsssshhhh.......",
    "..whhhssssesss........",
    "..wwhsssssesss........",
    "..ww.hSssssss.........",
    "...w..SSSSSS..........",
    "wwwwwwwwwwwww.........",
    ".WwwwwWWwwwwwg........",
    "..WW.ckkcccccgss......",
    ".....ckkkccccgsss.....",
    "....cckkcccccgss......",
    "....cckccccCCg........",
    "...ccckccccCCg........",
    "...cckkcccCCCg........",
    "...ggggggggggg........",
    "...cccCcccCCCC........",
    "..ccccCcccCCCCc.......",
    "..cccCC...ccCCCc......",
    ".cccCC.....cCCCcc.....",
    ".ccCC.......ppCCcc....",
    ".pppp........pppbb....",
    ".bbbb.........bbbbb...",
    "bbbbbB........bbbbbB..",
]
SWORD = {"B": C("e9f0f7"), "b": C("aab8c8"), "g": C("e8b64c"), "r": C("d64a5a"), "R": C("9c2f3d"), "l": C("6b3a24")}
sword = [
    "..........BBBBBBBBBBBBBBBBB..",
    "..gg.llll.BBBBBBBBBBBBBBBBBBB",
    "..ggglllgbBBBBBBBBBBBBBBBBBb.",
    "..gg.....bbbbbbbbbbbbbbbbb...",
    ".rr..........................",
    "rrR..........................",
    ".rR..........................",
    "..R..........................",
]

INK = {"I": C("2b1f4a"), "J": C("7a62c8"), "j": C("4b3a86"), "Y": C("ffe76a"), "K": C("150f24"), "w": C("ffffff")}
blob = [
    ".....IIIIII.....",
    "...IIIIIIIIII...",
    "..IIjjIIIIIIII..",
    ".IIjJJjIIIIIIII.",
    ".IIjJjIIIIIIIII.",
    "IIIjjIIIYYIIYYII",
    "IIIIIIIIYwIIYwII",
    "IIIIIIIIYYIIYYII",
    "IIIIIIIIIIIIIIII",
    "IIIIIIIKKKKIIIII",
    "IIIIIIIIIIIIIIII",
    ".IIIKIIIIIIIKIII",
    "KKI..KKIIKK..KIK",
]
CRANE = {"p": C("fbf8ef"), "P": C("ddd5c2"), "q": C("bfb59f"), "r": C("d64a5a"), "i": C("2b1f4a")}
crane = [
    "......p.............",
    ".....ppP............",
    "....pppPP...........",
    "...ppppPPP......ii..",
    "..pppppPPPq....piir.",
    ".ppppppPPPPq..ppPq..",
    "ppppppppPPPPppPPq...",
    "..qqPPPPPPPPPPPq....",
    "....qqPPPPPPPPq.....",
    ".......qqPPPq.......",
    "..........qq........",
]

# 몬스터: 맞고 있는 잉크(흰 번쩍임), 다가오는 잉크, 발판 위 잉크
sprite(blob, INK, 292, GY - 13 - 3, white=True)          # 피격 프레임
sprite(blob, INK, 333, GY - 13, flip=True)
sprite(blob, INK, 400, 140 - 13 + 1, flip=True)
sprite(crane, CRANE, 352, 86, flip=True)
sprite(crane, CRANE, 486, 118, flip=True)
# 종이학이 쏜 잉크탄
for (bx, by) in [(330, 110), (322, 116)]:
    rect(bx, by, 5, 5, C("2b1f4a")); rect(bx + 1, by + 1, 2, 2, C("7a62c8"))
rect(338, 103, 3, 1, C("2b1f4a", 150)); rect(343, 101, 2, 1, C("2b1f4a", 100))

# 히어로 그림자 + 본체 + 검
for xx in range(-12, 13):
    blend_px(236 + xx, GY + 1, C("2a1f38", 110))
HX, HY = 224, GY - 26
# (궤적은 히어로 뒤에 그린 뒤 앞쪽 가장자리를 덧그림)
sprite(hero, HERO, HX, HY)
sprite(sword, SWORD, HX + 13, HY + 11)
# 베기 궤적: 크림색 초승달 + 잉크 가장자리, 칼끝 방향으로 굵어짐
for a in range(-80, 70):
    rad = math.radians(a)
    t = (a + 80) / 150
    thick = 2 + int(9 * math.sin(t * math.pi))
    for rr in range(34 - thick, 35):
        x_ = int(250 + math.cos(rad) * rr * 1.15)
        y_ = int(GY - 15 + math.sin(rad) * rr * 0.95)
        if rr >= 34:
            blend_px(x_, y_, C("2b1f4a", int(255 * min(1, t * 1.6))))
        else:
            blend_px(x_, y_, C("fffaf0", int(235 * min(1, t * 1.4))))
    if a % 9 == 0 and t > 0.4:   # 흩날리는 잉크 방울
        blend_px(int(250 + math.cos(rad) * 41), int(GY - 15 + math.sin(rad) * 38), C("2b1f4a"))

# 히트 스파크: 흩어지는 활자 조각
def spark(sx, sy):
    for k in range(-9, 10):
        blend_px(sx + k, sy, C("fffbe8", 255 - abs(k) * 22))
        blend_px(sx, sy + k, C("fffbe8", 255 - abs(k) * 22))
    for k in range(-5, 6):
        blend_px(sx + k, sy + k, C("ffd23f", 220 - abs(k) * 30))
        blend_px(sx + k, sy - k, C("ffd23f", 220 - abs(k) * 30))
    glyphs = [["XXX", "..X", "..X"], ["X.X", "XXX", "X.X"], ["XXX", "X..", "XXX"], [".X.", "XXX", ".X."]]
    for n, (gx, gy) in enumerate([(14, -12), (18, 4), (-16, -10), (8, 12), (-12, 8)]):
        g = glyphs[n % len(glyphs)]
        for j, row in enumerate(g):
            for i, ch in enumerate(row):
                if ch == "X":
                    blend_px(sx + gx + i, sy + gy + j, C("2b1f4a"))

spark(298, GY - 12)
for n in range(16):
    a = random.uniform(0, math.tau); rr = random.uniform(6, 22)
    rect(int(298 + math.cos(a) * rr), int(GY - 12 + math.sin(a) * rr * 0.7), 2, 2, random.choice([C("2b1f4a"), C("7a62c8"), C("fffbe8")]))

# 떠다니는 금빛 글자 먼지
for n in range(26):
    x_ = random.randint(0, W - 1); y_ = random.randint(20, 200)
    blend_px(x_, y_, C("f0c35a", 230)); blend_px(x_ + 1, y_, C("f0c35a", 120)); blend_px(x_, y_ - 1, C("fff1b8", 120))

# 데미지 숫자
text(282, 166, "1,284", C("ffd23f"), F22)
text(290, 158, "CRITICAL", C("ff8bd1"), F9)
text(338, 188, "612", C("fffbe8"), F11B)

# 비네트
for y in range(H):
    for x in range(W):
        dx = (x - W / 2) / (W / 2); dy = (y - H / 2) / (H / 2)
        v = dx * dx * 0.6 + dy * dy * 0.4
        if v > 0.55 and BAYER[y % 4][x % 4] < (v - 0.55) * 30:
            blend_px(x, y, C("2a1830", 60))

# 전경 깃털 풀 실루엣
for (fx, fl, s) in [(4, 30, 1), (14, 22, 1), (22, 34, 1), (578, 28, -1), (590, 20, -1)]:
    for k in range(fl):
        xx = fx + int(math.sin(k / 6) * 3 * s)
        rect(xx, H - k, 3 if k < fl - 6 else 2, 1, C("2a1f38"))
        if k % 3 == 0:
            rect(xx - 2 * s if s > 0 else xx + 3, H - k, 2, 1, C("2a1f38"))

# ───────────────────────── HUD ─────────────────────────
def frame(x, y, w, h, fill=C("2a2346"), border=C("e8b64c")):
    rect(x, y, w, h, OUT)
    rect(x + 1, y + 1, w - 2, h - 2, border)
    rect(x + 2, y + 2, w - 4, h - 4, fill)
    for (cx_, cy_) in [(x, y), (x + w - 3, y), (x, y + h - 3), (x + w - 3, y + h - 3)]:
        rect(cx_, cy_, 3, 3, C("fff1b8"))

# 장서표(Bookplate) 초상
frame(6, 6, 30, 30, C("3f2b4f"))
face = [
    "..hhhhhh..", ".hhHHhhhh.", "hhhhhhhhhh", "hhsssssshh", "hssesssesh",
    ".ssssssss.", "..sSSSSs..", ".wwwwwwww.", "wccccccccw", "cckcccccCc",
]
sprite(face, HERO, 11, 12, outline=None)
text(10, 37, "Lv.12", C("fff1b8"), F9)

# 이름 리본
rect(40, 6, 70, 11, C("7a3f2e")); rect(40, 6, 70, 1, C("a8624a")); rect(40, 16, 70, 1, OUT)
rect(108, 6, 4, 11, C("7a3f2e")); blend_px(111, 11, C("f6e8cc"))
text(44, 6, "견습 사서", C("fff1b8"), F9, outline=None)
# HP: 붉은 잉크가 든 유리관
rect(40, 19, 132, 9, OUT); rect(41, 20, 130, 7, C("3b1d26"))
rect(41, 20, 101, 7, C("e2574c")); rect(41, 20, 101, 2, C("ff8a76")); rect(41, 25, 101, 2, C("b23a3a"))
rect(40, 18, 4, 11, C("e8b64c")); rect(168, 18, 4, 11, C("e8b64c"))
text(176, 18, "2,340", C("fffbe8"), F9)
# MP: 책갈피 리본 3개
for i_ in range(3):
    bx = 40 + i_ * 22
    full = i_ < 2
    rect(bx, 30, 18, 12, OUT)
    col = C("4fb3ff") if full else C("1a2a44")
    rect(bx + 1, 31, 16, 10, col)
    if full:
        rect(bx + 1, 31, 16, 2, C("a9dcff"))
    else:
        rect(bx + 1, 37, 16, 4, C("2f6aa8"))
    blend_px(bx + 8, 41, OUT); blend_px(bx + 9, 40, OUT); blend_px(bx + 9, 41, C("f6e8cc"))
text(108, 31, "MP", C("a9dcff"), F9)

# 상단 중앙: 장 제목 두루마리 + 페이지 진행
tw = 170; tx = W // 2 - tw // 2
rect(tx, 5, tw, 15, OUT); rect(tx + 1, 6, tw - 2, 13, C("efe3c2")); rect(tx + 1, 17, tw - 2, 2, C("cbbb93"))
rect(tx - 6, 7, 7, 11, C("cbbb93")); rect(tx + tw - 1, 7, 7, 11, C("cbbb93"))
text(W // 2, 6, "얼룩진 동화책 · 1장 3쪽", C("3b2a22"), F11, outline=None, center=True)
for i_ in range(5):
    px_ = W // 2 - 24 + i_ * 12
    col = C("e8b64c") if i_ < 2 else (C("d64a5a") if i_ == 2 else C("6b5a7a"))
    rect(px_, 24, 7, 9, OUT); rect(px_ + 1, 25, 5, 7, col)
    if i_ == 4:
        rect(px_ + 2, 27, 3, 3, C("1b1530"))  # 보스 페이지
text(W // 2, 34, "3:12", C("fff1b8"), F9, center=True)

# 오른쪽 위: 골드 + 일시정지(책갈피)
rect(W - 92, 8, 9, 9, OUT); rect(W - 91, 9, 7, 7, C("e8b64c")); rect(W - 90, 10, 3, 2, C("fff1b8"))
text(W - 80, 7, "1,560", C("fff1b8"), F11)
rect(W - 26, 4, 18, 20, OUT); rect(W - 25, 5, 16, 16, C("d64a5a"))
rect(W - 25, 21, 7, 3, C("d64a5a")); rect(W - 16, 21, 7, 3, C("d64a5a"))
rect(W - 21, 9, 3, 8, C("fff1b8")); rect(W - 15, 9, 3, 8, C("fff1b8"))

# 콤보
text(W - 120, 58, "24", C("ffd23f"), F22)
text(W - 92, 66, "HIT", C("fffbe8"), F11B)
text(W - 128, 82, "BACK ATTACK!", C("ff8bd1"), F9)
rect(W - 126, 92, 80, 3, OUT); rect(W - 125, 93, 54, 1, C("ffd23f"))

# 가상 패드 (반투명 + 장식 링)
pcx, pcy = 62, 218
for y in range(-34, 35):
    for x in range(-34, 35):
        dd = math.hypot(x, y)
        if 31 <= dd <= 33:
            blend_px(pcx + x, pcy + y, C("fff1b8", 150))
        elif dd < 31:
            blend_px(pcx + x, pcy + y, C("1b1530", 60))
        if 11 >= dd:
            blend_px(pcx + 10 + x, pcy - 2 + y, C("efe3c2", 170 if dd < 10 else 230))
for ang in range(0, 360, 90):
    ax = pcx + int(math.cos(math.radians(ang)) * 25); ay = pcy + int(math.sin(math.radians(ang)) * 25)
    rect(ax - 1, ay - 1, 3, 3, C("fff1b8", 200))

# 오른쪽 아래 버튼: 공격(깃펜 검), 점프, 대시, 밀랍 인장 필살기 1·2·3, 포션
def round_btn(cx_, cy_, r_, fill, ring, alpha=200):
    for y in range(-r_ - 1, r_ + 2):
        for x in range(-r_ - 1, r_ + 2):
            dd = math.hypot(x, y)
            if dd <= r_ - 1:
                c_ = fill if y > -r_ * 0.4 else lerp(fill, C("ffffff", fill[3]), 0.18)
                blend_px(cx_ + x, cy_ + y, c_)
            elif dd <= r_ + 1:
                blend_px(cx_ + x, cy_ + y, ring)

ax_, ay_ = W - 46, H - 42
round_btn(ax_, ay_, 24, C("2a2346", 190), C("e8b64c", 230))
for k in range(16):  # 검 아이콘
    blend_px(ax_ - 8 + k, ay_ + 8 - k, C("e9f0f7")); blend_px(ax_ - 7 + k, ay_ + 8 - k, C("aab8c8"))
rect(ax_ - 10, ay_ + 4, 7, 2, C("e8b64c")); rect(ax_ - 12, ay_ + 9, 3, 3, C("d64a5a"))
text(ax_, ay_ + 12, "공격", C("fff1b8"), F9, center=True)

for (bx, by, rr, label) in [(W - 98, H - 24, 15, "점프"), (W - 92, H - 66, 13, "대시")]:
    round_btn(bx, by, rr, C("2a2346", 170), C("efe3c2", 200))
    text(bx, by - 6, label, C("fff1b8"), F9, center=True)

for i_, (bx, by) in enumerate([(W - 20, H - 92), (W - 50, H - 100), (W - 80, H - 104)]):
    ready = i_ < 2
    seal = C("b8323f", 235) if ready else C("4a3a4a", 170)
    round_btn(bx, by, 12, seal, C("6e1a24", 255) if ready else C("2a2346", 200))
    for k in range(8):  # 인장 톱니 테두리
        a = k * math.tau / 8
        rect(bx + int(math.cos(a) * 12) - 1, by + int(math.sin(a) * 12) - 1, 2, 2, seal)
    text(bx, by - 6, str(i_ + 1), C("fff1b8") if ready else C("8a7f9a"), F11B, outline=C("6e1a24") if ready else OUT, center=True)

# 포션 슬롯
round_btn(W - 140, H - 18, 11, C("2a2346", 170), C("efe3c2", 200))
rect(W - 143, H - 25, 6, 3, C("cbbb93")); rect(W - 145, H - 22, 10, 9, C("e2574c")); rect(W - 144, H - 21, 3, 3, C("ff8a76"))
text(W - 128, H - 18, "×3", C("fffbe8"), F9)

out = img.resize((W * SCALE, H * SCALE), Image.NEAREST)
out.save(f"{HERE}/mock_field.png")
img.save(f"{HERE}/mock_field_1x.png")
print("saved")
