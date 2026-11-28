class_name TitleScreen
extends Control
## S01 시작 화면: 원근감 있는 도서관 회랑 + 공중에 떠서 펄럭이는 거대한 책 + 픽셀 로고.
## 아무 곳이나 누르면 메뉴(이어하기 / 처음부터 / 옵션)가 나타난다.

var router: Node
var _t := 0
var _menu: VBoxContainer
var _opened := false
var _dust: Array = []


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	for i in range(40):
		_dust.append(Vector3(randf() * 600.0, randf() * 270.0, 0.2 + randf() * 0.6))


func _ready() -> void:
	_menu = VBoxContainer.new()
	_menu.add_theme_constant_override("separation", 4)
	_menu.custom_minimum_size = Vector2(150, 0)
	_menu.visible = false
	add_child(_menu)
	var started: bool = not (GameState.data["progress"].get("seen", {}) as Dictionary).is_empty()
	if started:
		_menu.add_child(UiKit.button("이어서 읽기", func(): router.go("select"), true))
		_menu.add_child(UiKit.button("처음부터 읽기", _confirm_new))
	else:
		_menu.add_child(UiKit.button("책을 펼친다", func(): router.go("select"), true))
	_menu.add_child(UiKit.button("옵션", func(): router.go("options")))


func _confirm_new() -> void:
	for c in _menu.get_children():
		c.queue_free()
	_menu.add_child(UiKit.label("진행 상황이 모두 지워져요.", Tk.GOLD, 11, true))
	_menu.add_child(UiKit.button("정말 처음부터", func():
		GameState.reset_save()
		router.go("select"), true))
	_menu.add_child(UiKit.button("취소", func(): router.go("title")))


func _gui_input(event: InputEvent) -> void:
	if _opened:
		return
	if (event is InputEventMouseButton and event.pressed) or (event is InputEventScreenTouch and event.pressed):
		_open()
		accept_event()


func _process(_d: float) -> void:
	_t += 1
	if not _opened and (Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("jump") or Input.is_action_just_pressed("pause")):
		_open()
	var sz := get_viewport_rect().size
	_menu.position = Vector2(sz.x / 2.0 - 75.0, sz.y - 30.0 - _menu.size.y)
	queue_redraw()


func _open() -> void:
	if _opened:
		return
	_opened = true
	Sfx.play("page", 0.0)
	_menu.visible = true
	var first := _menu.get_child(0)
	if first is Button:
		(first as Button).grab_focus.call_deferred()


