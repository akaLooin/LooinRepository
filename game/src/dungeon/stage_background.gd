class_name StageBackground
extends Node2D
## 책 속 세계 배경: 팔레트별 하늘 + 시차 스크롤 잉크 스케치 + 발판(종이/잉크선) + 포탈(넘어가는 페이지).

const PALETTES := {
	"parchment": [Color("f2e6c4"), Color("e3cf9e"), Color("b79f6e"), Color("6d5a3a")],
	"dusk": [Color("f0c9a0"), Color("c98d7a"), Color("7b5a74"), Color("3e2f4a")],
	"deep": [Color("9fb6c2"), Color("6f8a9b"), Color("41596b"), Color("1f2d3a")],
	"sky": [Color("d6eef2"), Color("a9d3df"), Color("6aa0b8"), Color("33566e")],
	"boss": [Color("4a2a3a"), Color("6b3a46"), Color("2c1a28"), Color("140c16")],
	"bell": [Color("ead9b6"), Color("c9a98a"), Color("6f8a86"), Color("2f3f42")],
	"bell_dark": [Color("8f8a74"), Color("6e6a58"), Color("4a5a56"), Color("222b2c")],
	"bell_boss": [Color("3c4a48"), Color("5b4a3a"), Color("2a3433"), Color("121818")],
	"water": [Color("bfd9d2"), Color("86b3ad"), Color("3f6f74"), Color("1d3438")],
	"water_boss": [Color("23404a"), Color("2f5560"), Color("173038"), Color("0a171c")],
}

var run: Node
var stage: Dictionary = {}
var pal: Array = []
var cam_x := 240.0
var portals: Array = []
var _t := 0


func setup(r: Node, st: Dictionary) -> void:
	run = r
	stage = st
	pal = PALETTES.get(st.get("palette", "parchment"), PALETTES["parchment"])
	portals = []
	queue_redraw()


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	if pal.is_empty():
		return
	var width := float(run.width)
	var vw := get_viewport_rect().size.x + 40.0
	var left := cam_x - vw / 2.0
	# 하늘 띠
	for i in range(6):
		var c: Color = pal[0].lerp(pal[1], i / 5.0)
		draw_rect(Rect2(left - 20, i * 40.0, vw + 40, 40), c)
	# 먼 산 (시차 0.3) — 잉크로 그린 스케치 느낌
	var off := cam_x * 0.7
	for k in range(-2, 14):
		var bx: float = floor(off / 90.0) * 90.0 + k * 90.0 - 200.0
		var hh := 40.0 + float((int(bx) * 13 + 7) % 50)
		var x: float = bx
		draw_rect(Rect2(x, 200 - hh, 70, hh + 40), Color(pal[2], 0.55))
		draw_rect(Rect2(x, 200 - hh, 70, 2), Color(pal[3], 0.6))
	# 가까운 글줄 장식 (시차 0.6)
	var off2 := cam_x * 0.4
	for k in range(-2, 20):
		var lx: float = floor(off2 / 40.0) * 40.0 + k * 40.0 - 200.0
		draw_rect(Rect2(lx, 214 + (int(lx) % 3) * 4, 26, 1), Color(pal[3], 0.35))
	# 발판
	for p in run.platforms:
		var r: Rect2 = p["rect"]
		if p["oneway"]:
			draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 5), Tk.PAPER)
			draw_rect(Rect2(r.position.x, r.position.y + 5, r.size.x, 2), Tk.PAPER_DIM)
			draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 1), pal[3])
			for x in range(int(r.position.x) + 6, int(r.end.x) - 4, 9):
				draw_rect(Rect2(x, r.position.y + 2, 5, 1), Color(pal[3], 0.5))
		else:
			draw_rect(r, pal[3])
			draw_rect(Rect2(r.position.x, r.position.y, r.size.x, 3), pal[2])
			for x in range(int(r.position.x), int(r.end.x), 16):
				draw_rect(Rect2(x + 4, r.position.y + 8 + (x / 16 % 3) * 6, 6, 1), Color(pal[1], 0.4))
	# 포탈: 빛나는 펼쳐진 페이지
	for p in portals:
		var r: Rect2 = p["rect"]
		var glow := 0.6 + 0.4 * sin(_t * 0.12)
		draw_rect(r.grow(3), Color(Tk.GOLD, 0.25 * glow))
		draw_rect(r, Color(Tk.PAPER, 0.95))
		var flip := int(_t / 8) % 3
		draw_rect(Rect2(r.position.x + 2 + flip * 3, r.position.y + 3, 2, r.size.y - 6), Color(Tk.GOLD, 0.8))
		for i in range(4):
			draw_rect(Rect2(r.position.x + 4, r.position.y + 8 + i * 6, 12, 1), Tk.PAPER_DIM)
