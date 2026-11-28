"""루미나(C안: 연구원풍 — 은색 단발·보라 눈·웃는 얼굴·보라 로브·노란 스카프·떠다니는 마도서·나무 지팡이).
사용: python3 tools/gen_lumina.py assets/sprites
칸 48x48, 발 기준점 (24, 44), 오른쪽을 보는 방향. 지팡이는 각도로 회전해서 그린다.
"""
import json
import math
import os
import sys

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/sprites"
os.makedirs(OUT, exist_ok=True)


def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


OL = C("1b1530")
P = {"h": C("e6ecf2"), "H": C("aab6c6"), "s": C("f3d2b4"), "S": C("d9ab8c"), "e": C("8a4fd0"), "m": C("c96a7a"),
     "r": C("6b3fa0"), "R": C("4a2a78"), "y": C("ffd23f"), "Y": C("e8b64c"), "w": C("a8743c"), "W": C("7a4f2a"),
     "b": C("3a2a52"), "c": C("8a5a3c"), "q": C("efe3c2")}
HEAD = [
    "...hhhhhhh...",
    "..hhHhhhhhh..",
    ".hhhhhhhhhhh.",
    ".hhhsssshhhh.",
    ".hhseesseehh.",
    ".hhssssssshh.",
    ".hhsmssssmhh.",
    "..hhSsmmsSh..",
    "...hSSSSSh...",
]
TORSO = [
    "..yyyyyyyy...",
    ".ryyyyyyyyr..",
    ".rrrrryyrrr..",
    ".rrrrrryrrr..",
    "..rrrrryrr...",
    "..rrrrrrrrr..",
    "..rrrrrrrrr..",
    "..rrrYYYrrr..",
    "..rrrrrrrrr..",
]
LEGS = {
    "stand": ["..RrrrrrrrR..", "..RRrrrrrRR..", "..RRRRRRRRR..", "...bb...bb...", "..bbb..bbb..."],
    "run1": ["..RrrrrrrR...", ".RRrrrrrRR...", ".RRRR.RRRRR..", ".bb......bb..", "bbb......bbb."],
    "run2": ["...RrrrrR....", "...RRrrRR....", "...RRRRRR....", "....bbbb.....", "...bbbbb....."],
    "run3": ["..RrrrrrrR...", "..RRrrrrRR...", "..RRR..RRRR..", "..bb.....bb..", ".bbb.....bbb."],
    "air": ["..RrrrrrrR...", ".RRrrrrrrRR..", "RRRR...RRRR..", ".bb.....bb...", "............."],
}
BOOK = ["cccc", "cqqc", "cqqc", "cccc"]


def stamp(cells, grid, ox, oy):
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch != "." and ch in P:
                cells[(ox + i, oy + j)] = P[ch]


def staff(cells, hx, hy, ang, glow=None, ln=16):
    a = math.radians(ang)
    dx, dy = math.cos(a), math.sin(a)
    for k in range(-4, ln):
        cells[(round(hx + dx * k), round(hy + dy * k))] = P["w"] if k < ln - 4 else P["W"]
    tx, ty = hx + dx * ln, hy + dy * ln
    for ox, oy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        cells[(round(tx + ox), round(ty + oy))] = P["y"]
    if glow:
        for r in range(2, 5):
            for d in range(0, 360, 30):
                p = (round(tx + math.cos(math.radians(d)) * r), round(ty + math.sin(math.radians(d)) * r))
                cells.setdefault(p, glow)


def frame(legs="stand", ang=-70, hand=(11, 11), bob=0, lean=0, glow=None, book=(-6, 7), arms_up=False):
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    cells = {}
    by = 44 - 23 + bob
    x = 17 + lean
    if book:
        stamp(cells, BOOK, x + book[0], by + book[1] + (1 if bob else 0))
    stamp(cells, HEAD, x, by)
    stamp(cells, TORSO, x, by + 9)
    stamp(cells, LEGS[legs], x, by + 18)
    hx, hy = x + hand[0], by + hand[1]
    for k in range(3):
        cells[(round(x + 9 + (hand[0] - 9) * k / 2), round(by + 11 + (hand[1] - 11) * k / 2))] = P["r"]
    cells[(hx, hy)] = P["s"]
    if arms_up:
        cells[(x + 1, by + 8)] = P["s"]
        cells[(x + 1, by + 10)] = P["r"]
    staff(cells, hx, hy, ang, glow)
    for (cx, cy), c in list(cells.items()):
        if c[3] < 255:
            continue
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cx + ddx, cy + ddy)
            if n not in cells and 0 <= n[0] < 48 and 0 <= n[1] < 48:
                im.putpixel(n, OL)
    for (cx, cy), c in cells.items():
        if 0 <= cx < 48 and 0 <= cy < 48:
            im.putpixel((cx, cy), c)
    return im


