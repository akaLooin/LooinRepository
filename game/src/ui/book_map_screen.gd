class_name BookMapScreen
extends Control
## S04/S05 책 지도: 펼친 책 위에 장(던전)들이 밀랍 인장 노드로 이어져 있다.
## 노드를 고르면 오른쪽 카드에 정보·난이도·입장 버튼. 오른쪽 가장자리 책갈피는 다른 책(추후 추가).

const BOOK := "얼룩진 동화책"
## 페이지 위 노드 위치(책 영역 기준 0~1)와 곁들일 삽화
const NODES := {
	"dgn_01": [Vector2(0.16, 0.66), "forest"],
	"dgn_02": [Vector2(0.48, 0.30), "bell"],
	"dgn_03": [Vector2(0.80, 0.62), "lighthouse"],
}

var router: Node
var sel := ""
var diff := "normal"
var _t := 0
var _book := Rect2()
var _card: VBoxContainer


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)


func _ready() -> void:
	var sz := get_viewport_rect().size
	_book = Rect2(10, 26, sz.x - 186, sz.y - 40)
	if sel == "":
		for did in NODES:
			if _unlocked(did):
				sel = did
	var back := UiKit.button("열람실", func(): router.go("town"), false, "back")
	back.position = Vector2(6, 4)
	back.custom_minimum_size = Vector2(60, 18)
	add_child(back)
	for did in NODES:
		var p := _node_pos(did)
		var b := Button.new()
		b.flat = true
		b.position = p - Vector2(16, 16)
		b.size = Vector2(32, 32)
		b.focus_mode = Control.FOCUS_ALL
		b.add_theme_stylebox_override("focus", UiKit.tbox("btn_focus", 4, 2, Color(0, 0, 0, 0), Tk.GOLD))
		var id: String = did
		b.pressed.connect(func():
			Sfx.play("page", 0.0)
			router.go("map", { "sel": id, "difficulty": diff }))
		add_child(b)
	# 책갈피 탭 (다른 책들 — 데모에는 1권만)
	var tabs := [[BOOK, true], ["???", false], ["???", false]]
	for i in range(tabs.size()):
		var tb := UiKit.button(tabs[i][0], func(): pass, tabs[i][1])
		tb.position = Vector2(_book.end.x - 2, _book.position.y + 10 + i * 24)
		tb.custom_minimum_size = Vector2(16, 20)
		tb.disabled = not tabs[i][1]
		tb.visible = false   # 공간이 좁으면 카드와 겹치므로 그림으로만 표시
	var card_panel := UiKit.paper_panel()
	card_panel.position = Vector2(sz.x - 170, 26)
	card_panel.custom_minimum_size = Vector2(164, sz.y - 40)
	add_child(card_panel)
	_card = VBoxContainer.new()
	_card.add_theme_constant_override("separation", 3)
	card_panel.add_child(_card)
	_fill_card()


func _unlocked(did: String) -> bool:
	var d: Dictionary = DataDB.get_row("dungeons", did)
	return not d.has("unlock") or GameState.data["progress"]["cleared"].has(d["unlock"] + ":normal")


func _node_pos(did: String) -> Vector2:
	var f: Vector2 = NODES[did][0]
	return _book.position + Vector2(f.x * _book.size.x, f.y * _book.size.y)


