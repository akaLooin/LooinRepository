"""시범 스프라이트 시트 생성기 (오리지널 픽셀 아트). 사용: python3 tools/gen_sprites.py assets/sprites
아트 규격: replica/art-spec.md — 한 칸 = 한 프레임, 행 = 애니메이션, 오른쪽을 보는 방향으로 그린다.
"""
import os
import sys

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/sprites"
os.makedirs(OUT, exist_ok=True)


def C(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 255)


OUTLINE = C("1b1530")


def stamp(img, grid, pal, ox, oy, outline=True):
    cells = {}
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch != "." and ch in pal:
                cells[(ox + i, oy + j)] = pal[ch]
    if outline:
        for (x, y) in list(cells):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in cells and 0 <= n[0] < img.width and 0 <= n[1] < img.height and img.getpixel(n)[3] == 0:
                    img.putpixel(n, OUTLINE)
    for p, c in cells.items():
        if 0 <= p[0] < img.width and 0 <= p[1] < img.height:
            img.putpixel(p, c)


# ───────── 견습 사서 (임시 캐릭터) 48x48, 발 위치 (24, 44) ─────────
HERO = {"h": C("5a3a2a"), "H": C("82563a"), "s": C("f3cfab"), "S": C("d9a383"), "e": C("1b1530"),
        "c": C("2f3a7a"), "C": C("1f2754"), "k": C("4f60b0"), "g": C("e8b64c"), "w": C("f6eedb"),
        "W": C("cbbb93"), "b": C("4a3326"), "p": C("26304f"),
        "B": C("e9f0f7"), "K": C("aab8c8"), "r": C("d64a5a"), "R": C("9c2f3d"), "l": C("6b3a24")}
HEAD = [
    "....hhhhh....",
    "..hhHHHhhh...",
    ".hhHHhhhhhh..",
    ".hhhhhhhhhhh.",
    ".hhhhsssshhh.",
    ".hhhssssesss.",
    "..hsssssesss.",
    "..hSsssssss..",
    "...SSSSSS....",
]
TORSO = [
    "wwwwwwwwwww..",
    ".WwwwWWwwwwg.",
    "..ccckkcccg..",
    "..cckkkcccg..",
    ".cckkcccccg..",
    ".cckcccCCg...",
    ".cckkccCCg...",
    ".ggggggggg...",
    ".cccCccCCC...",
]
LEGS = {
    "stand": [".ccc..ccC....", ".ccC..cCC....", ".ppp..ppp....", ".bbb..bbb....", "bbbb..bbbb..."],
    "run1": [".ccc...ccC...", "ccC.....cCC..", "pp.......pp..", "bb.......bbb.", "bbb.......bb."],
    "run2": ["..cccccC.....", "...ccCC......", "...pppp......", "...bbbb......", "..bbbbb......"],
    "run3": ["ccc....ccC...", ".ccC....cCC..", "..pp.....pp..", "..bb.....bbb.", ".bbb......bb."],
    "air": [".ccc.ccC.....", "..cC..cC.....", "..pp...pp....", "..bb....bb...", "..b......b..."],
    "crouch": ["cccc...ccCC..", "ccC......cC..", "pp........pp.", "bbb.......bbb", "............."],
}
SWORD_DOWN = ["..B", "..B", "..B", "..B", "..B", "..B", "..K", "gggg", ".l.", ".r.", "rR."]
SWORD_UP = ["..B..", "..B..", "..B..", "..B..", "..B..", "..BK.", "..K..", ".ggg.", "..l..", ".rR..", "rR..."]
SWORD_SWING = ["........BBBBBBBBBBBBB.", "gg.ll.BBBBBBBBBBBBBBBB", "ggglllgKKKKKKKKKKKKKK.", "gg....................", ".rr...................", "rR...................."]
SWORD_LOW = ["gg.ll..........", "ggglllgKKKKBB..", "........KKBBBB.", "...........KBBB", ".rr............", "rR............."]