def down_frame():
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    cells = {}
    body = [
        "....hhhhhh............",
        "..hhhhhhhhh.yyrrrrrrr.",
        ".hhhsseeshhyrrrrrrrRR.",
        ".hhhssssshhrrrYrrrRRbb",
        "..hhSSSSShhrrrrrrRRRbb",
    ]
    stamp(cells, body, 10, 39)
    for k in range(14):
        cells[(31 + k, 44)] = P["w"]
    for (cx, cy), c in list(cells.items()):
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cx + ddx, cy + ddy)
            if n not in cells and 0 <= n[0] < 48 and 0 <= n[1] < 48:
                im.putpixel(n, OL)
    for p, c in cells.items():
        im.putpixel(p, c)
    return im


GL = C("ffe680", 150)
PURP = C("c77dff", 150)
ROWS = [
    ("idle", [frame(), frame(), frame(bob=1), frame(bob=1)]),
    ("run", [frame("run1", -40, (10, 12)), frame("run2", -40, (10, 12), bob=-1), frame("run3", -40, (10, 12)),
             frame("run1", -40, (10, 12)), frame("run2", -40, (10, 12), bob=-1), frame("run3", -40, (10, 12))]),
    ("air", [frame("air", -100, (9, 9), bob=-1), frame("air", -60, (10, 11))]),
    ("dash", [frame("air", 0, (12, 11), glow=PURP, book=None)]),
    ("atk_l1", [frame("stand", -130, (6, 8), lean=-1), frame("run3", 10, (12, 12), lean=1, glow=GL), frame("stand", 50, (10, 13))]),
    ("atk_l2", [frame("stand", 60, (10, 14)), frame("run1", -30, (12, 10), lean=1, glow=GL), frame("stand", -80, (9, 9))]),
    ("atk_l3", [frame("stand", -100, (8, 7), lean=-1), frame("run3", 30, (12, 13), lean=2, glow=GL), frame("stand", 70, (10, 14))]),
    ("atk_l4", [frame("stand", -150, (5, 9), lean=-1, glow=GL), frame("run3", 0, (13, 11), lean=2, glow=GL), frame("stand", 0, (12, 11))]),
    ("charge", [frame("stand", -90, (10, 6), glow=PURP, arms_up=True), frame("stand", -90, (10, 5), bob=-1, glow=GL, arms_up=True), frame("run3", 0, (13, 11), lean=1, glow=GL)]),
    ("cast_up", [frame("stand", -90, (10, 4), glow=GL, arms_up=True), frame("stand", -90, (10, 3), bob=-1, glow=PURP, arms_up=True), frame("stand", -60, (11, 7))]),
    ("cast_wide", [frame("stand", -45, (12, 8), glow=GL, book=(-7, 3)), frame("air", -45, (12, 8), bob=-1, glow=PURP, book=(-7, 2)), frame("stand", -45, (11, 9))]),
    ("hurt", [frame("stand", -120, (8, 12), bob=2, lean=-2), down_frame(), frame("stand", -80, (9, 12), bob=2)]),
]
cols = max(len(fr) for _, fr in ROWS)
sheet = Image.new("RGBA", (48 * cols, 48 * len(ROWS)), (0, 0, 0, 0))
rows = {}
for r, (key, frames) in enumerate(ROWS):
    for c, fr in enumerate(frames):
        sheet.paste(fr, (c * 48, r * 48), fr)
    rows[key] = r
sheet.save(os.path.join(OUT, "hero_lumina.png"))


def ph(key):
    return {"row": rows[key], "frames": 3, "phased": True}


