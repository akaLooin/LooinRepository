"""UI 텍스처·아이콘 생성기 (픽셀 아트, 전부 오리지널). 사용: python3 tools/gen_ui.py assets/ui
- 9-slice 패널/버튼 텍스처: 가장자리 장식이 있는 작은 PNG. Godot StyleBoxTexture 로 늘려 쓴다.
- 16x16 아이콘: 메뉴·재화용.
"""
import os
import sys

from PIL import Image

OUT = sys.argv[1] if len(sys.argv) > 1 else "assets/ui"
os.makedirs(OUT, exist_ok=True)


def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)


INK = C("1b1530"); INK_SOFT = C("2a2346"); INK_MID = C("3f3566")
PAPER = C("efe3c2"); PAPER_DIM = C("cbbb93"); PAPER_HI = C("fbf3dc")
LEATHER = C("7a3f2e"); LEATHER_HI = C("a8624a"); LEATHER_DK = C("5a2c20")
GOLD = C("e8b64c"); GOLD_HI = C("fff1b8"); GOLD_DK = C("b4842f")
RIBBON = C("d64a5a"); RIBBON_HI = C("f07a86"); RIBBON_DK = C("9c2f3d")
CLEAR = (0, 0, 0, 0)


def frame(w, h, fill, border, inner=None, corner=None, hi=None, sh=None):
    im = Image.new("RGBA", (w, h), CLEAR)
    p = im.load()
    for y in range(h):
        for x in range(w):
            edge = x == 0 or y == 0 or x == w - 1 or y == h - 1
            b2 = x == 1 or y == 1 or x == w - 2 or y == h - 2
            b3 = x == 2 or y == 2 or x == w - 3 or y == h - 3
            if edge:
                p[x, y] = INK
            elif b2:
                p[x, y] = border
            elif b3 and inner:
                p[x, y] = inner
            else:
                p[x, y] = fill
    if hi:
        for x in range(3, w - 3):
            p[x, 3] = hi
    if sh:
        for x in range(3, w - 3):
            p[x, h - 4] = sh
    if corner:
        for (cx, cy) in [(1, 1), (w - 4, 1), (1, h - 4), (w - 4, h - 4)]:
            for dy in range(3):
                for dx in range(3):
                    p[cx + dx, cy + dy] = corner
            p[cx + 1, cy + 1] = GOLD_HI
    # 바깥 모서리는 투명하게 (둥근 느낌)
    for (x, y) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        p[x, y] = CLEAR
    return im


def save(name, im):
    im.save(os.path.join(OUT, name + ".png"))


# ── 9-slice 텍스처 ──
save("panel_dark", frame(24, 24, INK_SOFT, GOLD_DK, INK_MID, GOLD))
save("panel_paper", frame(24, 24, PAPER, LEATHER, PAPER_DIM, GOLD, PAPER_HI))
save("btn_leather", frame(16, 16, LEATHER, LEATHER_DK, None, None, LEATHER_HI, LEATHER_DK))
save("btn_leather_hover", frame(16, 16, LEATHER_HI, GOLD_DK, None, None, C("c9805f"), LEATHER))
save("btn_leather_pressed", frame(16, 16, LEATHER_DK, LEATHER_DK, None, None, None, None))
save("btn_ribbon", frame(16, 16, RIBBON, RIBBON_DK, None, None, RIBBON_HI, RIBBON_DK))
save("btn_ribbon_hover", frame(16, 16, RIBBON_HI, GOLD, None, None, C("ffb0b8"), RIBBON))
save("btn_ribbon_pressed", frame(16, 16, RIBBON_DK, RIBBON_DK, None, None, None, None))
save("btn_disabled", frame(16, 16, C("3a3348"), C("2a2438"), None, None, C("4a4258"), None))
save("btn_focus", frame(16, 16, CLEAR, GOLD, None, None, None, None))

# ── 16x16 아이콘 (문자 격자) ──
PAL = {"o": INK, "p": PAPER, "P": PAPER_DIM, "w": PAPER_HI, "l": LEATHER, "L": LEATHER_DK, "h": LEATHER_HI,
       "g": GOLD, "G": GOLD_DK, "y": GOLD_HI, "r": RIBBON, "R": RIBBON_DK, "b": C("4fb3ff"), "B": C("2f6aa8"),
       "n": C("2f3a7a"), "N": C("1f2754"), "s": C("f3cfab"), "k": C("5a3a2a"), "v": C("9bd36b"), "V": C("5b7d4a"),
       "m": C("9aa3ad"), "M": C("6b7480"), "e": C("e2574c"), "E": C("b23a3a"), "x": C("8a7f9a")}