func _fill_card() -> void:
	var d: Dictionary = DataDB.get_row("dungeons", sel)
	var ink := Tk.INK
	_card.add_child(UiKit.label("「%s」" % d["book"], Tk.LEATHER))
	var nm := UiKit.label(d["name"], ink)
	nm.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	nm.custom_minimum_size = Vector2(150, 0)
	_card.add_child(nm)
	var cd := GameState.char_data()
	var rec := int(d["rec_lv"])
	_card.add_child(UiKit.label("권장 Lv%d  (지금 Lv%d)" % [rec, cd["lv"]], Tk.DANGER.darkened(0.2) if int(cd["lv"]) < rec else Color("3f6a3a")))
	var pages := 0
	for _k in d["stages"]:
		pages += 1
	_card.add_child(UiKit.label("페이지 %d · 보스 1" % pages, Color("5a4a3a")))
	# 난이도
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 3)
	_card.add_child(row)
	for diff_id in d.get("difficulties", {}):
		var dd: Dictionary = d["difficulties"][diff_id]
		var open := Meta.difficulty_unlocked(sel, diff_id)
		var b := UiKit.button(dd["name"] if open else "%s (잠김)" % dd["name"], func(): router.go("map", { "sel": sel, "difficulty": diff_id }), diff_id == diff)
		b.disabled = not open
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(b)
	var recd: Dictionary = GameState.data["progress"]["cleared"].get("%s:%s" % [sel, diff], {})
	_card.add_child(UiKit.label("최고 기록: %s" % ("%s 랭크 · %.0f초" % [recd["best_rank"], recd["best_time"]] if not recd.is_empty() else "없음"), Color("5a4a3a")))
	# 얻을 수 있는 장비 (상위 3개)
	var tbl: Array = d.get("drops", {}).get("table", [])
	var names: PackedStringArray = []
	for i in range(mini(3, tbl.size())):
		names.append(Meta.item_def(tbl[i][0])["name"])
	if not names.is_empty():
		var dl := UiKit.label("획득 가능: " + ", ".join(names) + " 등", Color("5a4a3a"))
		dl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		dl.custom_minimum_size = Vector2(150, 0)
		_card.add_child(dl)
	var sp := Control.new()
	sp.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_card.add_child(sp)
	var go := UiKit.button("이 장을 펼친다", func(): router.go("dungeon", { "dungeon": sel, "difficulty": diff }), true, "map")
	go.custom_minimum_size = Vector2(0, 24)
	go.disabled = not _unlocked(sel) or not Meta.difficulty_unlocked(sel, diff)
	_card.add_child(go)
	go.grab_focus.call_deferred()


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	var sz := get_viewport_rect().size
	# 책상
	draw_rect(Rect2(Vector2.ZERO, sz), Color("3e271c"))
	for i in range(0, int(sz.y), 12):
		draw_rect(Rect2(0, i, sz.x, 1), Color("4a3024"))
	UiKit.text(self, Vector2(sz.x / 2.0 - 60, 16), "책 지도 — 「%s」" % BOOK, Tk.GOLD, 11, true)
	# 펼친 책: 가죽 표지 + 양쪽 페이지 + 가운데 접힘
	var b := _book
	draw_rect(b.grow(5), Tk.INK)
	draw_rect(b.grow(4), Tk.LEATHER)
	draw_rect(b.grow(4).grow_individual(0, 0, 0, -b.size.y - 4 + 2), Color("a8624a"))
	draw_rect(b, Tk.PAPER)
	for k in range(3):
		draw_rect(Rect2(b.position.x - 1 - k, b.position.y + 2 + k, 1, b.size.y - 4 - k * 2), Tk.PAPER_DIM)
		draw_rect(Rect2(b.end.x + k, b.position.y + 2 + k, 1, b.size.y - 4 - k * 2), Tk.PAPER_DIM)
	var mid := b.position.x + b.size.x / 2.0
	for k in range(6):
		draw_rect(Rect2(mid - 3 + k, b.position.y, 1, b.size.y), Tk.PAPER.darkened(0.04 * (3 - absf(k - 2.5))))
	# 페이지의 흐린 글줄
	for y in range(int(b.position.y) + 10, int(b.end.y) - 6, 9):
		draw_rect(Rect2(b.position.x + 8, y, b.size.x / 2.0 - 20 - (y * 7) % 23, 1), Color(Tk.PAPER_DIM, 0.45))
		draw_rect(Rect2(mid + 10, y, b.size.x / 2.0 - 22 - (y * 11) % 19, 1), Color(Tk.PAPER_DIM, 0.45))
	# 노드 사이 잉크 점선 길
	var ids := NODES.keys()
	for i in range(ids.size() - 1):
		var a := _node_pos(ids[i])
		var c := _node_pos(ids[i + 1])
		var open := _unlocked(ids[i + 1])
		var n := int(a.distance_to(c) / 5.0)
		for k in range(n):
			if k % 2 == 0:
				var p := a.lerp(c, float(k) / n) + Vector2(0, sin(float(k) / n * PI) * -10.0)
				draw_rect(Rect2(p, Vector2(2, 2)), Color(Tk.INK, 0.8) if open else Color(Tk.INK, 0.25))
	# 삽화 + 인장 노드
	for did in NODES:
		var p := _node_pos(did)
		_draw_sketch(NODES[did][1], p + Vector2(-26, -30))
		var open := _unlocked(did)
		var cleared: Dictionary = GameState.data["progress"]["cleared"].get(did + ":normal", {})
		var seal := Tk.RIBBON if open else Color("6b6478")
		if did == sel:
			draw_circle(p, 17 + sin(_t * 0.15), Color(Tk.GOLD, 0.35))
		for k in range(10):
			var a := TAU * k / 10.0
			draw_circle(p + Vector2(cos(a), sin(a)) * 11.0, 3, seal)
		draw_circle(p, 11, seal)
		draw_circle(p, 8, seal.darkened(0.25))
		var num := String(DataDB.get_row("dungeons", did)["name"]).substr(0, 2)
		UiKit.text(self, p + Vector2(0, 4), num, Tk.PAPER, 11, true, Color(0, 0, 0, 0))
		if not open:
			var lk := UiKit.icon("lock")
			if lk:
				draw_texture(lk, p + Vector2(6, -18))
		elif not cleared.is_empty():
			# 랭크 도장
			draw_circle(p + Vector2(14, -12), 7, Color(Tk.INK, 0.15))
			draw_arc(p + Vector2(14, -12), 7, 0, TAU, 16, Color("b23a3a"), 1.5)
			UiKit.text(self, p + Vector2(14, -8), cleared["best_rank"], Color("b23a3a"), 11, true, Color(0, 0, 0, 0))
	# 오른쪽 가장자리 책갈피 탭 (다른 책)
	for i in range(3):
		var y := b.position.y + 8 + i * 22
		var col := Tk.RIBBON if i == 0 else Color("4a4258")
		draw_rect(Rect2(b.end.x + 4, y, 6, 18), col)