link = {
    "sheet": "res://assets/sprites/hero_lumina.png", "frame": [48, 48], "origin": [24, 44],
    "portrait": "res://assets/sprites/portrait_lumina.png",
    "anims": {
        "idle": {"row": rows["idle"], "frames": 4, "fps": 4},
        "run": {"row": rows["run"], "frames": 6, "fps": 11},
        "air": {"row": rows["air"], "frames": 1, "col": 0},
        "dash": {"row": rows["dash"], "frames": 1},
        "atk": ph("atk_l1"),
        "atk_l1": ph("atk_l1"), "atk_l2": ph("atk_l2"), "atk_l3": ph("atk_l3"), "atk_l4": ph("atk_l4"),
        "atk_l_air": ph("atk_l4"), "atk_lc1": ph("charge"), "atk_lc2": ph("charge"), "atk_lc3": ph("charge"), "atk_counter": ph("cast_wide"),
        "atk_l_split": ph("atk_l4"), "atk_l_frost": ph("atk_l4"), "atk_l_chain": ph("atk_l4"),
        "atk_l_bang": ph("cast_wide"), "atk_l_ring": ph("cast_wide"), "atk_l_storm": ph("cast_up"),
        "atk_l_meteor": ph("cast_up"), "atk_l_glacier": ph("cast_wide"), "atk_l_judgment": ph("cast_up"),
        "hurt": {"row": rows["hurt"], "frames": 1, "col": 0},
        "down": {"row": rows["hurt"], "frames": 1, "col": 1},
    },
}
with open(os.path.join(OUT, "_lumina_link.json"), "w") as f:
    json.dump(link, f, ensure_ascii=False, indent=1)

PORTRAIT = [
    "........hhhhhhhhhh..............",
    "......hhhHHHhhhhhhhh............",
    ".....hhHHhhhhhhhhhhhh...........",
    "....hhHhhhhhhhhhhhhhhh..........",
    "...hhhhhhhhhhhhhhhhhhhh.........",
    "...hhhhhhhhhhhhhhhhhhhh.........",
    "..hhhhhhsshhhhhhhsshhhhh........",
    "..hhhhssssssssssssssshhh........",
    "..hhhsssssssssssssssssshh.......",
    "..hhhssHHHsssssssHHHssshh.......",
    "..hhhsseqessssssseqessshh.......",
    "..hhhsseeeSssssssseeeSshh.......",
    "..hhhssSSSsssssssSSSssshh.......",
    "..hhhhsssssssssssssssshhh.......",
    "...hhhsssssssSSssssssshh........",
    "...hhhhssssssssssssssshh........",
    "....hhhssssmssssssmsshh.........",
    "....hhhhSsssmmmmmmsSShh.........",
    ".....hhh.SSssssssSS.hh..........",
    "........SSSSSSSSSS..............",
    "......ryyyyyyyyyyyyr............",
    "....rryyyyyyyyyyyyyyrr..........",
    "...rrrryyyyyyyyyyyrrrrr.........",
    "..rrrrrrryyyYyyyrrrrrrrr........",
    ".rrrrrrrrrryyyrrrrrrrrrrr.......",
    ".rrrrrrrrrryyyrrrrrrrrrrr.......",
    "rrrrrrrrrrrryrrrrrrrrrrrrr......",
    "rrrrrrrrrrrryrrrrrrrrrrrrr......",
    "RrrrrrrrrrrrrrrrrrrrrrrrrR......",
    "RRrrrrrrrrrYYYrrrrrrrrrrRR......",
    "RRRrrrrrrrrrrrrrrrrrrrrRRR......",
    "RRRRrrrrrrrrrrrrrrrrrrRRRR......",
]
pp = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
cells = {}
for y, row in enumerate(PORTRAIT):
    for x, ch in enumerate(row):
        if ch in P:
            cells[(x, y)] = P[ch]
for (cx, cy) in list(cells):
    for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        n = (cx + ddx, cy + ddy)
        if n not in cells and 0 <= n[0] < 32 and 0 <= n[1] < 32:
            pp.putpixel(n, OL)
for p, c in cells.items():
    pp.putpixel(p, c)
pp.save(os.path.join(OUT, "portrait_lumina.png"))
print("lumina sheet", sheet.size, "rows", len(ROWS))
