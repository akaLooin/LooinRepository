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
