class_name DialogBox
extends Control
## S21 대화 상자: 초상 + 이름 + 한 글자씩 찍히는 대사. 화면 탭 / 공격·점프 키로 넘김, '건너뛰기'로 끝냄.

signal finished

const CHARS_PER_TICK := 0.9

var lines: Array = []
var idx := 0
var shown := 0.0
var _label: Label
var _name: Label
var _portrait: ColorRect
var _initial: Label
var _done := false


func start(dialog_id: String) -> void:
	lines = DataDB.get_row("dialogs", dialog_id).get("lines", [])
	idx = 0
	shown = 0.0
	if lines.is_empty():
		_finish.call_deferred()


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_STOP
	process_mode = Node.PROCESS_MODE_ALWAYS
	var dim := ColorRect.new()
	dim.color = Color(Tk.INK, 0.35)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(dim)
	var panel := PanelContainer.new()
	panel.add_theme_stylebox_override("panel", UiKit.box(Tk.PAPER, Tk.LEATHER, 6))
	panel.set_anchors_preset(Control.PRESET_BOTTOM_WIDE)
	panel.offset_left = 8
	panel.offset_right = -8
	panel.offset_top = -74
	panel.offset_bottom = -6
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(panel)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)
	panel.add_child(row)
	_portrait = ColorRect.new()
	_portrait.custom_minimum_size = Vector2(50, 50)
	row.add_child(_portrait)
	_initial = UiKit.label("", Tk.TEXT, 22)
	_initial.set_anchors_preset(Control.PRESET_CENTER)
	_initial.position = Vector2(14, 10)
	_portrait.add_child(_initial)
	var col := VBoxContainer.new()
	col.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(col)
	_name = UiKit.label("", Tk.LEATHER)
	col.add_child(_name)
	_label = UiKit.label("", Tk.INK)
	_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_label.custom_minimum_size = Vector2(200, 30)
	col.add_child(_label)
	var skip := UiKit.button("건너뛰기 ▶▶", _finish)
	skip.focus_mode = Control.FOCUS_NONE
	skip.set_anchors_preset(Control.PRESET_TOP_RIGHT)
	skip.position = Vector2(-80, 6)
	skip.custom_minimum_size = Vector2(72, 16)
	add_child(skip)
	_show_line()


func _show_line() -> void:
	if idx >= lines.size():
		return
	var ln: Dictionary = lines[idx]
	_name.text = ln["who"]
	_portrait.color = Color(ln.get("color", "2a2346"))
	_initial.text = String(ln["who"]).substr(0, 1)
	_label.text = ln["text"]
	_label.visible_characters = 0
	shown = 0.0


func _process(_d: float) -> void:
	if _done:
		return
	if GameState.autoplay:
		_finish()
		return
	shown += CHARS_PER_TICK
	_label.visible_characters = int(shown)
	if Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("jump"):
		advance()


func _gui_input(event: InputEvent) -> void:
	if (event is InputEventMouseButton and event.pressed) or (event is InputEventScreenTouch and event.pressed):
		advance()
		accept_event()


func advance() -> void:
	if idx >= lines.size():
		_finish()
		return
	if shown < String(lines[idx]["text"]).length():
		shown = 9999.0
		_label.visible_characters = -1
		return
	idx += 1
	if idx >= lines.size():
		_finish()
	else:
		_show_line()


func _finish() -> void:
	if _done:
		return
	_done = true
	finished.emit()
	queue_free()


## 아직 본 적 없는 대화면 parent 위에 띄우고 '봤음'으로 기록. 띄웠으면 DialogBox, 아니면 null.
static func show_once(parent: Node, dialog_id: String, on_done: Callable = Callable()) -> DialogBox:
	var seen: Dictionary = GameState.data["progress"].get("seen", {})
	if seen.get(dialog_id, false):
		return null
	seen[dialog_id] = true
	GameState.data["progress"]["seen"] = seen
	GameState.save_game()
	var dlg := DialogBox.new()
	parent.add_child(dlg)
	dlg.start(dialog_id)
	if on_done.is_valid():
		dlg.finished.connect(on_done)
	return dlg
