"""루미나 외형 시안 3종 (오리지널 픽셀). python3 lumina_options.py <폰트 폴더> <출력 png>"""
import sys
from PIL import Image, ImageDraw, ImageFont
FD, OUTP = sys.argv[1], sys.argv[2]
W, H, S = 420, 150, 5
def C(h): h=h.lstrip("#"); return (int(h[0:2],16),int(h[2:4],16),int(h[4:6],16),255)
OUT=C("1b1530"); BG=C("f3e6c8"); LINE=C("e7d6b0")
img=Image.new("RGBA",(W,H),BG); d=ImageDraw.Draw(img); d.fontmode="1"
F11=ImageFont.truetype(FD+"/Galmuri11-Bold.ttf",11); F9=ImageFont.truetype(FD+"/Galmuri9.ttf",10)
P={"h":C("dfe6ee"),"H":C("aab6c6"),"s":C("f3d2b4"),"S":C("d9ab8c"),"e":C("8a4fd0"),"m":C("c96a7a"),
   "r":C("6b3fa0"),"R":C("4a2a78"),"y":C("ffd23f"),"Y":C("e8b64c"),"w":C("a8743c"),"W":C("7a4f2a"),
   "b":C("3a2a52"),"k":C("2a1f38"),"g":C("5b8a3a"),"q":C("efe3c2"),"c":C("8a5a3c")}
HEAD=[
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
BODIES={
"A":[ # 학자풍: 긴 보라 로브 + 노란 띠 + 허리 마도서
"..rrryyyrrr..",
".rrrrryrrrrr.",
".rrrrryrrrrr.",
".s.rrryrrr.s.",
"...rrrYrrr...",
"..rrrrrrrrr..",
"..rrrrrrcc...",
"..rrrrrrccq..",
"..rrrrrrrrr..",
"..RrrrrrrrR..",
"..RRrrrrrRR..",
"..RRRRRRRRR..",
"...kk...kk...",
],
"B":[ # 견습 마녀풍: 짧은 케이프 + 로브 드레스 + 부츠, 마도서 품에
".RRrrrrrrrRR.",
"RRrrrrrrrrrRR",
".rrryyyyyrr..",
"..rrrrrrrr...",
".s.rrrrrrcc..",
"...rrrrrrccq.",
"..rrrrrrrrr..",
"..rrrrrrrrr..",
"..RRRRRRRRR..",
"...ss...ss...",
"...ss...ss...",
"...bb...bb...",
"..bbb..bbb...",
],
"C":[ # 연구원풍: 로브 + 노란 스카프 + 떠다니는 마도서
"..yyyyyyyy...",
".ryyyyyyyyr..",
".rrrrryyrrr..",
".s.rrrryrr.s.",
"...rrrryrr...",
"..rrrrrrrrr..",
"..rrrrrrrrr..",
"..rrrYYYrrr..",
"..rrrrrrrrr..",
"..RrrrrrrrR..",
"..RRrrrrrRR..",
"...bb...bb...",
"..bbb..bbb...",
],
}
STAFF=["..y.",".yyy","..y.","..w.","..w.","..w.","..w.","..w.","..W.","..W.","..W.","..W.","..W.","..W.","..W.","..W.","..W.","..W."]
BOOK=["cccc","cqqc","cqqc","cccc"]
def stamp(g,x,y):
    cells={}
    for j,r in enumerate(g):
        for i,ch in enumerate(r):
            if ch!="." and ch in P: cells[(x+i,y+j)]=P[ch]
    return cells
def draw(kind,x,y):
    cells={}
    cells.update(stamp(HEAD,x,y))
    cells.update(stamp(BODIES[kind],x,y+9))
    cells.update(stamp(STAFF,x+12,y+2))
    if kind=="C": cells.update(stamp(BOOK,x-5,y+8))
    for (cx,cy) in list(cells):
        for dx,dy in((1,0),(-1,0),(0,1),(0,-1)):
            n=(cx+dx,cy+dy)
            if n not in cells and 0<=n[0]<W and 0<=n[1]<H and img.getpixel(n)[:3] in (BG[:3],LINE[:3]): img.putpixel(n,OUT)
    for p,c in cells.items(): img.putpixel(p,c)
for y in range(18,110,9): d.line([(0,y),(W,y)],fill=LINE)
d.rectangle([0,112,W,H],fill=C("e2cc9c")); d.line([(0,112),(W,112)],fill=OUT)
info=[("A","A. 학자풍","긴 로브 · 허리 마도서"),("B","B. 견습 마녀풍","짧은 케이프 · 부츠"),("C","C. 연구원풍","스카프 · 뜬 마도서")]
for i,(k,t,sub) in enumerate(info):
    x0=16+i*136
    draw(k,x0+80,112-23)
    crop=img.crop((x0+74,112-26,x0+96,112)).resize((44,52),Image.NEAREST)
    img.paste(crop,(x0+6,112-54))
    d.text((x0-4,117),t,font=F11,fill=OUT); d.text((x0-4,131),sub,font=F9,fill=C("5a4a3a"))
d.text((6,3),"루미나 외형 시안 — 왼쪽: 2배 확대 / 오른쪽: 실제 게임 크기",font=F9,fill=OUT)
img.resize((W*S,H*S),Image.NEAREST).save(OUTP)
