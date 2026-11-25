class_name TownScreen
extends Control
## S03 열람실(마을): 방 안의 사물을 눌러 이동하는 허브.
## 서가 → 책 지도 / 사서장 책상 → 미션 / 제본대 → 강화 / 매점 → 상점 / 바구니 → 펫.
## 위: 장서표(캐릭터) + 재화, 아래: 아이콘 메뉴바 + '책 펼치기'.

var router: Node
var _t := 0
var _spots: Array = []   # [rect, label, target]


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)


func _ready() -> void:
	var sz := get_viewport_rect().size
	_build_spots(sz)
	_build_topbar()
	_build_bottombar(sz)
	var dlg := DialogBox.show_once(self, "intro")
	if dlg == null:
		for did in DataDB.tables["dungeons"]:
			var dd: Dictionary = DataDB.tables["dungeons"][did]
			if GameState.data["progress"]["cleared"].has(did + ":normal") and dd.has("dialogs"):
				if DialogBox.show_once(self, dd["dialogs"]["after_first_clear"]) != null:
					return
		_attendance()


## 출석 보상: 하루에 한 번, 7일째마다 부활 책갈피 추가.
func _attendance() -> void:
	var at: Dictionary = GameState.data["progress"]["attend"]
	var today := Time.get_date_string_from_system()
	if at["last"] == today:
		return
	at["last"] = today
	at["count"] = int(at["count"]) + 1
	var acc: Dictionary = GameState.data["account"]
	var bonus := int(at["count"]) % 7 == 0
	acc["gold"] = int(acc["gold"]) + 100
	acc["pages"] = int(acc["pages"]) + 1
	if bonus:
		acc["revives"] = int(acc["revives"]) + 1
	GameState.save_game()
	Sfx.play("coin", 0.0)
	var p := UiKit.paper_panel()
	p.position = Vector2(get_viewport_rect().size.x / 2.0 - 100, 60)
	p.custom_minimum_size = Vector2(200, 0)
	add_child(p)
	var v := VBoxContainer.new()
	p.add_child(v)
	v.add_child(UiKit.label("출석 %d일째!" % int(at["count"]), Tk.LEATHER))
	v.add_child(UiKit.label("골드 100 · 페이지 조각 1%s" % (" · 부활 책갈피 1" if bonus else ""), Tk.INK))
	v.add_child(UiKit.label("7일째마다 부활 책갈피를 더 받아요.", Color("5a4a3a")))
	var ok := UiKit.button("받았어요", func(): router.go("town"), true)
	v.add_child(ok)
	ok.grab_focus.call_deferred()


func _build_spots(sz: Vector2) -> void:
	var cx := sz.x / 2.0
	_spots = [
		[Rect2(14, 64, 92, 120), "서가 · 책 지도", "map"],
		[Rect2(cx - 50, 116, 100, 60), "사서장 · 미션", "missions"],
		[Rect2(sz.x - 196, 118, 80, 60), "제본대 · 강화", "enhance"],
		[Rect2(sz.x - 106, 104, 92, 74), "매점", "shop"],
		[Rect2(112, 160, 56, 30), "바구니 · 펫", "pets"],
	]
	for sp in _spots:
		var b := Button.new()
		b.flat = true
		b.position = (sp[0] as Rect2).position
		b.size = (sp[0] as Rect2).size
		b.focus_mode = Control.FOCUS_ALL
		b.add_theme_stylebox_override("focus", UiKit.tbox("btn_focus", 4, 2, Color(0, 0, 0, 0), Tk.GOLD))
		b.add_theme_stylebox_override("hover", UiKit.box(Color(Tk.GOLD, 0.12), Color(Tk.GOLD, 0.5), 0))
		var target: String = sp[2]
		b.pressed.connect(func(): Sfx.play("click", 0.0))
		b.pressed.connect(func(): router.go(target))
		add_child(b)


