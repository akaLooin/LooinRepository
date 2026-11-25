class_name Hud
extends Control
## 전투 HUD: HP/MP(3칸)/레벨, 콤보, 스테이지 제목, 보스 HP·경직 게이지, 배너, 필살기 컷인, 일시정지 버튼.

var run: Node
var fade := 0.0
var _title := ""
var _title_t := 0
var _banner := ""
var _banner_col := Tk.GOLD
var _banner_t := 0
var _cutin := ""
var _cutin_t := 0
var _cutin_max := 1
var _font: Font
var _pause_btn: Button


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_font = ThemeDB.fallback_font
	_pause_btn = UiKit.button("II", func(): run.set_paused(true))
	_pause_btn.focus_mode = Control.FOCUS_NONE
	_pause_btn.custom_minimum_size = Vector2(22, 18)
	_pause_btn.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	_pause_btn.position = Vector2(-26, 4)
	add_child(_pause_btn)


func show_title(t: String) -> void:
	_title = t
	_title_t = 150


func banner_text(t: String, c: Color, frames: int) -> void:
	_banner = t
	_banner_col = c
	_banner_t = frames


func cutin(name: String, frames: int) -> void:
	_cutin = name
	_cutin_t = frames
	_cutin_max = frames


func _process(_d: float) -> void:
	var vw := get_viewport_rect().size.x
	_pause_btn.position = Vector2(vw - 26, 4)
	if _title_t > 0:
		_title_t -= 1
	if _banner_t > 0:
		_banner_t -= 1
	if _cutin_t > 0:
		_cutin_t -= 1
	queue_redraw()


func _text(p: Vector2, s: String, c: Color, size: int = 11, center: bool = false) -> void:
	var x := p.x
	if center:
		x -= _font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x / 2.0
	for o in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1)]:
		draw_string(_font, Vector2(x, p.y) + o, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Tk.INK)
	draw_string(_font, Vector2(x, p.y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, c)


func _draw() -> void:
	if run == null or run.player == null:
		return
	var vw := get_viewport_rect().size.x
	var vh := get_viewport_rect().size.y
	var p: Player = run.player
	# 초상 박스 + 레벨
	draw_rect(Rect2(4, 4, 22, 22), Tk.INK_SOFT)
	draw_rect(Rect2(4, 4, 22, 22), Tk.PAPER_DIM, false, 1.0)
	draw_rect(Rect2(10, 9, 10, 9), Tk.P_SKIN)
	draw_rect(Rect2(9, 8, 12, 3), Tk.P_HAIR)
	draw_rect(Rect2(8, 18, 14, 6), Tk.P_COAT)
	_text(Vector2(6, 36), "Lv%d" % int(GameState.char_data()["lv"]), Tk.TEXT, 11)
	# HP
	draw_rect(Rect2(30, 6, 110, 8), Tk.HP_BACK)
	draw_rect(Rect2(30, 6, 110.0 * float(p.hp) / float(p.max_hp), 8), Tk.HP)
	draw_rect(Rect2(30, 6, 110, 8), Tk.INK, false, 1.0)
	_text(Vector2(144, 14), "%d" % p.hp, Tk.TEXT, 11)
	# MP 3칸
	for i in range(3):
		var r := Rect2(30 + i * 37, 17, 35, 6)
		draw_rect(r, Tk.MP_BACK)
		var fill := clampf(p.mp - i, 0.0, 1.0)
		var col := Tk.MP if fill >= 1.0 else Tk.MP.darkened(0.35)
		draw_rect(Rect2(r.position, Vector2(r.size.x * fill, r.size.y)), col)
		draw_rect(r, Tk.INK, false, 1.0)
	# 남은 시간/진행
	_text(Vector2(vw / 2.0, 14), "%s  %d:%02d" % [run.dungeon["book"], run.ticks / 3600, (run.ticks / 60) % 60], Tk.TEXT_DIM, 11, true)
	# 콤보
	if run.combo >= 2:
		_text(Vector2(vw - 70, 60), "%d" % run.combo, Tk.GOLD, 22)
		_text(Vector2(vw - 70, 72), "COMBO", Tk.TEXT, 11)
	# 보스 바
	var b: Boss = run.boss()
	if b != null:
		var bw := minf(260.0, vw - 120.0)
		var bx := (vw - bw) / 2.0
		_text(Vector2(vw / 2.0, 30), b.mon["name"], Tk.DANGER, 11, true)
		draw_rect(Rect2(bx, 34, bw, 7), Tk.HP_BACK)
		draw_rect(Rect2(bx, 34, bw * float(b.hp) / float(b.max_hp), 7), Tk.DANGER)
		draw_rect(Rect2(bx, 42, bw * b.stagger / b.stagger_max, 2), Tk.GOLD)
		draw_rect(Rect2(bx, 34, bw, 7), Tk.INK, false, 1.0)
	# 스테이지 제목
	if _title_t > 0:
		var a := clampf(_title_t / 30.0, 0.0, 1.0)
		draw_rect(Rect2(0, 70, vw, 24), Color(Tk.INK, 0.6 * a))
		_text(Vector2(vw / 2.0, 86), _title, Color(Tk.PAPER, a), 11, true)
	if _banner_t > 0:
		_text(Vector2(vw / 2.0, 112), _banner, _banner_col, 11, true)
	# 필살기 컷인: 페이지가 넘어가며 이름이 찍힌다
	if _cutin_t > 0:
		var k := 1.0 - float(_cutin_t) / float(_cutin_max)
		var pw := vw * minf(1.0, k * 3.0)
		draw_rect(Rect2(vw - pw, 96, pw, 60), Color(Tk.PAPER, 0.92))
		draw_rect(Rect2(vw - pw, 96, 3, 60), Tk.PAPER_DIM)
		if k > 0.3:
			draw_rect(Rect2(vw * 0.18, 106, 46, 40), Tk.P_COAT)
			draw_rect(Rect2(vw * 0.18 + 12, 110, 22, 18), Tk.P_SKIN)
			draw_rect(Rect2(vw * 0.18 + 10, 108, 26, 6), Tk.P_HAIR)
			_text(Vector2(vw * 0.55, 132), _cutin, Tk.RIBBON, 22, true)
	if not run.touch.visible and run.ticks < 600:
		_text(Vector2(vw / 2.0, vh - 8), "←→ 이동  ↓+X 아래로  Z 공격  X 점프  C 대시  A/S/D 필살기  Q 포션  Esc 일시정지", Color(Tk.TEXT_DIM, 0.8), 11, true)
	if fade > 0.0:
		draw_rect(Rect2(0, 0, vw, vh), Color(Tk.INK, fade))
