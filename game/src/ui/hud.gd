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
	_pause_btn = UiKit.button("II", func(): run.set_paused(true), true)
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


func _text(p: Vector2, s: String, c: Color, size: int = 11, center: bool = false, outline: bool = true) -> void:
	UiKit.text(self, p, s, c, size, center, Tk.INK if outline else Color(0, 0, 0, 0))


func _draw() -> void:
	if run == null or run.player == null:
		return
	var vw := get_viewport_rect().size.x
	var vh := get_viewport_rect().size.y
	var p: Player = run.player
	# 장서표 초상
	draw_rect(Rect2(4, 4, 30, 30), Tk.INK)
	draw_rect(Rect2(5, 5, 28, 28), Tk.GOLD.darkened(0.25))
	draw_rect(Rect2(6, 6, 26, 26), Color("3f2b4f"))
	for c in [Vector2(5, 5), Vector2(30, 5), Vector2(5, 30), Vector2(30, 30)]:
		draw_rect(Rect2(c, Vector2(3, 3)), Color("fff1b8"))
	draw_rect(Rect2(13, 10, 12, 10), Tk.P_SKIN)
	draw_rect(Rect2(12, 9, 14, 4), Tk.P_HAIR)
	draw_rect(Rect2(10, 21, 18, 9), Tk.P_COAT)
	draw_rect(Rect2(13, 21, 12, 2), Tk.P_SCARF)
	_text(Vector2(7, 44), "Lv%d" % int(GameState.char_data()["lv"]), Color("fff1b8"), 11)
	# HP: 붉은 잉크가 든 유리관
	var hw := 120.0
	var hp_r := float(p.hp) / float(p.max_hp)
	draw_rect(Rect2(38, 6, hw + 2, 10), Tk.INK)
	draw_rect(Rect2(39, 7, hw, 8), Tk.HP_BACK)
	draw_rect(Rect2(39, 7, hw * hp_r, 8), Tk.HP)
	draw_rect(Rect2(39, 7, hw * hp_r, 2), Color("ff8a76"))
	draw_rect(Rect2(39, 13, hw * hp_r, 2), Color("b23a3a"))
	draw_rect(Rect2(37, 5, 3, 12), Tk.GOLD)
	draw_rect(Rect2(38 + hw, 5, 3, 12), Tk.GOLD)
	_text(Vector2(44 + hw, 15), "%d" % p.hp, Tk.TEXT, 11)
	# MP: 책갈피 리본 3개
	for i in range(3):
		var bx := 38.0 + i * 21.0
		var fill := clampf(p.mp - i, 0.0, 1.0)
		draw_rect(Rect2(bx, 19, 18, 13), Tk.INK)
		draw_rect(Rect2(bx + 1, 20, 16, 11), Tk.MP_BACK)
		var fh := 11.0 * fill
		var col := Tk.MP if fill >= 1.0 else Tk.MP.darkened(0.35)
		draw_rect(Rect2(bx + 1, 31 - fh, 16, fh), col)
		if fill >= 1.0:
			draw_rect(Rect2(bx + 1, 20, 16, 2), Color("a9dcff"))
		draw_colored_polygon(PackedVector2Array([Vector2(bx + 5, 32), Vector2(bx + 9, 28), Vector2(bx + 13, 32)]), Tk.INK)
	if p.charge_mode and p.charge_level() > 0:
		_text(Vector2(104, 30), "충전 %d" % p.charge_level(), Tk.MP, 11)
	# 상단 중앙: 장 두루마리 + 페이지 진행 점
	var title := "%s%s" % [run.dungeon["name"].split(" — ")[0], " · 어려움" if run.difficulty == "hard" else ""]
	var tw := ThemeDB.fallback_font.get_string_size(title, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x + 24.0
	var tx := vw / 2.0 - tw / 2.0
	draw_rect(Rect2(tx - 5, 6, 5, 11), Tk.PAPER_DIM)
	draw_rect(Rect2(tx + tw, 6, 5, 11), Tk.PAPER_DIM)
	draw_rect(Rect2(tx, 4, tw, 15), Tk.INK)
	draw_rect(Rect2(tx + 1, 5, tw - 2, 13), Tk.PAPER)
	draw_rect(Rect2(tx + 1, 16, tw - 2, 2), Tk.PAPER_DIM)
	_text(Vector2(vw / 2.0, 15), title, Color("3b2a22"), 11, true, false)
	var n: int = run.total_pages
	for i in range(n):
		var px := vw / 2.0 - n * 6.0 + i * 12.0
		var done: bool = i < run.stage_path.size() - 1
		var cur: bool = i == run.stage_path.size() - 1
		var col := Tk.GOLD if done else (Tk.RIBBON if cur else Color("6b5a7a"))
		draw_rect(Rect2(px, 22, 8, 10), Tk.INK)
		draw_rect(Rect2(px + 1, 23, 6, 8), col)
		if i == n - 1:
			draw_rect(Rect2(px + 2, 25, 4, 4), Tk.INK)
	_text(Vector2(vw / 2.0, 44), "%d:%02d" % [run.ticks / 3600, (run.ticks / 60) % 60], Color("fff1b8"), 11, true)
	# 골드
	var gi := UiKit.icon("gold")
	if gi:
		draw_texture(gi, Vector2(vw - 88, 6))
	_text(Vector2(vw - 70, 18), str(int(GameState.data["account"]["gold"]) + int(run.gold_gain)), Color("fff1b8"), 11)
	# 콤보: 3배 확대 숫자
	if run.combo >= 2:
		var cs := str(run.combo)
		var f := ThemeDB.fallback_font
		var cw := f.get_string_size(cs, HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x * 3.0
		var cx := vw - 64.0 - cw
		draw_set_transform(Vector2(cx, 52), 0.0, Vector2(3, 3))
		for o in [Vector2(-0.34, 0), Vector2(0.34, 0), Vector2(0, -0.34), Vector2(0, 0.34)]:
			draw_string(f, Vector2(0, 11) + o, cs, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Tk.INK)
		draw_string(f, Vector2(0, 11), cs, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Tk.CRIT)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
		_text(Vector2(vw - 60, 84), "HIT", Tk.TEXT, 11)
		var bar := clampf(float(run.combo_timer) / float(run.COMBO_TIMEOUT), 0.0, 1.0)
		draw_rect(Rect2(cx, 90, 60, 3), Tk.INK)
		draw_rect(Rect2(cx + 1, 91, 58 * bar, 1), Tk.CRIT)
	# 보스 바
	var b: Boss = run.boss()
	if b != null:
		var bw := minf(260.0, vw - 160.0)
		var bx := (vw - bw) / 2.0
		_text(Vector2(vw / 2.0, 58), b.mon["name"], Tk.DANGER, 11, true)
		draw_rect(Rect2(bx - 2, 61, bw + 4, 11), Tk.INK)
		draw_rect(Rect2(bx - 1, 62, bw + 2, 9), Tk.GOLD.darkened(0.4))
		draw_rect(Rect2(bx, 63, bw, 7), Tk.HP_BACK)
		draw_rect(Rect2(bx, 63, bw * float(b.hp) / float(b.max_hp), 7), Tk.DANGER)
		draw_rect(Rect2(bx, 63, bw * float(b.hp) / float(b.max_hp), 2), Color("ff8a76"))
		draw_rect(Rect2(bx, 72, bw * b.stagger / b.stagger_max, 2), Tk.GOLD)
	# 스테이지 제목: 종이 띠가 펼쳐진다
	if _title_t > 0:
		var a := clampf(_title_t / 30.0, 0.0, 1.0)
		var k := clampf((150 - _title_t) / 12.0, 0.0, 1.0)
		var w := (vw * 0.6) * k
		draw_rect(Rect2(vw / 2.0 - w / 2.0, 100, w, 22), Color(Tk.INK, 0.8 * a))
		draw_rect(Rect2(vw / 2.0 - w / 2.0 + 1, 101, w - 2, 20), Color(Tk.PAPER, a))
		if k >= 1.0:
			_text(Vector2(vw / 2.0, 115), _title, Color(Color("3b2a22"), a), 11, true, false)
	if _banner_t > 0:
		_text(Vector2(vw / 2.0, 140), _banner, _banner_col, 11, true)
	# 필살기 컷인
	if _cutin_t > 0:
		var kk := 1.0 - float(_cutin_t) / float(_cutin_max)
		var pw := vw * minf(1.0, kk * 3.0)
		draw_rect(Rect2(vw - pw, 96, pw, 60), Color(Tk.PAPER, 0.92))
		draw_rect(Rect2(vw - pw, 96, 3, 60), Tk.PAPER_DIM)
		if kk > 0.3:
			draw_rect(Rect2(vw * 0.18, 106, 46, 40), Tk.P_COAT)
			draw_rect(Rect2(vw * 0.18 + 12, 110, 22, 18), Tk.P_SKIN)
			draw_rect(Rect2(vw * 0.18 + 10, 108, 26, 6), Tk.P_HAIR)
			_text(Vector2(vw * 0.55, 132), _cutin, Tk.RIBBON, 22, true)
	if not run.touch.visible and run.ticks < 600:
		_text(Vector2(vw / 2.0, vh - 8), "←→ 이동  ↓+X 아래로  Z 공격  X 점프  C 대시  A/S/D 필살기  Q 포션  Esc 일시정지", Color(Tk.TEXT_DIM, 0.8), 11, true)
	if fade > 0.0:
		draw_rect(Rect2(0, 0, vw, vh), Color(Tk.INK, fade))
