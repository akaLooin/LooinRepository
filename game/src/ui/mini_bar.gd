class_name MiniBar
extends Control
## 작은 진행 막대

var ratio := 0.0
var col := Tk.GOLD


func _draw() -> void:
	draw_rect(Rect2(Vector2.ZERO, size), Tk.INK)
	draw_rect(Rect2(Vector2(1, 1), size - Vector2(2, 2)), Color("2a2346"))
	draw_rect(Rect2(Vector2(1, 1), Vector2((size.x - 2) * ratio, size.y - 2)), col)
	if ratio > 0:
		draw_rect(Rect2(Vector2(1, 1), Vector2((size.x - 2) * ratio, 1)), col.lightened(0.35))
