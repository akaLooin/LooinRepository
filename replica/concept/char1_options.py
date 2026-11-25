"""캐릭터 #1 시안 3종 (오리지널). 각 스프라이트 ~40px, 시트 360x170 → x5."""
import sys
from PIL import Image, ImageDraw, ImageFont

HERE = sys.argv[1]
W, H, S = 432, 176, 5

def C(h, a=255):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

OUT = C("1b1530")
img = Image.new("RGBA", (W, H), C("f3e6c8"))
d = ImageDraw.Draw(img)
d.fontmode = "1"
F11 = ImageFont.truetype(f"{HERE}/Galmuri11-Bold.ttf", 11)
F9 = ImageFont.truetype(f"{HERE}/Galmuri9.ttf", 10)

def px(x, y, c):
    if 0 <= x < W and 0 <= y < H:
        img.putpixel((x, y), c)

def sprite(grid, pal, x, y):
    cells = {}
    for j, row in enumerate(grid):
        for i, ch in enumerate(row):
            if ch != ".":
                cells[(i, j)] = pal[ch]
    for (i, j) in cells:
        for di, dj in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            if (i + di, j + dj) not in cells:
                px(x + i + di, y + j + dj, OUT)
    for (i, j), c in cells.items():
        px(x + i, y + j, c)

# 배경: 페이지 줄 + 바닥
for y in range(18, H, 9):
    d.line([(0, y), (W, y)], fill=C("e7d6b0"))
d.rectangle([0, 128, W, H], fill=C("e2cc9c"))
d.line([(0, 128), (W, 128)], fill=OUT)

# ── A. 서장의 기사 ── 잿빛 금발 소년 기사, 청록 망토, 겹친 페이지 모양 견갑, 책갈피 대검
A = {"h": C("d8cfa8"), "H": C("b3a77d"), "s": C("f3cfab"), "S": C("d9a383"), "e": C("1b1530"),
     "a": C("c9d3dc"), "A": C("8e9aa8"), "p": C("fbf3dc"), "P": C("d9c9a2"), "t": C("2f8a8a"), "T": C("1f5e66"),
     "g": C("e8b64c"), "b": C("5a3a2a"), "B": C("eef3f8"), "K": C("aeb9c6"), "r": C("d64a5a"), "R": C("9c2f3d")}
gA = [
    ".......................BB...",
    "......................BBBK..",
    ".......hhhhh..........BBBK..",
    ".....hhhHHhhh.........BBBK..",
    "....hhhhhhhhhh........BBBK..",
    "....hhhsssshhh........BBBK..",
    "....hhsssesss.........BBBK..",
    "....hsssssess.........BBBK..",
    ".....sSssssss.........BBBK..",
    "......SSSSSS..........BBBK..",
    "....pppaaaaapp........BBBK..",
    "...ppPPaaaaaPPpp......BBBK..",
    "..tpPPaaAaaaaPPpt.....BBBK..",
    "..ttpaaaAaaaaaptt.....BBBK..",
    "..ttaaaaAaaaaaattt...gggggg.",
    "..ttaaaaAaaaaaatttss..rbb...",
    ".tttaaaAAaaaaattt.ss..rbb...",
    ".tttggggggggggttT.....rbb...",
    ".tttaaaaAaaaaaatT....rR.....",
    ".ttTaaaaAaaaaaatT...........",
    ".ttTaaaAAaaaaaaTT...........",
    ".tTTaaaaaaAAaaaTT...........",
    ".tTT.aaaa..aaaaTT...........",
    ".TT..AAaa..aaAA.T...........",
    ".T...AAaa..aaAA.............",
    ".....bbbb..bbbb.............",
    "....bbbbb..bbbbb............",
]
# ── B. 사서 견습생 ── 동그란 안경, 베레모, 긴 사서 코트, 사슬로 묶은 두꺼운 책(둔기)
B = {"h": C("2e2a4a"), "H": C("4a4472"), "s": C("f3cfab"), "S": C("d9a383"), "e": C("1b1530"), "o": C("e8b64c"),
     "m": C("7a3f2e"), "M": C("5a2c20"), "c": C("6b4a8a"), "C": C("4a3366"), "w": C("fbf3dc"), "W": C("d9c9a2"),
     "k": C("3a2a22"), "l": C("9aa3ad"), "L": C("6b7480"), "n": C("7a1f2a"), "N": C("b23a3a"), "q": C("fbf3dc")}
