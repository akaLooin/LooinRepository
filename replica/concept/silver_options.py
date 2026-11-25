"""실버 외형 시안 3종 (오리지널 픽셀). python3 silver_options.py <폰트 폴더> <출력 png>"""
import sys
from PIL import Image, ImageDraw, ImageFont
FD, OUTP = sys.argv[1], sys.argv[2]
W, H, S = 400, 150, 5
def C(h): h=h.lstrip("#"); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),255)
OUT=C("1b1530")
img=Image.new("RGBA",(W,H),C("f3e6c8")); d=ImageDraw.Draw(img); d.fontmode="1"
F11=ImageFont.truetype(FD+"/Galmuri11-Bold.ttf",11); F9=ImageFont.truetype(FD+"/Galmuri9.ttf",10)
P={"h":C("f2e3a0"),"H":C("d9c477"),"s":C("f3cfab"),"S":C("d9a383"),"u":C("4a6a8f"),
   "a":C("dfe6ee"),"A":C("9aa7b8"),"D":C("6b7789"),"b":C("3f6fc0"),"B":C("2a4a8a"),"g":C("e8b64c"),
   "W":C("f4f8fc"),"K":C("b4c0cf"),"l":C("5a4636")}
BODY=[
"........hhhhhh..........",
"......hhhHHhhhh.........",
".....hhhhhhhhhhh........",
".....hhhhssshhhh........",
".....hhsssssssh.........",
".....hssussssus.........",
"......sssssssss.........",
"......sSsssssS..........",
".......SSSSSS...........",
"....aaaaAAAAaaaa........",
"...aaaaaabbaaaaaa.......",
"...aaAaaabbaaaAaa.ss....",
"...aa.aaabbaaa.aa.ss....",
"...ss.aaabbaaa..........",
"......AAAggAAA..........",
"......aaaAAaaa..........",
"......aaa..aaa..........",
"......aaA..aaA..........",
"......AAA..AAA..........",
".....DDDD..DDDD.........",
]
TAB=list(BODY); TAB[10]="..gaaaaabbbbaaaaag......"; TAB[9]="...gaaaAAAAAAaaag......."
TAB[14]="......AAbggbAA.........."; TAB[15]="......abbbbbba.........."; TAB[16]="......aabbbbaa.........."; TAB[17]="......aaAbbaaA.........."
SW_UP=[".W.",".W.",".W.",".W.",".W.",".W.",".W.",".W.",".WK",".WK","ggg",".l."]
SW_FW=["....WWWWWWWWWWWW.","gl.WWWWWWWWWWWWWW","gl.KKKKKKKKKKKK.."]
CAPE=["bb..","bbb.","bbbb","bbbB","bbBB","bbBB","bbBB","bBBB",".BBB","..BB"]
HALF=["bbbb","bbbB","bbBB",".bBB","..BB"]
def stamp(g,x,y):
    cells={}
    for j,r in enumerate(g):
        for i,ch in enumerate(r):
            if ch!=".": cells[(x+i,y+j)]=P[ch]
    for (cx,cy) in cells:
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            n=(cx+dx,cy+dy)
            if n not in cells and img.getpixel(n)[:3]==(243,230,200) or n not in cells and img.getpixel(n)[:3]==(231,214,176): img.putpixel(n,OUT)
    for p,c in cells.items(): img.putpixel(p,c)
for y in range(18,110,9): d.line([(0,y),(W,y)],fill=C("e7d6b0"))
d.rectangle([0,112,W,H],fill=C("e2cc9c")); d.line([(0,112),(W,112)],fill=OUT)
def draw(kind,x,y):
    if kind=="A": stamp(CAPE,x,y+10); stamp(BODY,x,y); stamp(SW_UP,x+18,y)
    if kind=="B": stamp(TAB,x,y); stamp(SW_UP,x+18,y)
    if kind=="C": stamp(HALF,x,y+9); stamp(BODY,x,y); stamp(SW_FW,x+18,y+10)
info=[("A","A. 푸른 망토","등 뒤 긴 파란 망토"),("B","B. 푸른 휘장","금테 견갑 · 파란 휘장"),("C","C. 반망토","짧은 어깨 망토 · 겨눔")]
for i,(k,t,sub) in enumerate(info):
    x0=20+i*128
    draw(k,x0+70,112-20)
    tmp=Image.new("RGBA",(44,24),C("f3e6c8"))
    # 2배 확대본: 별도 캔버스에 다시 그리기 대신 영역 복사
    crop=img.crop((x0+66,112-24,x0+110,112)).resize((88,48),Image.NEAREST)
    img.paste(crop,(x0-14,112-52))
    d.text((x0-10,118),t,font=F11,fill=OUT); d.text((x0-10,132),sub,font=F9,fill=C("5a4a3a"))
d.text((6,3),"실버 외형 시안 — 왼쪽: 2배 확대 / 오른쪽: 실제 게임 크기",font=F9,fill=OUT)
img.resize((W*S,H*S),Image.NEAREST).save(OUTP)
