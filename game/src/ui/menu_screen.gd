class_name MenuScreen
extends Control
## 메뉴 화면 공통 바탕 (책장 배경 + 가운데 콘텐츠 상자).

var router: Node
var _t := 0
var content: VBoxContainer


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)


func make_center(min_w: float = 220.0) -> VBoxContainer:
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	var panel := UiKit.panel()
	center.add_child(panel)
	content = VBoxContainer.new()
	content.add_theme_constant_override("separation", 5)
	content.custom_minimum_size = Vector2(min_w, 0)
	panel.add_child(content)
	return content


func _process(_d: float) -> void:
	_t += 1
	queue_redraw()


func _draw() -> void:
	UiKit.draw_shelves(self, get_viewport_rect().size, _t)


func focus_first() -> void:
	for c in find_children("*", "Button", true, false):
		if not (c as Button).disabled:
			(c as Button).grab_focus()
			return


## 두 칸 레이아웃: 상단 제목줄(제목·보조 정보·돌아가기) + 왼쪽/오른쪽 패널. 오른쪽은 스크롤.
func make_split(title: String, info: String, back: Callable, left_w: float = 190.0) -> Array:
	var root := MarginContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_" + side, 6)
	add_child(root)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)
	root.add_child(col)
	var head := HBoxContainer.new()
	col.add_child(head)
	var bb := UiKit.button("", back, false, "back")
	bb.custom_minimum_size = Vector2(26, 18)
	head.add_child(bb)
	head.add_child(UiKit.label(title, Tk.GOLD, 11, true))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	var acc: Dictionary = GameState.data["account"]
	head.add_child(UiKit.currency("gold", int(acc["gold"])))
	head.add_child(UiKit.currency("page", int(acc["pages"])))
	var row := HBoxContainer.new()
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.add_theme_constant_override("separation", 6)
	col.add_child(row)
	var lp := UiKit.panel()
	lp.custom_minimum_size = Vector2(left_w, 0)
	row.add_child(lp)
	var left := VBoxContainer.new()
	left.add_theme_constant_override("separation", 3)
	lp.add_child(left)
	var rp := UiKit.panel()
	rp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(rp)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	rp.add_child(scroll)
	var right := VBoxContainer.new()
	right.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	right.add_theme_constant_override("separation", 3)
	scroll.add_child(right)
	return [left, right]
