"""글렌 외형 시안 3종 (오리지널 픽셀). python3 glenn_options.py <폰트 폴더> <출력 png>"""
import sys
from PIL import Image, ImageDraw, ImageFont
FD, OUTP = sys.argv[1], sys.argv[2]
W, H, S = 420, 150, 5
def C(h): h=h.lstrip("#"); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),255)
OUT=C("1b1530"); BG=C("f3e6c8"); LINE=C("e7d6b0")
img=Image.new("RGBA",(W,H),BG); d=ImageDraw.Draw(img); d.fontmode="1"
F11=ImageFont.truetype(FD+"/Galmuri11-Bold.ttf",11); F9=ImageFont.truetype(FD+"/Galmuri9.ttf",10)
P={"h":C("7a4a2a"),"H":C("9a6238"),"s":C("e9bf95"),"S":C("c99a72"),"u":C("ffd23f"),
   "c":C("efe3c2"),"C":C("cbbb93"),"v":C("2f5a3a"),"V":C("1f3f2a"),"l":C("8a5a3c"),"L":C("5a3a22"),
   "y":C("e8b64c"),"Y":C("ffd23f"),"w":C("b07a48"),"W":C("7a4f2a"),"m":C("9aa3ad"),"q":C("d9c9a2"),"k":C("3a2a22")}
HEAD=[
"...hhhhhhh...",
"..hhHhhHhhh..",
".hhhhhhhhhhh.",
".hhHhsssshhh.",
"hhhssssussh..",
".hhsssssusss.",
"..hsssssssss.",
"..hSssssss...",
"...SSSSSS....",
]
BODIES={
"A":[ # 농부 사냥꾼: 크림 셔츠 + 녹색 조끼 + 도구 벨트
"..ccvvvvcc...",
".cccvvvvccc..",
".ccvvvvvvcc..",
".s.vvvvvv.s..",
".s.vvvvvv.s..",
"...vvvvvv....",
"..ymymymyy...",
"...llllll....",
"...llllll....",
"...ll..ll....",
"...ll..ll....",
"...LL..LL....",
"..LLL..LLL...",
],
"B":[ # 숲 사냥꾼: 짧은 녹색 망토 + 가죽 흉갑 + 노란 손수건
".VVYYYYYVV...",
"VVvwwwwwwvV..",
"Vvvwwwwwwvv..",
"vv.wwWWww.v..",
"v.swwwwwws...",
"..swwwwwws...",
"...kkkkkk....",
"...llllll....",
"...llllll....",
"...ll..ll....",
"...ll..ll....",
"...LL..LL....",
"..LLL..LLL...",
],
"C":[ # 들판 정찰꾼: 노란 두건 + 가죽 조끼 + 덫 도구 띠
"..cwwwwwwc...",
".ccwmwwwwcc..",
".cwwwmwwwwc..",
".s.wwwmwww.s.",
".s.wwwwmww.s.",
"...wwwwwmw...",
"...kkkkkk....",
"...vvvvvv....",
"...vvvvvv....",
"...vv..vv....",
"...vv..vv....",
"...LL..LL....",
"..LLL..LLL...",
],
}
BANDANA=["..YYYYYYY....",".YYyYYYYYY..."]
BOW=["..W.",".W..","W...","W...","W...","W...","W...",".W..","..W."]
STRING=[(3,0),(3,1),(3,2),(3,3),(3,4),(3,5),(3,6),(3,7),(3,8)]
QUIVER=["ww","wW","wW","wW","wW","WW"]
ARROWS=["q.q","q.q"]
def stamp(g,x,y,pal=P):
    cells={}
    for j,r in enumerate(g):
        for i,ch in enumerate(r):
            if ch!="." and ch in pal: cells[(x+i,y+j)]=pal[ch]
    return cells
def draw(kind,x,y):
    cells={}
    if kind=="B":
        cells.update(stamp(QUIVER,x-1,y+8)); cells.update(stamp(ARROWS,x-2,y+6))
    cells.update(stamp(HEAD,x,y))
    if kind=="C": cells.update(stamp(BANDANA,x,y))
    cells.update(stamp(BODIES[kind],x,y+9))
    cells.update(stamp(BOW,x+12,y+6))
    for (i,j) in STRING: cells[(x+12+i-1,y+6+j)]=C("efe3c2")
    for (cx,cy) in list(cells):
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            n=(cx+dx,cy+dy)
            if n not in cells and 0<=n[0]<W and 0<=n[1]<H and img.getpixel(n)[:3] in (BG[:3],LINE[:3]): img.putpixel(n,OUT)
    for p,c in cells.items(): img.putpixel(p,c)
for y in range(18,110,9): d.line([(0,y),(W,y)],fill=LINE)
d.rectangle([0,112,W,H],fill=C("e2cc9c")); d.line([(0,112),(W,112)],fill=OUT)
info=[("A","A. 농부 사냥꾼","녹색 조끼 · 도구 벨트"),("B","B. 숲 사냥꾼","녹색 망토 · 화살통"),("C","C. 들판 정찰꾼","노란 두건 · 덫 도구 띠")]
for i,(k,t,sub) in enumerate(info):
    x0=16+i*136
    draw(k,x0+78,112-23)
    crop=img.crop((x0+74,112-26,x0+96,112)).resize((44*2,52*2),Image.NEAREST)
    crop=img.crop((x0+74,112-26,x0+96,112)).resize((44,52),Image.NEAREST)
    img.paste(crop,(x0+6,112-54))
    d.text((x0-4,117),t,font=F11,fill=OUT); d.text((x0-4,131),sub,font=F9,fill=C("5a4a3a"))
d.text((6,3),"글렌 외형 시안 — 왼쪽: 2배 확대 / 오른쪽: 실제 게임 크기",font=F9,fill=OUT)
img.resize((W*S,H*S),Image.NEAREST).save(OUTP)
