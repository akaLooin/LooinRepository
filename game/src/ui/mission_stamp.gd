class_name MissionStamp
extends Control
## 미션 체크 칸: 진행 중 = 빈 칸, 완료 = 반짝이는 별, 받음 = 붉은 도장

var state := "open"
var _t := 0


func _process(_d: float) -> void:
	_t += 1
	if state == "done":
		queue_redraw()


func _draw() -> void:
	var r := Rect2(Vector2(2, 2), size - Vector2(4, 4))
	draw_rect(r, Color("5a4a3a"), false, 1.5)
	var c := size / 2.0
	match state:
		"done":
			var k := 0.7 + 0.3 * sin(_t * 0.2)
			draw_circle(c, 7 * k, Color(Tk.GOLD, 0.8))
			draw_circle(c, 4, Color("fff1b8"))
		"claimed":
			draw_arc(c, 9, 0, TAU, 20, Color("b23a3a"), 2.0)
			draw_line(c + Vector2(-5, 0), c + Vector2(-1, 4), Color("b23a3a"), 2.0)
			draw_line(c + Vector2(-1, 4), c + Vector2(6, -5), Color("b23a3a"), 2.0)
