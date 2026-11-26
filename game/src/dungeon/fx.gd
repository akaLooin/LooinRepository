class_name Fx
extends Node2D
## 짧게 살다 사라지는 연출: 데미지 숫자, 타격 파편(잉크/활자), 먼지, 베기 궤적.

var kind := "spark"
var life := 20
var max_life := 20
var vel := Vector2.ZERO
var text := ""
var color := Color.WHITE
var size := 2.0
var rect := Rect2()
var font: Font
var font_size := 11


func tick() -> bool:
	life -= 1
	position += vel
	if kind == "number":
		vel.y *= 0.9
	elif kind == "spark":
		vel.y += 0.15
	queue_redraw()
	return life <= 0


func _draw() -> void:
	var a := clampf(float(life) / float(max_life) * 1.6, 0.0, 1.0)
	match kind:
		"number":
			var w := font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size).x
			var p := Vector2(-w / 2.0, 0)
			for o in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1)]:
				draw_string(font, p + o, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color(Tk.INK, a))
			draw_string(font, p, text, HORIZONTAL_ALIGNMENT_LEFT, -1, font_size, Color(color, a))
		"spark", "dust":
			draw_rect(Rect2(-size / 2.0, -size / 2.0, size, size), Color(color, a))
		"slash":
			draw_rect(rect, Color(color, a * 0.55))
			draw_rect(Rect2(rect.position.x, rect.position.y + rect.size.y / 2.0 - 1, rect.size.x, 2), Color(Tk.TEXT, a))
		"bigslash":
			var k := float(life) / float(max_life)
			var w := 340.0 * (1.0 - k * 0.3)
			draw_rect(Rect2(-w / 2.0, -6 * k - 2, w, 12 * k + 4), Color(color, a * 0.9))
			draw_rect(Rect2(-w / 2.0, -1, w, 2), Color(Tk.GOLD, a))
			draw_rect(Rect2(-w / 2.0 - 10, -18 * k, w + 20, 36 * k), Color(color, a * 0.2))
		"blade":
			draw_rect(Rect2(-1, -12, 2, 12), Color(color, 0.95))
			draw_rect(Rect2(-1, -24, 2, 12), Color(color, 0.35))
		"ring":
			var r := (1.0 - float(life) / float(max_life)) * size
			draw_arc(Vector2.ZERO, r, 0, TAU, 32, Color(color, a), 2.0)
