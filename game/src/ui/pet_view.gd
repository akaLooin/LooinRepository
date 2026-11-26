class_name PetView
extends Control
## 펫 전시대: 쿠션 위에서 꼬물거리는 펫을 크게 보여 준다.

var pet_id := ""
var _t := 0


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	var c := Vector2(size.x / 2.0, size.y - 26)
	draw_rect(Rect2(Vector2.ZERO, size), Color("2a2346"))
	draw_circle(Vector2(c.x, 20), 46, Color(Tk.GOLD, 0.06))
	# 쿠션
	draw_rect(Rect2(c.x - 50, c.y, 100, 14), Tk.RIBBON.darkened(0.2))
	draw_rect(Rect2(c.x - 50, c.y, 100, 3), Color("f07a86"))
	for k in [-50, 46]:
		draw_rect(Rect2(c.x + k, c.y + 12, 4, 6), Tk.GOLD)
	if pet_id == "":
		UiKit.text(self, Vector2(c.x, c.y - 20), "?", Tk.TEXT_DIM, 24, true)
		return
	# 책벌레 꼬물 (4배)
	var s := 4.0
	var wob := (_t / 10) % 2
	for i in range(4):
		var x := c.x + 12 - i * 5 * s
		var y := c.y - 6 * s + (wob * s if i % 2 == 1 else 0.0)
		draw_rect(Rect2(x - 2.5 * s, y, 5 * s, 5 * s), Color("b6e38a") if i == 0 else Color("9bd36b"))
		draw_rect(Rect2(x - 2.5 * s, y + 4 * s, 5 * s, s), Color("5b7d4a"))
	var hx := c.x + 12
	var hy := c.y - 6 * s
	draw_rect(Rect2(hx - 1 * s, hy + s, 2 * s, 2 * s), Tk.INK)
	draw_rect(Rect2(hx - 0.5 * s, hy + 1.2 * s, 0.7 * s, 0.7 * s), Tk.TEXT)
	draw_arc(Vector2(hx, hy + 2 * s), 1.6 * s, 0, TAU, 12, Tk.GOLD, 1.0)
	draw_rect(Rect2(hx - 12 * s, hy - 3 * s, 3 * s, 4 * s), Tk.PAPER)
	draw_rect(Rect2(hx - 11.5 * s, hy - 2 * s, 2 * s, 0.6 * s), Tk.PAPER_DIM)
