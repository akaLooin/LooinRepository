class_name Shopkeeper
extends Control
## 매점 주인: 두더지 제본사 「모루」 (오리지널 NPC). 둥근 안경, 앞치마, 귀 뒤에 꽂은 깃펜.

var _t := 0


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	var c := Vector2(size.x / 2.0, size.y)
	draw_rect(Rect2(Vector2.ZERO, size), Color("3a2a22"))
	for i in range(3):
		draw_rect(Rect2(4, 10 + i * 22, size.x - 8, 3), Color("5a3a2a"))
		for k in range(6):
			draw_rect(Rect2(10 + k * 20, i * 22 - 2, 8, 12), [Tk.HP, Tk.MP, Tk.GOLD, Tk.EXP, Color("c77dff"), Tk.PAPER][(k + i) % 6])
	var bob := 1.0 if (_t / 30) % 2 == 0 else 0.0
	var px := 3.0
	var o := c + Vector2(-9 * px, -26 * px + bob)
	var grid := [
		"....bbbbbb....",
		"..bbbbbbbbbb..",
		".bbbbbbbbbbbbq",
		".bboogbboogbbq",
		".bbowobbowobq.",
		".bbboobbooobb.",
		"..bbbbppbbbb..",
		"..bbbbppbbbb..",
		"...aaaaaaaa...",
		"..aaawwwwaaa..",
		".aaaawwwwaaaa.",
		".aaaawwwwaaaa.",
		"..aaawwwwaaa..",
	]
	var pal := { "b": Color("6b5a4a"), "o": Color("e8b64c"), "w": Color("efe3c2"), "p": Color("e89aa0"),
		"a": Color("2f5a4a"), "q": Color("f4f8fc"), "g": Color("1b1530") }
	for j in range(grid.size()):
		var row: String = grid[j]
		for i in range(row.length()):
			var ch := row[i]
			if pal.has(ch):
				draw_rect(Rect2(o + Vector2(i, j) * px, Vector2(px, px)), pal[ch])
	# 카운터
	draw_rect(Rect2(0, size.y - 14, size.x, 14), Color("6b3f2e"))
	draw_rect(Rect2(0, size.y - 14, size.x, 2), Color("a8624a"))
	UiKit.text(self, Vector2(size.x / 2.0, size.y - 3), "매점 주인 모루", Tk.PAPER, 11, true)