func _build_topbar() -> void:
	var cd := GameState.char_data()
	var cls: Dictionary = DataDB.get_row("classes", GameState.current_class)
	var acc: Dictionary = GameState.data["account"]
	var top := HBoxContainer.new()
	top.position = Vector2(40, 4)
	top.add_theme_constant_override("separation", 6)
	add_child(top)
	var name_col := VBoxContainer.new()
	name_col.add_theme_constant_override("separation", 0)
	top.add_child(name_col)
	name_col.add_child(UiKit.label("%s  Lv%d" % [cls["name"], cd["lv"]], Tk.PAPER, 11, true))
	var sp := Meta.sp_left(GameState.current_class)
	name_col.add_child(UiKit.label("EXP %d/%d%s" % [cd["exp"], GameState.exp_to_next(int(cd["lv"])), ("  · SP %d" % sp) if sp > 0 else ""], Tk.GOLD if sp > 0 else Tk.PAPER_DIM, 11, true))
	var cur := HBoxContainer.new()
	cur.add_theme_constant_override("separation", 6)
	cur.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	cur.position = Vector2(get_viewport_rect().size.x - 196, 6)
	add_child(cur)
	cur.add_child(UiKit.currency("gold", int(acc["gold"])))
	cur.add_child(UiKit.currency("page", int(acc["pages"])))
	cur.add_child(UiKit.currency("potion", int(acc["potions"])))
	cur.add_child(UiKit.currency("revive", int(acc["revives"])))