func _draw_sketch(kind: String, o: Vector2) -> void:
	var ink := Color(Tk.INK, 0.55)
	match kind:
		"forest":
			for k in range(3):
				var x := o.x + k * 9.0
				draw_rect(Rect2(x + 3, o.y + 10, 1, 6), ink)
				draw_colored_polygon(PackedVector2Array([Vector2(x, o.y + 11), Vector2(x + 3.5, o.y + k % 2), Vector2(x + 7, o.y + 11)]), Color(Tk.INK, 0.35))
		"bell":
			draw_rect(Rect2(o.x + 6, o.y - 4, 10, 20), Color(Tk.INK, 0.3))
			draw_colored_polygon(PackedVector2Array([Vector2(o.x + 4, o.y - 4), Vector2(o.x + 11, o.y - 12), Vector2(o.x + 18, o.y - 4)]), ink)
			draw_rect(Rect2(o.x + 9, o.y + 1, 4, 4), ink)
		"lighthouse":
			draw_colored_polygon(PackedVector2Array([Vector2(o.x + 6, o.y + 16), Vector2(o.x + 9, o.y - 6), Vector2(o.x + 13, o.y - 6), Vector2(o.x + 16, o.y + 16)]), Color(Tk.INK, 0.3))
			draw_rect(Rect2(o.x + 8, o.y - 10, 6, 4), Color(Tk.GOLD, 0.8))
			for k in range(3):
				draw_rect(Rect2(o.x - 2 + k * 9, o.y + 18, 6, 1), ink)
