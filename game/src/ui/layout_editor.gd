class_name LayoutEditor
extends Control
## S19-b 버튼 배치 편집: 버튼/패드를 끌어 옮기고, 선택한 것의 크기를 조절한 뒤 저장.

var router: Node
var tc: TouchControls
var _sel_label: Label


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)


func _draw() -> void:
	var sz := get_viewport_rect().size
	draw_rect(Rect2(Vector2.ZERO, sz), Color("e3cf9e"))
	draw_rect(Rect2(0, sz.y - 44, sz.x, 44), Color("6d5a3a"))
	draw_rect(Rect2(0, sz.y - 44, sz.x, 3), Tk.PAPER)


func _ready() -> void:
	tc = TouchControls.new()
	tc.edit_mode = true
	tc.mp = 3.0
	tc.potions = 3
	add_child(tc)
	var bar := HBoxContainer.new()
	bar.position = Vector2(6, 6)
	bar.add_theme_constant_override("separation", 4)
	add_child(bar)
	_sel_label = UiKit.label("버튼을 끌어서 옮기세요", Tk.INK)
	bar.add_child(_sel_label)
	bar.add_child(UiKit.button("크기 -", func(): _scale(-0.1)))
	bar.add_child(UiKit.button("크기 +", func(): _scale(0.1)))
	bar.add_child(UiKit.button("기본값", func():
		tc.layout = {}
		tc.queue_redraw()))
	bar.add_child(UiKit.button("저장", func():
		GameState.data["settings"]["layout"] = tc.layout.duplicate(true)
		GameState.save_game()
		router.go("options", { "msg": "버튼 배치를 저장했습니다" }), true))
	bar.add_child(UiKit.button("취소", func(): router.go("options")))


func _scale(d: float) -> void:
	if tc.selected != "" and tc.selected != "pad":
		tc.change_scale(tc.selected, d)


func _process(_d: float) -> void:
	_sel_label.text = "선택: %s" % (tc.selected if tc.selected != "" else "없음")