func _build_bottombar(sz: Vector2) -> void:
	var bar := HBoxContainer.new()
	bar.add_theme_constant_override("separation", 0)
	bar.position = Vector2(6, sz.y - 36)
	add_child(bar)
	var mcount := Meta.claimable_count()
	for e in [["char", "캐릭터", "equip"], ["skill", "스킬", "skills"], ["enhance", "강화", "enhance"], ["shop", "상점", "shop"],
			["pet", "펫", "pets"], ["mission", "미션", "missions"], ["star", "인물", "select"], ["options", "옵션", "options"]]:
		var target: String = e[2]
		var badge := mcount if target == "missions" else (Meta.sp_left(GameState.current_class) if target == "skills" else 0)
		bar.add_child(UiKit.icon_button(e[0], e[1], func(): router.go(target), badge))
	var go := UiKit.button("책 펼치기", func(): router.go("map"), true, "map")
	go.custom_minimum_size = Vector2(92, 26)
	go.position = Vector2(sz.x - 98, sz.y - 32)
	add_child(go)
	go.grab_focus.call_deferred()


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	var sz := get_viewport_rect().size
	var cx := sz.x / 2.0
	# 뒷벽: 책장
	UiKit.draw_shelves(self, Vector2(sz.x, 150), _t)
	# 아치형 창문 + 둥근 종이 달
	var wx := cx - 34.0
	draw_rect(Rect2(wx - 3, 26, 74, 70), Tk.LEATHER.darkened(0.5))
	draw_rect(Rect2(wx, 30, 68, 66), Color("1d2a4a"))
	draw_circle(Vector2(wx + 44, 52), 11, Color("fff3d6"))
	for i in range(3):
		draw_rect(Rect2(wx + 37, 47 + i * 4, 14 - i * 3, 1), Color("e2cfa8"))
	draw_rect(Rect2(wx + 33, 30, 2, 66), Tk.LEATHER.darkened(0.5))
	draw_rect(Rect2(wx, 62, 68, 2), Tk.LEATHER.darkened(0.5))
	# 바닥: 나무 마루
	for i in range(8):
		var y := 150.0 + i * 10.0
		draw_rect(Rect2(0, y, sz.x, 10), Color("5a3a2a") if i % 2 == 0 else Color("4e3224"))
		for x in range((i * 23) % 40, int(sz.x), 40):
			draw_rect(Rect2(x, y, 1, 10), Color("3e271c"))
	draw_rect(Rect2(0, 150, sz.x, 2), Color("2e1f17"))
	# 걸린 등불
	for lx in [cx - 110.0, cx + 110.0]:
		var sw := sin(_t * 0.03 + lx) * 1.5
		draw_line(Vector2(lx, 0), Vector2(lx + sw, 20), Tk.INK, 1.0)
		draw_rect(Rect2(lx + sw - 4, 20, 9, 11), Tk.LEATHER)
		draw_rect(Rect2(lx + sw - 3, 22, 7, 7), Color(Tk.GOLD, 0.8 + 0.2 * sin(_t * 0.1)))
		draw_circle(Vector2(lx + sw, 25), 16, Color(Tk.GOLD, 0.06))
	# 서가 (던전 입구): 빛나는 큰 책장
	var s0: Rect2 = _spots[0][0]
	draw_rect(s0.grow(2), Tk.LEATHER.darkened(0.4))
	draw_rect(s0, Tk.LEATHER.darkened(0.15))
	for r in range(4):
		for k in range(9):
			var col := [Tk.RIBBON, Color("3f5f8a"), Color("5b7d4a"), Tk.GOLD, Color("8a5a9c")][(k + r) % 5] as Color
			draw_rect(Rect2(s0.position.x + 4 + k * 9.6, s0.position.y + 6 + r * 29, 8, 24), col.darkened(0.2))
		draw_rect(Rect2(s0.position.x, s0.position.y + 30 + r * 29, s0.size.x, 3), Tk.LEATHER.darkened(0.5))
	var glow := 0.15 + 0.1 * sin(_t * 0.06)
	draw_rect(s0.grow(4), Color(Tk.GOLD, glow), false, 2.0)
	# 사서장의 책상 + 사서장(오리지널 임시 NPC: 올림머리·반달 안경·짙은 녹색 숄)
	var s1: Rect2 = _spots[1][0]
	var dx := s1.position.x
	var dy := s1.position.y
	draw_rect(Rect2(dx + 30, dy + 6, 12, 10), Color("5a4a3a"))          # 머리 올림
	draw_rect(Rect2(dx + 32, dy + 14, 10, 9), Tk.P_SKIN)
	draw_rect(Rect2(dx + 33, dy + 17, 8, 2), Color("c9d3dc"))
	draw_rect(Rect2(dx + 27, dy + 22, 20, 12), Color("2f5a4a"))
	draw_rect(Rect2(dx, dy + 30, s1.size.x, 30), Tk.LEATHER)
	draw_rect(Rect2(dx, dy + 30, s1.size.x, 3), Color("a8624a"))
	draw_rect(Rect2(dx + 56, dy + 22, 18, 9), Tk.PAPER)                 # 책상 위 장부
	draw_rect(Rect2(dx + 64, dy + 22, 1, 9), Tk.PAPER_DIM)
	draw_rect(Rect2(dx + 78, dy + 18, 6, 12), Color("e8b64c"))           # 촛대
	draw_rect(Rect2(dx + 80, dy + 14 - (_t / 8) % 2, 2, 4), Color("ffd23f"))
	if Meta.claimable_count() > 0:
		UiKit.text(self, Vector2(dx + 37, dy + 4 + sin(_t * 0.15) * 2.0), "!", Tk.GOLD, 11, true)
	# 제본대 (모루·압착기)
	var s2: Rect2 = _spots[2][0]
	draw_rect(Rect2(s2.position.x, s2.position.y + 30, s2.size.x, 30), Color("4a3326"))
	draw_rect(Rect2(s2.position.x + 10, s2.position.y + 14, 30, 16), Color("6b7480"))
	draw_rect(Rect2(s2.position.x + 6, s2.position.y + 12, 38, 4), Color("9aa3ad"))
	draw_rect(Rect2(s2.position.x + 52, s2.position.y + 4, 4, 26), Color("6b4f2a"))
	draw_rect(Rect2(s2.position.x + 46, s2.position.y, 16, 6), Color("9aa3ad"))
	# 매점 카운터
	var s3: Rect2 = _spots[3][0]
	draw_rect(Rect2(s3.position.x, s3.position.y + 40, s3.size.x, 34), Color("6b3f2e"))
	draw_rect(Rect2(s3.position.x, s3.position.y + 40, s3.size.x, 3), Color("a8624a"))
	draw_rect(Rect2(s3.position.x + 6, s3.position.y, s3.size.x - 12, 40), Color("3a2a22"))
	for k in range(4):
		var col := [Tk.HP, Tk.MP, Tk.GOLD, Tk.EXP][k] as Color
		draw_rect(Rect2(s3.position.x + 12 + k * 18, s3.position.y + 8, 8, 10), col)
		draw_rect(Rect2(s3.position.x + 12 + k * 18, s3.position.y + 24, 8, 10), col.darkened(0.3))
	# 펫 바구니 + 꼬물
	var s4: Rect2 = _spots[4][0]
	draw_rect(Rect2(s4.position.x + 6, s4.position.y + 14, 44, 14), Color("b48f55"))
	for x in range(int(s4.position.x) + 8, int(s4.position.x) + 48, 4):
		draw_rect(Rect2(x, s4.position.y + 16, 2, 10), Color("8a6a3a"))
	if GameState.data["account"]["pets"].size() > 0:
		var wob := (_t / 10) % 2
		for i in range(3):
			draw_rect(Rect2(s4.position.x + 18 + i * 5, s4.position.y + 8 + (wob if i == 1 else 0), 5, 5), Color("9bd36b"))
		draw_rect(Rect2(s4.position.x + 29, s4.position.y + 8, 2, 2), Tk.INK)
	# 플레이어(임시 캐릭터) 서 있는 모습
	var px := cx + 74.0
	var py := 196.0
	draw_rect(Rect2(px - 10, py, 20, 2), Color(Tk.INK, 0.4))
	draw_rect(Rect2(px - 4, py - 6, 3, 6), Tk.P_COAT_DARK)
	draw_rect(Rect2(px + 1, py - 6, 3, 6), Tk.P_COAT_DARK)
	draw_rect(Rect2(px - 6, py - 19, 12, 13), Tk.P_COAT)
	draw_rect(Rect2(px - 5, py - 20, 10, 3), Tk.P_SCARF)
	draw_rect(Rect2(px - 4, py - 27, 8, 7), Tk.P_SKIN)
	draw_rect(Rect2(px - 5, py - 28, 10, 3), Tk.P_HAIR)
	draw_rect(Rect2(px + 5, py - 22, 3, 13), Tk.P_BLADE)
	# 장서표 초상 틀
	draw_rect(Rect2(4, 4, 32, 24), Tk.GOLD.darkened(0.3))
	draw_rect(Rect2(5, 5, 30, 22), Color("3f2b4f"))
	draw_rect(Rect2(14, 8, 12, 10), Tk.P_SKIN)
	draw_rect(Rect2(13, 7, 14, 4), Tk.P_HAIR)
	draw_rect(Rect2(11, 18, 18, 8), Tk.P_COAT)
	# 장소 이름표
	for sp in _spots:
		var r: Rect2 = sp[0]
		var w := ThemeDB.fallback_font.get_string_size(sp[1], HORIZONTAL_ALIGNMENT_LEFT, -1, 11).x + 8.0
		var lx := r.get_center().x - w / 2.0
		draw_rect(Rect2(lx, r.position.y - 13, w, 13), Color(Tk.INK, 0.75))
		UiKit.text(self, Vector2(r.get_center().x, r.position.y - 3), sp[1], Tk.PAPER, 11, true, Color(0, 0, 0, 0))
	# 하단 메뉴바 바탕
	draw_rect(Rect2(0, sz.y - 40, sz.x, 40), Color(Tk.INK, 0.85))
	draw_rect(Rect2(0, sz.y - 40, sz.x, 1), Tk.GOLD.darkened(0.3))
