"""글렌(B안: 숲 사냥꾼 — 짧은 녹색 망토·가죽 흉갑·화살통·노란 손수건) 스프라이트 시트 + 초상화.
사용: python3 tools/gen_glenn.py assets/sprites
- 칸 48x48, 발 기준점 (24, 44), 오른쪽을 보는 방향
- 활은 조준 각도로 회전해서 그린다. 활의 등(볼록한 쪽)이 과녁(앞) 쪽, 시위는 몸 쪽.
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
P = {"h": C("7a4a2a"), "H": C("9a6238"), "j": C("5a3420"), "s": C("e9bf95"), "S": C("c99a72"),
     "e": C("ffd23f"), "E": C("3a2a22"), "w": C("b07a48"), "W": C("7a4f2a"), "v": C("2f5a3a"), "V": C("1f3f2a"),
     "y": C("ffd23f"), "Y": C("e8b64c"), "l": C("6b4a2e"), "L": C("4a3220"), "k": C("3a2a22"), "q": C("efe3c2"),
     "m": C("9aa3ad"), "b": C("a8743c"), "B": C("7a4f2a"), "t": C("f6eedb")}

HEAD = [
    "...hhhhhhh...",
    "..hhHhhHhhhh.",
    ".hhhjhhhhjhh.",
    "hhhhhsssshhh.",
    ".hhssEesEess.",
    ".hhsseesseeh.",
    "..hssssssss..",
    "..hSsssSss...",
    "...SSSSSS....",
]
TORSO = [
    "VvvyyyyyvvV..",
    "Vvwwwwwwwvv..",
    "vvwwwwWwwvv..",
    "vvwwwwwwwv...",
    "v.wwwwwwww...",
    "..wwWwwwww...",
    "..kkkkkkkk...",
    "..lllyllll...",
    "..llllllll...",
]
LEGS = {
    "stand": ["..ll..ll.....", "..ll..ll.....", "..LL..LL.....", "..LL..LL.....", ".LLL..LLL...."],
    "run1": [".ll....ll....", "ll......ll...", "LL.......LL..", "LL.......LLL.", "LLL.......LL."],
    "run2": ["..ll.ll......", "..ll.ll......", "...LLLL......", "...LLLL......", "..LLLLL......"],
    "run3": ["...llll......", "...llll......", "...LLLL......", "...LLLL......", "..LLLLL......"],
    "run4": ["ll.....ll....", ".ll.....ll...", "..LL.....LL..", "..LL.....LLL.", ".LLL......LL."],
    "air": ["..ll.ll......", "..ll..ll.....", "..LL...LL....", "..LL....LL...", "..L......L..."],
    "kneel": ["lll....ll....", "ll.....ll....", "LL....LLL....", "LLLLLLLL.....", "............."],
    "back": ["ll....ll.....", "ll.....ll....", "LL......LL...", "LL.......LL..", "............."],
}
QUIVER = ["q.q.", "qqq.", "ww..", "wW..", "wW..", "wW..", "WW.."]


def stamp(cells, grid, ox, oy, over=True):
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch != "." and ch in P:
                if over or (ox + i, oy + j) not in cells:
                    cells[(ox + i, oy + j)] = P[ch]


def bow(cells, cx, cy, aim_deg, pull=0.0, arrow=True):
    """활: 손(cx,cy)을 잡이로, 조준 방향 aim. 등(볼록)은 앞쪽, 시위는 뒤쪽으로 pull 만큼 당겨짐."""
    a = math.radians(aim_deg)
    fx, fy = math.cos(a), math.sin(a)          # 앞
    nx, ny = -fy, fx                           # 활 길이 방향
    L = 9
    tips = []
    for k in range(-L, L + 1):
        t = k / L
        bulge = (1 - t * t) * 2.5               # 등이 앞으로 볼록
        x = cx + nx * k + fx * bulge
        y = cy + ny * k + fy * bulge
        cells[(round(x), round(y))] = P["b"] if abs(k) < L - 1 else P["B"]
        if abs(k) == L:
            tips.append((x, y))
    # 시위: 두 끝 → 당긴 점
    px_, py_ = cx - fx * (1 + pull * 6), cy - fy * (1 + pull * 6)
    for tip in tips:
        n = 12
        for i in range(n + 1):
            u = i / n
            cells.setdefault((round(tip[0] + (px_ - tip[0]) * u), round(tip[1] + (py_ - tip[1]) * u)), P["t"])
    if arrow:
        for k in range(0, 13):
            x, y = px_ + fx * k, py_ + fy * k
            cells[(round(x), round(y))] = P["q"] if k < 11 else P["m"]
        cells[(round(px_ + fx * 12 + nx), round(py_ + fy * 12 + ny))] = P["m"]
        cells[(round(px_ + fx * 12 - nx), round(py_ + fy * 12 - ny))] = P["m"]
        cells[(round(px_ - nx), round(py_ - ny))] = P["y"]
    return px_, py_


def frame(legs="stand", aim=0, pull=0.0, bob=0, lean=0, arrow=True, hold="bow", glow=None):
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    cells = {}
    by = 44 - 23 + bob
    x = 16 + lean
    stamp(cells, QUIVER, x - 1, by + 6)
    stamp(cells, HEAD, x, by)
    stamp(cells, TORSO, x, by + 9)
    stamp(cells, LEGS[legs], x, by + 18)
    if hold == "bow":
        hx, hy = x + 12, by + 12
        a = math.radians(aim)
        hx += round(math.cos(a) * 2)
        hy += round(math.sin(a) * 2)
        for k in range(3):
            cells[(x + 9 + k, by + 11 + round(math.sin(a) * k))] = P["w"]
        cells[(hx, hy)] = P["s"]
        sx, sy = bow(cells, hx, hy, aim, pull, arrow)
        cells[(round(sx), round(sy))] = P["s"]
    elif hold == "low":       # 활을 아래로 들고 있음 (이동)
        hx, hy = x + 10, by + 14
        cells[(hx, hy)] = P["s"]
        bow(cells, hx, hy, 70, 0.0, False)
    elif hold == "throw":     # 수류탄 던지기
        cells[(x + 11, by + 5)] = P["s"]
        for k in range(3):
            cells[(x + 9 + k // 2, by + 10 - k * 2)] = P["w"]
        stamp(cells, [".kk.", "kmmk", "kmmk", ".kk."], x + 10, by + 1)
        bow(cells, x + 1, by + 14, 100, 0.0, False)
    elif hold == "plant":     # 덫 놓기
        cells[(x + 11, by + 20)] = P["s"]
        stamp(cells, ["mkkm", "kyyk"], x + 11, by + 21)
        bow(cells, x + 1, by + 14, 100, 0.0, False)
    elif hold == "bash":      # 활로 후려치기
        hx, hy = x + 12, by + 10
        cells[(hx, hy)] = P["s"]
        bow(cells, hx + 2, hy, -30, 0.0, False)
    if glow:
        for (cx, cy) in list(cells):
            for dx, dy in ((2, 0), (-2, 0), (0, 2), (0, -2)):
                cells.setdefault((cx + dx, cy + dy), glow)
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
        ".....hhhhh............",
        "...hhhhhhhh.Vvwwwwll..",
        "..hhhsssshhvvwwwwwlLL.",
        "..hhsEesEeswwwwkkllLL.",
        "...SSSSSS..vvwwwkklLL.",
    ]
    stamp(cells, body, 10, 39)
    for (cx, cy), c in list(cells.items()):
        for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (cx + ddx, cy + ddy)
            if n not in cells and 0 <= n[0] < 48 and 0 <= n[1] < 48:
                im.putpixel(n, OL)
    for p, c in cells.items():
        im.putpixel(p, c)
    return im


GOLD = C("ffe680", 140)
ROWS = [
    ("idle", [frame(hold="low"), frame(hold="low"), frame(hold="low", bob=1), frame(hold="low", bob=1)]),
    ("run", [frame("run1", hold="low"), frame("run2", hold="low", bob=-1), frame("run3", hold="low", bob=-1),
             frame("run4", hold="low"), frame("run2", hold="low", bob=-1), frame("run3", hold="low")]),
    ("air", [frame("air", hold="low", bob=-1), frame("air", hold="low")]),
    ("dash", [frame("back", 0, 0.3, bob=1, lean=-1)]),
    ("shot", [frame("stand", 0, 0.8), frame("stand", 0, 0.0, arrow=False), frame("stand", 0, 0.1, arrow=False)]),
    ("shot_up", [frame("stand", -45, 0.8), frame("stand", -45, 0.0, arrow=False), frame("stand", -45, 0.1, arrow=False)]),
    ("shot_down", [frame("air", 45, 0.8, bob=-1), frame("air", 45, 0.0, arrow=False, bob=-1), frame("air", 45, 0.1, arrow=False)]),
    ("charge", [frame("stand", 0, 1.0, lean=-1, glow=GOLD), frame("stand", 0, 1.0, lean=-1), frame("stand", 0, 0.0, arrow=False)]),
    ("backstep", [frame("back", 0, 0.8, lean=-2), frame("back", 0, 0.0, arrow=False, lean=-2), frame("stand", 0, 0.1, arrow=False)]),
    ("bash", [frame("stand", hold="low"), frame("stand", hold="bash", lean=1), frame("stand", hold="low")]),
    ("throw", [frame("stand", hold="throw", lean=-1), frame("stand", hold="throw", bob=-1), frame("stand", hold="low")]),
    ("plant", [frame("kneel", hold="plant", bob=3), frame("kneel", hold="plant", bob=3), frame("stand", hold="low")]),
    ("snipe", [frame("kneel", 0, 1.0, bob=3, glow=GOLD), frame("kneel", 0, 1.0, bob=3), frame("kneel", 0, 0.0, arrow=False, bob=3)]),
    ("volley", [frame("stand", -60, 0.9), frame("stand", -60, 0.0, arrow=False), frame("stand", -60, 0.1, arrow=False)]),
    ("hurt", [frame("back", hold="low", bob=2, lean=-2), down_frame(), frame("kneel", hold="low", bob=3)]),
]

cols = max(len(fr) for _, fr in ROWS)
sheet = Image.new("RGBA", (48 * cols, 48 * len(ROWS)), (0, 0, 0, 0))
rows = {}
for r, (key, frames) in enumerate(ROWS):
    for c, fr in enumerate(frames):
        sheet.paste(fr, (c * 48, r * 48), fr)
    rows[key] = r
sheet.save(os.path.join(OUT, "hero_glenn.png"))


def ph(key):
    return {"row": rows[key], "frames": 3, "phased": True}


link = {
    "sheet": "res://assets/sprites/hero_glenn.png", "frame": [48, 48], "origin": [24, 44],
    "portrait": "res://assets/sprites/portrait_glenn.png",
    "anims": {
        "idle": {"row": rows["idle"], "frames": 4, "fps": 4},
        "run": {"row": rows["run"], "frames": 6, "fps": 12},
        "air": {"row": rows["air"], "frames": 1, "col": 0},
        "dash": {"row": rows["dash"], "frames": 1},
        "atk": ph("shot"),
        "atk_shot": ph("shot"), "atk_shot_up": ph("shot_up"), "atk_shot_down": ph("shot_down"), "atk_shot_air": ph("shot"),
        "atk_charge": ph("charge"), "atk_backstep": ph("backstep"), "atk_bash": ph("bash"), "atk_counter": ph("bash"),
        "atk_g_grenade": ph("throw"), "atk_g_fan": ph("shot"), "atk_g_net": ph("shot"),
        "atk_g_trap": ph("plant"), "atk_g_rain": ph("volley"), "atk_g_spikes": ph("plant"),
        "atk_g_snipe": ph("snipe"), "atk_g_hawk": ph("charge"), "atk_g_hunt": ph("throw"),
        "hurt": {"row": rows["hurt"], "frames": 1, "col": 0},
        "down": {"row": rows["hurt"], "frames": 1, "col": 1},
    },
}
with open(os.path.join(OUT, "_glenn_link.json"), "w") as f:
    json.dump(link, f, ensure_ascii=False, indent=1)

# ── 초상화 32x32: 덥수룩한 갈색 머리, 노란 눈, 노란 손수건, 녹색 망토 ──
PORTRAIT = [
    "..........hh.hhh..h.............",
    ".......hhhhhhhhhhhhhh...........",
    ".....hhhHHhhhhHHhhhhhh..........",
    "....hhHhhhhjhhhhhhjhhhh.........",
    "...hhhhhhhhhhhhhhhhhhhhh........",
    "...hhhhjhhhhhhhhhhjhhhhh........",
    "..hhhhhhhhhhhhhhhhhhhhhhh.......",
    "..hhhhhssshhhhhhhsssshhhh.......",
    "..hhhhsssssshhhssssssshhh.......",
    "...hhssssssssssssssssssh........",
    "...hsssjjjsssssssjjjssss........",
    "...hssEeeEssssssEeeEssss........",
    "...hssEeeEssssssEeeEsssS........",
    "...hsssEEsssssssssEEsssS........",
    "....ssssssssSSsssssssssS........",
    "....SssssssssSsssssssssS........",
    ".....SsssssssssssssssSS.........",
    "......SsssskkkksssssS...........",
    ".......SSsssssssssSS............",
    "........SSSSSSSSSS..............",
    "......VvvyyyyyyyyvvV............",
    "....VVvvvyyYyyyyyvvvVV..........",
    "...VvvvvvvyyyyyyvvvvvvV.........",
    "..VvvvvwwwwyyyywwwwvvvvV........",
    ".VvvvvwwwwwwwwwwwwwwvvvvV.......",
    ".vvvvwwwwwwWwwwwwwwwwvvvv.......",
    "vvvvwwwwwwwwwwwwwwwwwwvvvv......",
    "vvvwwwwwwwwwwwwwWwwwwwwvvv......",
    "vvwwwwwwwwwwwwwwwwwwwwwwvv......",
    "vwwwwkkkkkkkkkkkkkkkkwwwwv......",
    "wwwwwwwwwwwwwwwwwwwwwwwwww......",
    "wwwwwwwwwwwwwwwwwwwwwwwwww......",
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
pp.save(os.path.join(OUT, "portrait_glenn.png"))
print("glenn sheet", sheet.size, "rows", len(ROWS))