def hero_frame(legs="stand", sword="down", bob=0, lean=0, scarf=0):
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    base_y = 44 - 23 + bob        # 머리~발 23줄
    x = 17 + lean
    # 스카프 꼬리 (뒤로 날림)
    tail = [["ww", "wW"], ["www", ".wW"], ["wwww", "..wW"]][scarf]
    stamp(im, tail, HERO, x - len(tail[0]) + 1, base_y + 9)
    stamp(im, HEAD, HERO, x, base_y)
    stamp(im, TORSO, HERO, x, base_y + 9)
    stamp(im, LEGS[legs], HERO, x, base_y + 18)
    # 손
    if sword == "down":
        stamp(im, ["ss"], HERO, x + 10, base_y + 12)
        stamp(im, SWORD_DOWN, HERO, x + 9, base_y + 3)
    elif sword == "up":
        stamp(im, ["ss"], HERO, x - 1, base_y + 10)
        stamp(im, SWORD_UP, HERO, x - 4, base_y - 6)
    elif sword == "swing":
        stamp(im, ["ss"], HERO, x + 10, base_y + 11)
        stamp(im, SWORD_SWING, HERO, x + 9, base_y + 10)
    elif sword == "low":
        stamp(im, ["ss"], HERO, x + 10, base_y + 13)
        stamp(im, SWORD_LOW, HERO, x + 9, base_y + 12)
    return im


def hero_down():
    im = Image.new("RGBA", (48, 48), (0, 0, 0, 0))
    body = [
        "......hhhh...........",
        "....hhhhhhh.wwwcccc..",
        "...hhhsssshwwcckkcccb",
        "...hhsssessccccCCCCbb",
        "....SSSSSS.gggpppppbb",
    ]
    stamp(im, body, HERO, 12, 39)
    stamp(im, ["BBBBBBBBBK", ".........."], HERO, 30, 44, True)
    return im


rows = [
    [hero_frame(bob=0), hero_frame(bob=1)],                                                     # 0 idle
    [hero_frame("run1", scarf=1), hero_frame("run2", bob=-1, scarf=2), hero_frame("run3", scarf=1), hero_frame("run2", bob=-1, scarf=2)],  # 1 run
    [hero_frame("air", "down", bob=-1, scarf=1), hero_frame("crouch", "low", bob=2, lean=2, scarf=2)],  # 2 air, dash
    [hero_frame("stand", "up", lean=-1), hero_frame("crouch", "swing", bob=1, lean=2, scarf=2), hero_frame("stand", "low", lean=1, scarf=1)],  # 3 attack
    [hero_frame("crouch", "down", bob=2, lean=-2), hero_down()],                                  # 4 hurt, down
]
sheet = Image.new("RGBA", (48 * 4, 48 * len(rows)), (0, 0, 0, 0))
for r, frames in enumerate(rows):
    for c, fr in enumerate(frames):
        sheet.paste(fr, (c * 48, r * 48), fr)
sheet.save(os.path.join(OUT, "hero_tbd_01.png"))

# ───────── 번진 잉크 24x20, 발 위치 (12, 18) ─────────
INK = {"I": C("2b1f4a"), "J": C("7a62c8"), "j": C("4b3a86"), "Y": C("ffe76a"), "K": C("150f24"), "w": C("ffffff"), "D": C("ff5a5a")}
BLOB = [
    ".....IIIIII.....", "...IIIIIIIIII...", "..IIjjIIIIIIII..", ".IIjJJjIIIIIIII.", ".IIjJjIIIIIIIII.",
    "IIIjjIIIYYIIYYII", "IIIIIIIIYwIIYwII", "IIIIIIIIYYIIYYII", "IIIIIIIIIIIIIIII", "IIIIIIIKKKKIIIII",
    "IIIIIIIIIIIIIIII", ".IIIKIIIIIIIKIII", "KKI..KKIIKK..KIK",
]


def blob(squash=0, angry=False, flat=False):
    im = Image.new("RGBA", (24, 20), (0, 0, 0, 0))
    g = list(BLOB)
    if angry:
        g = [row.replace("Y", "D") for row in g]
    if flat:
        g = ["...IIIIIIIIII...", ".IIIIjJjIIIIIII.", "IIIIIIIIIIIIIIII", "KKIIIIIIIIIIIKKK"]
        stamp(im, g, INK, 4, 14)
        return im
    if squash:
        g = g[:4] + g[5:]           # 한 줄 눌림
    stamp(im, g, INK, 4, 18 - len(g))
    return im


brows = [[blob(0), blob(1)], [blob(0), blob(1)], [blob(0, True), blob(1, True)], [blob(1), blob(flat=True)]]
bsheet = Image.new("RGBA", (24 * 2, 20 * len(brows)), (0, 0, 0, 0))
for r, frames in enumerate(brows):
    for c, fr in enumerate(frames):
        bsheet.paste(fr, (c * 24, r * 20), fr)
bsheet.save(os.path.join(OUT, "mon_inkblob.png"))
print("sprites written to", OUT)
