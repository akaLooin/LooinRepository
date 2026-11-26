"""실버(B안: 금테 견갑 · 파란 휘장) 스프라이트 시트 + 초상화 생성기.
사용: python3 tools/gen_silver.py assets/sprites
- 칸 48x48, 발 기준점 (24, 44), 오른쪽을 보는 방향
- 검은 각도로 계산해서 그린다 → 공격마다 다른 자세를 싸게 만들 수 있다
- 줄 구성은 아래 ROWS, 게임 연결표는 sprites.json 의 cls_silver 항목과 같다
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
P = {"h": C("f2e3a0"), "H": C("d9c477"), "i": C("b8a35c"), "s": C("f3cfab"), "S": C("d9a383"), "e": C("4a6a8f"),
     "a": C("e6ecf2"), "A": C("aab6c6"), "D": C("737f92"), "d": C("4a5364"), "t": C("3f6fc0"), "T": C("2a4a8a"),
     "g": C("e8b64c"), "G": C("b4842f"), "B": C("f6f9fc"), "K": C("b4c0cf"), "l": C("5a4636")}

HEAD = [
    "....hhhhh....",
    "..hhHHHhhh...",
    ".hhHHhhhhhh..",
    ".hhhhhhhihhh.",
    ".hhhhsssshih.",
    ".hhhssssesss.",
    "..hsssssesss.",
    "..hSsssssss..",
    "...SSSSSS....",
]
TORSO = [
    "ggaaaaaaaagg.",
    "gGaaAAAaaaGg.",
    "..aaattaaaA..",
    "..aaattaaaA..",
    ".aaaattaaaA..",
    ".aaaattaAA...",
    ".aaaattaAA...",
    ".AAgggggAA...",
    ".aatttttaA...",
]
LEGS = {
    "stand": [".aat..taA....", ".aaA..aAA....", ".DDD..DDD....", ".ddd..ddd....", "dddd..dddd..."],
    "stand2": [".aat..taA....", ".aaA..aAA....", ".DDD..DDD....", ".ddd..ddd....", "dddd..dddd..."],
    "run1": [".aat...taA...", "aaA.....aAA..", "DD.......DD..", "dd.......ddd.", "ddd.......dd."],
    "run2": ["..aat.taA....", "..aaA.aAA....", "...DDDD......", "...dddd......", "..ddddd......"],
    "run3": ["..aattaA.....", "...aaAA......", "...DDDD......", "...dddd......", "..ddddd......"],
    "run4": ["aat....taA...", ".aaA....aAA..", "..DD.....DD..", "..dd.....ddd.", ".ddd......dd."],
    "air": [".aat.taA.....", "..aA..aA.....", "..DD...DD....", "..dd....dd...", "..d......d..."],
    "fall": [".aat..taA....", ".aA....aA....", ".DD.....DD...", "dd.......dd..", "d.........d.."],
    "lunge": ["aaat....taAA.", "aaA.......aA.", "DD.........DD", "ddd.......ddd", "............."],
    "crouch": ["aaat...taAA..", "aaA......aA..", "DD........DD.", "ddd.......ddd", "............."],
}


def stamp(cells, grid, ox, oy):
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch != "." and ch in P:
                cells[(ox + i, oy + j)] = P[ch]


def sword(cells, hx, hy, ang_deg, length=15, glow=None):
    """손 위치에서 각도 ang 으로 검을 그린다 (0=오른쪽, -90=위)."""
    a = math.radians(ang_deg)
    dx, dy = math.cos(a), math.sin(a)
    # 손잡이·폼멜 (손 뒤쪽)
    for k in range(1, 4):
        cells[(round(hx - dx * k), round(hy - dy * k))] = P["l"] if k < 3 else P["g"]
    # 날
    for k in range(2, length + 2):
        x, y = hx + dx * k, hy + dy * k
        cells[(round(x), round(y))] = P["B"]
        # 두께: 날의 한쪽 면은 회색
        nx, ny = -dy, dx
        cells[(round(x + nx), round(y + ny))] = P["K"] if k < length + 1 else P["B"]
        if glow:
            cells.setdefault((round(x - nx), round(y - ny)), glow)
    # 가드 (날에 수직)
    nx, ny = -dy, dx
    for k in (-2, -1, 0, 1, 2):
        cells[(round(hx + dx * 1 + nx * k), round(hy + dy * 1 + ny * k))] = P["g"]


def frame(legs="stand", ang=100, hand=(10, 12), bob=0, lean=0, glow=None, arm_back=False, trail=None, length=15):
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    cells = {}
    by = 44 - 23 + bob
    x = 17 + lean
    stamp(cells, HEAD, x, by)
    stamp(cells, TORSO, x, by + 9)
    stamp(cells, LEGS[legs], x, by + 18)
    hx, hy = x + hand[0], by + hand[1]
    # 팔
    if arm_back:
        cells[(x + 1, by + 11)] = P["A"]
        cells[(x, by + 12)] = P["s"]
    else:
        for k in range(3):
            cells[(round(x + 8 + (hand[0] - 8) * k / 2), round(by + 11 + (hand[1] - 11) * k / 2))] = P["A"]
    cells[(hx, hy)] = P["s"]
    if trail:
        # 검 궤적 (반투명 흰색 호)
        a0, a1 = trail
        for deg in range(min(a0, a1), max(a0, a1), 4):
            r = math.radians(deg)
            for rr in range(8, 18):
                p = (round(hx + math.cos(r) * rr), round(hy + math.sin(r) * rr))
                if p not in cells:
                    cells[p] = C("f6f9fc", 120 if rr > 13 else 70)
    sword(cells, hx, hy, ang, length, glow)
    # 외곽선
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
        "......hhhh............",
        "....hhhhhhh.ggaaaaaa..",
        "...hhhsssshaaattaaaDd.",
        "...hhsssessaaattAAADdd",
        "....SSSSSS.gggaaAADddd",
    ]
    stamp(cells, body, 10, 39)
    for k in range(14):
        cells[(31 + k, 44)] = P["B"]
    for (cx, cy), c in list(cells.items()):
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cx + ddx, cy + ddy)
            if n not in cells and 0 <= n[0] < 48 and 0 <= n[1] < 48:
                im.putpixel(n, OL)
    for p, c in cells.items():
        im.putpixel(p, c)
    return im


GOLD = C("ffe680", 160)
# 줄: (키, [프레임...])  — 공격 줄은 3프레임: 준비 / 판정 / 마무리
ROWS = [
    ("idle", [frame(bob=0), frame(bob=0), frame(bob=1), frame(bob=1)]),
    ("run", [frame("run1", 150, (2, 13), arm_back=False), frame("run2", 150, (3, 13), bob=-1), frame("run3", 150, (3, 13), bob=-1),
             frame("run4", 150, (2, 13)), frame("run2", 150, (3, 13), bob=-1), frame("run3", 150, (3, 13))]),
    ("air", [frame("air", -60, (9, 10), bob=-1), frame("fall", 120, (10, 12))]),
    ("dash", [frame("lunge", 165, (2, 14), bob=2, lean=2)]),
    ("atk_g1", [frame("stand", -150, (4, 9), lean=-1), frame("lunge", 5, (11, 12), bob=1, lean=1, trail=(-140, 5)), frame("stand", 45, (10, 13))]),
    ("atk_g2", [frame("stand", 70, (9, 14)), frame("lunge", -25, (11, 11), bob=1, lean=2, trail=(-25, 70)), frame("stand", -70, (9, 9))]),
    ("atk_g3", [frame("stand", -100, (7, 7), lean=-1), frame("lunge", 30, (11, 12), bob=1, lean=2, trail=(-100, 30)), frame("crouch", 75, (10, 14), bob=2, lean=1)]),
    ("atk_g4", [frame("crouch", -160, (3, 9), bob=2, lean=-2), frame("lunge", 0, (12, 11), bob=1, lean=3, trail=(-170, 10), length=17), frame("lunge", 55, (11, 14), bob=1, lean=2)]),
    ("atk_g5", [frame("crouch", 180, (2, 12), bob=1), frame("lunge", -10, (12, 11), bob=1, lean=2, trail=(-180, 180)), frame("crouch", 60, (11, 14), bob=2, lean=1)]),
    ("atk_up", [frame("crouch", 80, (9, 15), bob=2), frame("air", -80, (9, 6), bob=-2, trail=(-80, 80)), frame("air", -100, (8, 5), bob=-3)]),
    ("atk_down", [frame("air", -120, (6, 8), bob=-1), frame("fall", 90, (8, 14)), frame("crouch", 90, (9, 16), bob=2)]),
    ("atk_air", [frame("air", -130, (5, 8)), frame("air", 15, (11, 11), trail=(-120, 15)), frame("fall", 70, (10, 13))]),
    ("atk_dash", [frame("lunge", 180, (2, 12), bob=2, lean=2), frame("lunge", 0, (13, 12), bob=1, lean=3, length=17), frame("lunge", 20, (12, 13), bob=1, lean=2)]),
    ("atk_dash2", [frame("lunge", -140, (4, 8), bob=1, lean=1), frame("lunge", 40, (12, 13), bob=1, lean=3, trail=(-140, 40)), frame("crouch", 80, (10, 15), bob=2, lean=2)]),
    ("thrust", [frame("lunge", 0, (8, 12), bob=1), frame("lunge", -5, (13, 12), bob=1, lean=2, length=17), frame("lunge", 5, (12, 11), bob=1, lean=1, length=17)]),
    ("cast", [frame("stand", -90, (9, 5), glow=GOLD), frame("stand", -90, (9, 4), bob=-1, glow=GOLD), frame("stand", 20, (11, 12), glow=GOLD, trail=(-90, 20))]),
    ("guard", [frame("crouch", -80, (11, 9), bob=2, glow=C("bfe3ff", 150))]),
    ("hurt", [frame("crouch", 130, (8, 13), bob=2, lean=-2), down_frame(), frame("crouch", 100, (9, 14), bob=2)]),
]

cols = max(len(fr) for _, fr in ROWS)
sheet = Image.new("RGBA", (48 * cols, 48 * len(ROWS)), (0, 0, 0, 0))
anims = {}
for r, (key, frames) in enumerate(ROWS):
    for c, fr in enumerate(frames):
        sheet.paste(fr, (c * 48, r * 48), fr)
    anims[key] = {"row": r, "frames": len(frames)}
sheet.save(os.path.join(OUT, "hero_silver.png"))

# 게임 연결표 조각 (sprites.json 에 반영)
def ph(key):
    return {"row": anims[key]["row"], "frames": 3, "phased": True}

link = {
    "sheet": "res://assets/sprites/hero_silver.png", "frame": [48, 48], "origin": [24, 44],
    "anims": {
        "idle": {"row": anims["idle"]["row"], "frames": 4, "fps": 4},
        "run": {"row": anims["run"]["row"], "frames": 6, "fps": 12},
        "air": {"row": anims["air"]["row"], "frames": 1, "col": 0},
        "dash": {"row": anims["dash"]["row"], "frames": 1},
        "atk": ph("atk_g1"),
        "atk_g1": ph("atk_g1"), "atk_g2": ph("atk_g2"), "atk_g3": ph("atk_g3"), "atk_g4": ph("atk_g4"), "atk_g5": ph("atk_g5"),
        "atk_up": ph("atk_up"), "atk_down": ph("atk_down"), "atk_air": ph("atk_air"),
        "atk_dash": ph("atk_dash"), "atk_dash2": ph("atk_dash2"), "atk_counter": ph("atk_g5"),
        "atk_mp1": ph("atk_g4"), "atk_mp2": ph("atk_g5"), "atk_mp3": ph("cast"),
        "atk_rush": ph("thrust"), "atk_crescent": ph("atk_g5"), "atk_thrust": {"row": anims["thrust"]["row"], "frames": 3, "fps": 20},
        "atk_cross": ph("atk_down"), "atk_oath": ph("cast"), "atk_dawn": ph("cast"),
        "guard": {"row": anims["guard"]["row"], "frames": 1},
        "hurt": {"row": anims["hurt"]["row"], "frames": 1, "col": 0},
        "down": {"row": anims["hurt"]["row"], "frames": 1, "col": 1},
    },
    "portrait": "res://assets/sprites/portrait_silver.png",
}
with open(os.path.join(OUT, "_silver_link.json"), "w") as f:
    json.dump(link, f, ensure_ascii=False, indent=1)

# ── 초상화 32x32 (컷인·HUD·카드) ──
PORTRAIT = [
    "................................",
    "...........hhhhhhhh.............",
    ".........hhHHHHHHhhhh...........",
    "........hhHHhhhhhhHhhh..........",
    ".......hhHhhhhhhhhhhHhh.........",
    "......hhhhhhhhhhhhhhhhhh........",
    "......hhhhhhhhhhhhhhihhh........",
    ".....hhhhhhhhhhhhhhhhihhh.......",
    ".....hhhhhhsshhhhhshhhihh.......",
    ".....hhhhssssssssssshhhhh.......",
    ".....hhhsssssssssssssshhh.......",
    ".....hhhsssssssssssssssh........",
    "......hsddsssssssddssss.........",
    "......hsseesssssseesssS.........",
    "......hsseeSsssssseSssS.........",
    "......hsssssssssssssssS.........",
    ".......ssssssSSsssssssS.........",
    ".......SsssdssssssdssS..........",
    "........SsssddddsssSS...........",
    ".........SSssssssSS.............",
    "..........SSSSSSSS..............",
    "......gggaaSSSSSSaaggg..........",
    "....gGGgaaaaaaaaaaaagGGg........",
    "...gGggaaaaattttaaaaaggGg.......",
    "..gGgaaaaaaattttaaaaaaagGg......",
    "..ggaaaAAaaattttaaaAAaaagg......",
    ".gaaaaAAaaaattttaaaaAAaaaag.....",
    ".aaaaAAaaaaaTttTaaaaaAAaaaa.....",
    "aaaaAAaaaaaaTttTaaaaaaAAaaaa....",
    "aaaAAaaaaaaagggggaaaaaaAAaaa....",
    "aaAAaaaaaaaaTttTaaaaaaaaAAaa....",
    "aAAaaaaaaaaaTttTaaaaaaaaaAAa....",
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
pp.save(os.path.join(OUT, "portrait_silver.png"))
print("silver sheet", sheet.size, "rows", len(ROWS))
