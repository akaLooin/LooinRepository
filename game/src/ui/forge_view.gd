class_name ForgeView
extends Control
## 제본실 모루: 고른 장비가 모루 위에 떠 있다. play() 로 망치질 연출 후 결과(성공=금빛 / 실패=연기).

var item: Dictionary = {}
var result := ""
var busy := false
var _t := 0
var _anim := 0
var _anim_result := ""
var _done_cb: Callable
var _sparks: Array = []


func play(r: String, cb: Callable) -> void:
	busy = true
	_anim = 1
	_anim_result = r
	_done_cb = cb


func _process(_d: float) -> void:
	_t += 1
	if _anim > 0:
		_anim += 1
		if _anim in [12, 24, 36]:
			Sfx.play("hit", 0.1)
			for i in range(10):
				_sparks.append([size / 2.0 + Vector2(0, 10), Vector2(randf_range(-2.5, 2.5), randf_range(-3.5, -0.5)), 20])
		if _anim == 46:
			Sfx.play("fanfare" if _anim_result == "success" else "enemy_die", 0.0)
		if _anim >= 80:
			_anim = 0
			busy = false
			if _done_cb.is_valid():
				_done_cb.call()
	for sp in _sparks:
		sp[0] += sp[1]
		sp[1].y += 0.18
		sp[2] -= 1
	_sparks = _sparks.filter(func(sp): return sp[2] > 0)
	queue_redraw()


func _draw() -> void:
	var c := size / 2.0
	draw_rect(Rect2(Vector2.ZERO, size), Color("2a1f28"))
	# 화덕 불빛
	var glow := 0.25 + 0.1 * sin(_t * 0.1)
	draw_circle(Vector2(c.x, size.y), size.x * 0.45, Color("ff8a3c", glow * 0.4))
	# 모루
	draw_rect(Rect2(c.x - 34, c.y + 18, 68, 8), Color("9aa3ad"))
	draw_rect(Rect2(c.x - 34, c.y + 18, 68, 2), Color("c9d3dc"))
	draw_rect(Rect2(c.x - 20, c.y + 26, 40, 10), Color("6b7480"))
	draw_rect(Rect2(c.x - 28, c.y + 36, 56, 8), Color("4a5364"))
	# 장비 (떠 있음)
	if not item.is_empty():
		var bob := sin(_t * 0.08) * 2.0 if _anim == 0 else 0.0
		var tex := UiParts.item_icon(item["item"])
		if tex:
			draw_texture_rect(tex, Rect2(c.x - 16, c.y - 20 + bob, 32, 32), false)
		UiKit.text(self, Vector2(c.x + 22, c.y - 14), "+%d" % int(item["enh"]), Tk.GOLD, 12, false)
	# 망치
	var swing := 0.0
	if _anim > 0 and _anim < 40:
		var k := float(_anim % 12) / 12.0
		swing = sin(k * PI) * 1.2
	var hp := Vector2(c.x + 44, c.y - 22)
	draw_set_transform(hp, -0.9 + swing, Vector2.ONE)
	draw_rect(Rect2(-2, 0, 4, 30), Color("6b4f2a"))
	draw_rect(Rect2(-9, -6, 18, 10), Color("9aa3ad"))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	for sp in _sparks:
		draw_rect(Rect2(sp[0], Vector2(2, 2)), Color("ffd23f", float(sp[2]) / 20.0))
	# 결과 연출
	var show := _anim_result if _anim >= 46 else (result if _anim == 0 else "")
	if show == "success":
		for i in range(12):
			var a := TAU * i / 12.0 + _t * 0.02
			draw_line(c + Vector2(cos(a), sin(a)) * 18.0, c + Vector2(cos(a), sin(a)) * 40.0, Color(Tk.GOLD, 0.5), 2.0)
		UiKit.text(self, Vector2(c.x, 16), "성공!", Tk.GOLD, 16, true)
	elif show == "fail":
		for i in range(6):
			draw_circle(c + Vector2(-20 + i * 8, -10 - (i % 3) * 6), 6, Color(0.6, 0.6, 0.65, 0.35))
		UiKit.text(self, Vector2(c.x, 16), "실패…", Color("b4c0cf"), 16, true)