ICONS = {
    "char": [  # 장서표 속 인물 흉상
        "................", ".....kkkkkk.....", "....kkkkkkkk....", "....kksssskk....", "....ksosssok....",
        "....kssssssk....", ".....ssSsss.....".replace("S", "s"), "......ssss......", "....wwwwwwww....",
        "...nnnwwwwnnn...", "..nnnnnggnnnnn..", "..nnnnnggnnnnn..", "..nnnnnnnnnnnn..", "..NNNNNNNNNNNN..",
        "................", "................"],
    "bag": [
        "................", "......llll......", ".....l....l.....", ".....l....l.....", "...hhhhhhhhhh...",
        "..hlllllllllll..", "..llllgggglllL..", "..lllllggllllL..", "..llllllllllll..", "..llllllllllll..",
        "..llllllllllll..", "..lllllllllllL..", "..LLLLLLLLLLLL..", "................", "................", "................"],
    "skill": [  # 펼친 책 + 별
        "................", ".......y........", "......ygy.......", ".......y........", "..pppppo.pppppp.",
        ".pPPPPPoPPPPPPp.", ".pwwwwwowwwwwwp.", ".pwPPwwowPPwwwp.", ".pwwwwwowwwwwwp.", ".pwPPPwowPPPwwp.",
        ".pwwwwwowwwwwwp.", ".lllllllollllll.", "..LLLLLLLLLLLL..", "................", "................", "................"],
    "enhance": [  # 모루 + 망치
        "................", "..........MM....", ".........MmmM...", "........MmmM....", ".......kMM......",
        "......kk........", ".....kk.........", "....kk..........", "..mmmmmmmmmmm...", "..MmmmmmmmmmM...",
        "....MMmmmMM.....", ".....MmmmM......", "....MMMMMMM.....", "...MMMMMMMMM....", "................", "................"],
    "shop": [  # 금화 주머니
        "................", "......rrrr......", ".......rr.......", ".....llllll.....", "....lhhhhhhl....",
        "...lhllllllll...", "..llllgyyglll...", "..lllgyyyygll...", "..lllgyyyygll...", "..llllgyyglll...",
        "..lllllggllll...", "...llllllllL....", "....LLLLLLL.....", "................", "................", "................"],
    "pet": [  # 책벌레
        "................", "................", "........oo......", ".......vvvv.....", "......vwowvv....",
        "......vvvvvv....", ".vvv..vvvvv.....", "vvvvvvvvvvv.....", "VvvVvvVvvV......", ".VV.VV.VV.......",
        "................", "................", "................", "................", "................", "................"],
    "mission": [  # 두루마리
        "................", "...LLLLLLLLLL...", "..lhhhhhhhhhhl..", "...pwwwwwwwwp...", "...pwPPPPPPwp...",
        "...pwwwwwwwwp...", "...pwPPPPwwwp...", "...pwwwwwwwwp...", "...pwPPPPPPwp...", "...pwwwwwwwwp...",
        "...pwPPPwwwwp...", "..lhhhhhhhhhhl..", "...LLLLLLLLLL...", "................", "................", "................"],
    "options": [  # 톱니
        "................", ".......mm.......", "...mm.mmmm.mm...", "...mmmmmmmmmm...", "....mmmMMmmm....",
        "..mmmmM..Mmmmm..", "..mmmM....Mmmm..", "...mmM....Mmm...", "..mmmM....Mmmm..", "..mmmmM..Mmmmm..",
        "....mmmMMmmm....", "...mmmmmmmmmm...", "...mm.mmmm.mm...", ".......mm.......", "................", "................"],
    "map": [  # 지도
        "................", "..ppppp.pppppp..", "..pwwwp.pwwwwp..", "..pwrwpppwwwwp..", "..pwwrwwwwwwwp..",
        "..pwwwrrwwwwwp..", "..pwwwwwrwwwwp..", "..pwwwwwwrrwwp..", "..pwwwwwwwwrwp..", "..pwwwwwwwwwgp..",
        "..pPPPPPPPPPPp..", "..pppppp.ppppp..", "................", "................", "................", "................"],
    "gold": [
        "................", "................", ".....GGGGG......", "....GgggggG.....", "...Ggyyyyggg....",
        "...GgyGGGygG....", "...GgyGgggggG...", "...GgyGGGygG....", "...Ggyyyyggg....", "....GgggggG.....",
        ".....GGGGG......", "................", "................", "................", "................", "................"],
    "page": [
        "................", "................", "....pppppp......", "....pwwwwPp.....", "....pwPPwwPp....",
        "....pwwwwwwp....", "....pwPPPPwp....", "....pwwwwwwp....", "....pwPPPwwp....", "....pwwwwwwp....",
        "....pppppppp....", "................", "................", "................", "................", "................"],
    "potion": [
        "................", "......PPPP......", "......kkkk......", ".......ww.......", ".......ww.......",
        ".....eeeeee.....", "....eweeeeee....", "....eweeeeee....", "....eeeeeeee....", "....EeeeeeeE....",
        ".....EEEEEE.....", "................", "................", "................", "................", "................"],
    "revive": [  # 책갈피
        "................", "......rrrr......", "......rrrr......", "......rRrr......", "......rrrr......",
        "......rrrr......", "......rRrr......", "......rrrr......", "......rrrr......", "......rR.r......",
        "......r...r.....", "................", "................", "................", "................", "................"],
    "lock": [
        "................", "......mmmm......", ".....m....m.....", ".....m....m.....", "....gggggggg....",
        "....gyyyyyyg....", "....gyyGGyyg....", "....gyyGGyyg....", "....gyyyyyyg....", "....GGGGGGGG....",
        "................", "................", "................", "................", "................", "................"],
    "star": [
        "................", ".......g........", ".......g........", "......gyg.......", "..gggggyggggg...",
        "...ggyyyyygg....", "....gyyyyyg.....", "....gygggyg.....", "...gyg...gyg....", "...g.......g....",
        "................", "................", "................", "................", "................", "................"],
    "back": [
        "................", "................", "......o.........", ".....oy.........", "....oyyyyyyyy...",
        "...oyyyyyyyyy...", "....oyyyyyyyy...", ".....oy.........", "......o.........", "................",
        "................", "................", "................", "................", "................", "................"],
}
for name, grid in ICONS.items():
    im = Image.new("RGBA", (16, 16), CLEAR)
    cells = {}
    for y, row in enumerate(grid[:16]):
        for x, ch in enumerate(row[:16]):
            if ch != "." and ch in PAL:
                cells[(x, y)] = PAL[ch]
    # 외곽선
    for (x, y) in list(cells):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in cells and 0 <= n[0] < 16 and 0 <= n[1] < 16:
                im.putpixel(n, INK)
    for (x, y), c in cells.items():
        im.putpixel((x, y), c)
    save("icon_" + name, im)