func _draw() -> void:
	var sz := get_viewport_rect().size
	var cx := sz.x / 2.0
	# 회랑 배경: 위로 갈수록 어두운 남보라
	for i in range(8):
		draw_rect(Rect2(0, i * sz.y / 8.0, sz.x, sz.y / 8.0 + 1), Tk.INK.lerp(Color("3a2a52"), i / 8.0))
	# 원근 서가: 양쪽 벽에서 소실점(cx, 110)으로 모이는 책장 줄
	var vp := Vector2(cx, 110)
	for side in [-1, 1]:
		for row in range(6):
			var y0 := 20.0 + row * 34.0
			var x_far: float = cx + side * 70.0
			var x_near: float = cx + side * (sz.x / 2.0 + 10.0)
			var steps := 14
			for k in range(steps):
				var f0 := float(k) / steps
				var f1 := float(k + 1) / steps
				var xa: float = lerpf(x_near, x_far, f0)
				var xb: float = lerpf(x_near, x_far, f1)
				var ya := lerpf(y0, vp.y + (y0 - vp.y) * 0.35, f0)
				var hgt := lerpf(26.0, 9.0, f0)
				var col := [Tk.LEATHER, Color("3f5f8a"), Color("5b7d4a"), Color("8a5a9c"), Tk.B_SPINE][(k + row * 3) % 5] as Color
				col = col.darkened(0.35 + f0 * 0.45)
				var x0 := minf(xa, xb)
				draw_rect(Rect2(x0, ya, absf(xb - xa) - 1.0, hgt), col)
			# 선반 판
			draw_line(Vector2(x_near, y0 + 27), Vector2(x_far, vp.y + (y0 + 27 - vp.y) * 0.35), Tk.LEATHER.darkened(0.6), 2.0)
	# 바닥: 체크무늬 원근
	for i in range(10):
		var y := 200.0 + i * 8.0
		draw_rect(Rect2(0, y, sz.x, 8), Color("2a1f38") if i % 2 == 0 else Color("33264a"))
	# 빛줄기
	for k in range(5):
		var a := 0.05 + 0.03 * sin(_t * 0.02 + k)
		var x := cx - 60.0 + k * 30.0
		draw_colored_polygon(PackedVector2Array([Vector2(x, 0), Vector2(x + 10, 0), Vector2(x + 40, sz.y), Vector2(x + 10, sz.y)]), Color(Tk.GOLD, a))
	# 떠 있는 거대한 책
	var by := 150.0 + sin(_t * 0.04) * 4.0
	var pw := 70.0
	draw_rect(Rect2(cx - pw - 6, by + 2, pw * 2 + 12, 8), Color(Tk.INK, 0.6))           # 그림자
	draw_rect(Rect2(cx - pw - 4, by - 30, pw * 2 + 8, 34), Tk.LEATHER)                 # 표지
	draw_rect(Rect2(cx - pw - 4, by - 30, pw * 2 + 8, 2), Tk.GOLD)
	for side in [-1, 1]:
		for k in range(4):
			var bend := 4.0 + k * 2.0
			var xx: float = cx + (0.0 if side > 0 else -pw)
			draw_rect(Rect2(xx, by - 34 - bend + k * 2.0, pw, 32), Tk.PAPER.darkened(0.04 * k))
		for line in range(5):
			var lx: float = cx + (8.0 if side > 0 else -pw + 6.0)
			draw_rect(Rect2(lx, by - 34 + line * 5.0, pw - 16.0 - (line * 7) % 13, 1), Tk.PAPER_DIM)
	draw_rect(Rect2(cx - 1, by - 40, 2, 38), Tk.LEATHER.darkened(0.3))
	# 넘어가는 페이지 (애니메이션)
	var flip := fmod(_t * 0.025, 1.0)
	var fx := cx + cos(flip * PI) * pw
	draw_colored_polygon(PackedVector2Array([Vector2(cx, by - 42), Vector2(fx, by - 46 - sin(flip * PI) * 14.0), Vector2(fx, by - 14 - sin(flip * PI) * 14.0), Vector2(cx, by - 10)]), Tk.PAPER)
	# 책에서 피어오르는 금빛 글자 먼지
	for i in range(_dust.size()):
		var d: Vector3 = _dust[i]
		var y := fmod(d.y - _t * d.z, 270.0)
		if y < 0:
			y += 270.0
		var x := fmod(d.x + sin(_t * 0.02 + i) * 6.0, sz.x)
		draw_rect(Rect2(x, y, 1, 1), Color(Tk.GOLD, 0.4 + d.z * 0.6))
	# 로고: 11px 폰트를 3배 정수 확대 → 선명한 픽셀 로고
	var title := "테일즈토피아"
	var ty := 22.0 + sin(_t * 0.03) * 1.5
	UiKit.pixel_text(self, Vector2(cx + 1, ty + 33 + 1), title, Tk.INK, 33, true, Tk.INK, 1.5)
	UiKit.pixel_text(self, Vector2(cx, ty + 33), title, Tk.GOLD, 33, true, Tk.INK, 1.5)
	# RPG 리본
	var rw := 56.0
	var ry := ty + 40.0
	draw_rect(Rect2(cx - rw / 2.0 - 8, ry + 2, 8, 12), Tk.RIBBON.darkened(0.3))
	draw_rect(Rect2(cx + rw / 2.0, ry + 2, 8, 12), Tk.RIBBON.darkened(0.3))
	draw_rect(Rect2(cx - rw / 2.0, ry, rw, 14), Tk.RIBBON)
	draw_rect(Rect2(cx - rw / 2.0, ry, rw, 2), Color("f07a86"))
	UiKit.text(self, Vector2(cx, ry + 11), "R P G", Tk.PAPER, 11, true)
	UiKit.text(self, Vector2(cx, ry + 28), "— 차원의 도서관 —", Tk.PAPER_DIM, 11, true)
	if not _opened and (_t / 30) % 2 == 0:
		UiKit.text(self, Vector2(cx, sz.y - 16), "화면을 눌러 책을 펼치세요", Tk.PAPER, 11, true)
	UiKit.text(self, Vector2(sz.x - 4 - 60, sz.y - 4), "데모 v0.11", Tk.TEXT_DIM, 11, false)