gB = [
    "......mmmmmmm...............",
    ".....mmmMmmmmm..............",
    "....mmmmmmmmmmm.............",
    "....hhhhhhhhhhh.............",
    "...hhhHHhhhhhhhh............",
    "...hhhsssssssshh............",
    "...hhoooossoooohh...........",
    "...hhoesossoesohh...........",
    "...hhoooossoooohh...........",
    "...hh.ssssSsss.hh...........",
    "...hh..SSSSSS..hh...........",
    "....h.wwwwwwww.h............",
    "....cccwwWWwwccc............",
    "...ccccwWWWWwcccc...........",
    "...cccccwWWwccccc.ss........",
    "..ccccccccccccccc.sslLlLl.....",
    "..cccccccoccccccc......lL.....",
    "..cccCccccccCcccc....NNNNNNNN.",
    "..ccCCcccoccCCccc....NqqqqqqnN",
    "..cccCccccccCCccc....NqWWqqqnN",
    "..ccCCcccocccCCcc....NqqqWWqnN",
    "..ccCCcccccccCCcc....NqqqqqqnN",
    "..cCCCcccccccCCCc....NNNNNNNNN",
    "..CCCccc...cccCCC...........",
    "........kk.kk...............",
    "......kkkk.kkkk.............",
    ".....kkkkk.kkkkk............",
]
# ── C. 활자 검사 ── 잉크로 이루어진 몸에 떠다니는 글자, 크림색 가면, 펜촉 창
Cp = {"i": C("2b2140"), "I": C("4a3a6e"), "j": C("6a58a0"), "f": C("fbf3dc"), "F": C("d9c9a2"), "e": C("d64a5a"),
      "g": C("e8b64c"), "G": C("b4842f"), "l": C("3a2a22"), "n": C("c9d3dc"), "N": C("8e9aa8"), "y": C("ffe76a")}
gC = [
    "..........................nN",
    ".........................nNN",
    "........................nNg.",
    ".......iiiii...........nNg..",
    ".....iiiIIIii.........lg....",
    "....iiiffffffi.......ll.....",
    "....iiffffffffi.....ll......",
    "....iiffeffffeff...ll.......",
    "....iiffffffffff..ll........",
    "....iiiFffffffF..ll.........",
    ".....iiiFFFFFi..ll..........",
    "......gggggggg.ll...........",
    "....iiiiiiiiiiyll...........",
    "...iiiIiyiiiiiill...........",
    "..iiiiIiiiijiiill...........",
    "..iiiIIiiyiiiiil............",
    "..iijiIiiiiiiiill...........",
    "..iiiiIiiiiyiiii............",
    "...iiigggggggggii...........",
    "...iiiiiIiiiIiiii...........",
    "...iiiiIIiiiiIIii...........",
    "...iiiIIi..iiIIii...........",
    "...iiiIi....iIIii...........",
    "...iiIIi....iIIi............",
    "....iIi......iIi.y..........",
    "...iiiii....iiiii..y........",
    "..iiiiii....iiiiii..........",
]

cols = [
    (12, gA, A, "A. 서장의 기사", "영웅담 첫 장의 주인공", "책갈피 대검 · 정석 콤보"),
    (156, gB, B, "B. 사서 견습생", "도서관의 견습 사서", "사슬 책 둔기 · 묵직한 한 방"),
    (300, gC, Cp, "C. 활자 검사", "문장이 사람이 된 존재", "펜촉 창 · 긴 사거리"),
]
for (x0, g, pal, title, sub, play) in cols:
    # 그림자
    for xx in range(-12, 14):
        px(x0 + 34 + xx, 129, C("c3a876"))
    sprite(g, pal, x0 + 20, 128 - len(g) - 1)
    # 2배 확대본 (디테일 보기용)
    big = Image.new("RGBA", (40, 40), (0, 0, 0, 0))
    tmp = img.crop((x0 + 18, 128 - len(g) - 3, x0 + 18 + 30, 128))
    tmp = tmp.resize((tmp.width * 2, tmp.height * 2), Image.NEAREST)
    img.paste(tmp, (x0 + 14, 30 - 4), tmp)
    d.text((x0 + 4, 134), title, font=F11, fill=OUT)
    d.text((x0 + 4, 147), sub, font=F9, fill=C("5a4a3a"))
    d.text((x0 + 4, 158), play, font=F9, fill=C("7a3f2e"))

d.text((6, 4), "캐릭터 #1 시안 (입문용 근접형)  ·  위: 2배 확대  ·  아래: 실제 게임 크기", font=F9, fill=OUT)
out = img.resize((W * S, H * S), Image.NEAREST)
out.save(f"{HERE}/char1_options.png")
print("ok")