print("ui written to", OUT)


# ── 장비 아이콘: 부위 6종 × 등급 3 (팔레트 교체) ──
GRADE_PAL = {
    "common": {"1": C("dfe6ee"), "2": C("9aa7b8"), "3": C("6b7789"), "4": C("8a5a3c"), "5": C("b48f55")},
    "rare": {"1": C("bfe3ff"), "2": C("4fb3ff"), "3": C("2f6aa8"), "4": C("3f5f8a"), "5": C("e8b64c")},
    "epic": {"1": C("ffd9f2"), "2": C("c77dff"), "3": C("7a3fb0"), "4": C("5a2c80"), "5": C("fff1b8")},
}
SLOT_ICONS = {
    "weapon": [
        "................", ".............11.", "............121.", "...........121..", "..........121...",
        ".........121....", "........121.....", "...5...121......", "....5.121.......", ".....543........",
        "......45........", ".....5.45.......", "....4....5......", "...44...........", "................", "................"],
    "helm": [
        "................", "......1111......", "....11222211....", "...1222222221...", "...1222222221...",
        "..122222222221..", "..1223333332211.", "..12233..33221..", "..1222....2221..", "..1222....2221..",
        "..122......221..", "...5........5...", "................", "................", "................", "................"],
    "top": [
        "................", "...111....111...", "..12221..12221..", ".1222221122222l.".replace("l", "1"), ".1222222222222..",
        "..1222255222221.", "...122255222213..", "...122222222213.", "...122222222213.", "...122222222213.",
        "...122255522213.", "...113333333311.", "................", "................", "................", "................"],
    "bottom": [
        "................", "....11111111....", "....12222221....", "....55555555....", "....12222221....",
        "....122..221....", "....122..221....", "....122..221....", "....122..221....", "....122..221....",
        "...1222..2221...", "...3333..3333...", "................", "................", "................", "................"],
    "glove": [
        "................", "......1.1.1.....", ".....121212.1...", ".....12121212...", ".....12222222...",
        ".....12222222...", "..11.12222222...", "..122122222221..", "...12222222221..", "....122222221...",
        ".....5555555....", ".....3333333....", "................", "................", "................", "................"],
    "shoe": [
        "................", "................", ".....11111......", ".....12221......", ".....12221......",
        ".....12221......", ".....122221.....", ".....1222221....", ".....12222221...", "....1222222221..",
        "....5555555555..", "....3333333333..", "................", "................", "................", "................"],
}
for slot, grid in SLOT_ICONS.items():
    for grade, gp in GRADE_PAL.items():
        im = Image.new("RGBA", (16, 16), CLEAR)
        cells = {}
        for y, row in enumerate(grid[:16]):
            for x, ch in enumerate(row[:16]):
                if ch in gp:
                    cells[(x, y)] = gp[ch]
        for (x, y) in list(cells):
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (x + dx, y + dy)
                if n not in cells and 0 <= n[0] < 16 and 0 <= n[1] < 16:
                    im.putpixel(n, INK)
        for p, c in cells.items():
            im.putpixel(p, c)
        save("item_%s_%s" % (slot, grade), im)

