class_name RankStamp
extends Control
## 결과 화면의 붉은 랭크 도장 (찍히는 애니메이션).

var rank := "-"
var _t := 0


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	var c := size / 2.0
	var k := clampf(_t / 12.0, 0.0, 1.0)
	var sc := lerpf(2.2, 1.0, k)
	var col := Color("b23a3a", k)
	draw_set_transform(c, -0.18, Vector2(sc, sc))
	draw_arc(Vector2.ZERO, 34, 0, TAU, 40, col, 3.0)
	draw_arc(Vector2.ZERO, 29, 0, TAU, 40, col, 1.0)
	var f := ThemeDB.fallback_font
	var w := f.get_string_size(rank, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x
	draw_set_transform(c + Vector2(-w * 1.5 * sc, 16 * sc), 0.0, Vector2(3 * sc, 3 * sc))
	draw_string(f, Vector2.ZERO, rank, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, col)
	draw_set_transform(Vector2.ZERO, 0, Vector2.ONE)
	if _t == 12:
		Sfx.play("hit", 0.0)