# ── 스킬 아이콘 (실버) ──
SK = {"w": C("f4f8fc"), "s": C("b4c0cf"), "b": C("4fb3ff"), "B": C("2f6aa8"), "g": C("e8b64c"), "y": C("fff1b8"),
      "r": C("e2574c"), "R": C("b23a3a"), "k": C("6b7789"), "n": C("2a4a8a")}
SKILL_ICONS = {
    "sk_mp1": ["................", "..........ww....", "........wwws....", "......wwwss.....", ".....wwss.......",
               "....wws.........", "...wws..........", "...ws...bbb.....", "..wws..bbbbb....", "..ws...bbBbb....",
               "..ws....bbb.....", "...w............", "................", "................", "................", "................"],
    "sk_mp2": ["................", ".....bbbbbb.....", "...bb......bb...", "..b...wwww...b..", "..b..wsssssw.b..",
               ".b...wsnnnsw..b.", ".b...wsnnnsw..b.", ".b...wsssssw..b.", "..b...wsssw..b..", "..b....wsw...b..",
               "...bb...w...bb..", ".....bbbbbb.....", "................", "................", "................", "................"],
    "sk_mp3": ["...w....w....w..", "...w....w....w..", "...s....s....s..", "................", ".w....w....w....",
               ".s....w....s....", "......s.........", "......w.........", ".....yws.........", ".....gwg........",
               "......w.........", "......w.........", "...kkkskkk......", "................", "................", "................"],
    "ps_atk": ["................", ".w..........w...", "..w........w....", "...w......w.....", "....w....w......",
               ".....w..w.......", "......ww........", "......ww........", ".....g..g.......", "....g....g......",
               "...k......k.....", "................", "................", "................", "................", "................"],
    "ps_hp": ["................", "................", "...rr....rr.....", "..rrrr..rrrr....", ".rrwrrrrrrrrr...",
              ".rwrrrrrrrrrr...", ".rrrrrrrrrrrr...", "..rrrrrrrrrr....", "...rrrrrrrr.....", "....rrrrrr......",
              ".....rrrr.......", "......rr........", "................", "................", "................", "................"],
    "ps_cut": ["................", "..k.............", "...k............", "....kk..........", ".....kkk...w....",
               "......kk..w.....", "...........w....", "........w..ww...", ".......w.....w..", "......w.........",
               ".....w..........", "....g...........", "................", "................", "................", "................"],
    "ps_armor": ["................", "...ss......ss...", "..swws....swws..", "..swwwssssswws..", "...swwwwwwwws...",
                 "...swwbbbbwws...", "...swwbnnbwws...", "...swwbbbbwws...", "...sswwwwwwss...", "....sswwwwss....",
                 ".....ssssss.....", "................", "................", "................", "................", "................"],
    "ps_firm": ["................", ".......w........", ".......w........", ".......w........", ".....gggg.......",
                ".......w........", ".......w........", ".......w........", "..kkkkkwkkkkk...", ".kkkkkkkkkkkkk..",
                "kkkkkkkkkkkkkkk.", "................", "................", "................", "................", "................"],
    "ps_gold": ["................", ".......y........", "......ygy.......", ".y...ygggy...y..", "..y..ygggy..y...",
                "....yggwggy.....", "...yggwwwggy....", "....yggwggy.....", "..y..ygggy..y...", ".y...ygggy...y..",
                "......ygy.......", ".......y........", "................", "................", "................", "................"],
}
for name, grid in SKILL_ICONS.items():
    im = Image.new("RGBA", (16, 16), CLEAR)
    cells = {}
    for y, row in enumerate(grid[:16]):
        for x, ch in enumerate(row[:16]):
            if ch in SK:
                cells[(x, y)] = SK[ch]
    for (x, y) in list(cells):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n not in cells and 0 <= n[0] < 16 and 0 <= n[1] < 16:
                im.putpixel(n, INK)
    for p, c in cells.items():
        im.putpixel(p, c)
    save("skill_" + name, im)
print("item/skill icons written")
