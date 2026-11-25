class_name TouchControls
extends Control
## 모바일 가상 패드 + 액션 버튼. 왼쪽 절반 아무 곳이나 눌러 플로팅 패드, 오른쪽은 버튼.

const PAD_R := 26.0
const BUTTONS := [
	# id, 라벨, 오른쪽에서 x, 아래에서 y, 반지름
	["attack", "공격", 44, 40, 22],
	["jump", "점프", 92, 26, 15],
	["dash", "대시", 86, 66, 13],
	["skill1", "1", 22, 92, 11],
	["skill2", "2", 50, 100, 11],
	["skill3", "3", 78, 106, 11],
	["potion", "약", 128, 22, 11],
]

var mp := 0.0
var potions := 0
var learned: Array = [true, true, true]
var _pad_touch := -1
var _pad_origin := Vector2.ZERO
var _pad_pos := Vector2.ZERO
var _btn_touch: Dictionary = {}   # touch index -> button id
var _font: Font
## 버튼 배치: { id: [dx, dy, scale] } (기본 위치 기준 오프셋). "pad" 는 이동 패드.
var layout: Dictionary = {}
var edit_mode := false
var selected := ""
var _drag_from := Vector2.ZERO
var _drag_start_off := Vector2.ZERO
var _dragging := false


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_font = get_theme_default_font()
	layout = (GameState.data["settings"].get("layout", {}) as Dictionary).duplicate(true)


func _off(id: String) -> Vector2:
	var l: Array = layout.get(id, [0, 0, 1.0])
	return Vector2(float(l[0]), float(l[1]))


func _scale(id: String) -> float:
	return float(layout.get(id, [0, 0, 1.0])[2])


func _set_off(id: String, off: Vector2) -> void:
	layout[id] = [roundf(off.x), roundf(off.y), _scale(id)]


func change_scale(id: String, delta: float) -> void:
	var o := _off(id)
	layout[id] = [o.x, o.y, clampf(_scale(id) + delta, 0.6, 1.8)]
	queue_redraw()


func pad_home() -> Vector2:
	return Vector2(56, get_viewport_rect().size.y - 52) + _off("pad")


func _btn_radius(b: Array) -> float:
	return float(b[4]) * _scale(b[0])


func _btn_center(b: Array) -> Vector2:
	var sz := get_viewport_rect().size
	return Vector2(sz.x - float(b[2]), sz.y - float(b[3])) + _off(b[0])


func _hit_button(p: Vector2) -> String:
	for b in BUTTONS:
		if p.distance_to(_btn_center(b)) <= _btn_radius(b) + 6.0:
			return b[0]
	return ""


func _edit_input(event: InputEvent) -> void:
	var pos := Vector2(-1, -1)
	var pressed := false
	var released := false
	if event is InputEventScreenTouch or event is InputEventMouseButton:
		pos = event.position
		pressed = event.pressed
		released = not event.pressed
	elif event is InputEventScreenDrag or event is InputEventMouseMotion:
		pos = event.position
	else:
		return
	if pressed:
		var id := _hit_button(pos)
		if id == "" and pos.distance_to(pad_home()) <= PAD_R + 6.0:
			id = "pad"
		if id != "":
			selected = id
			_dragging = true
			_drag_from = pos
			_drag_start_off = _off(id)
	elif released:
		_dragging = false
	elif _dragging and selected != "":
		_set_off(selected, _drag_start_off + (pos - _drag_from))
	queue_redraw()


func _input(event: InputEvent) -> void:
	if not visible:
		return
	if edit_mode:
		_edit_input(event)
		return
	if event is InputEventScreenTouch:
		var t := event as InputEventScreenTouch
		if t.pressed:
			var id := _hit_button(t.position)
			if id != "":
				_btn_touch[t.index] = id
				InputRouter.touch_press(id)
			elif t.position.x < get_viewport_rect().size.x * 0.5 and _pad_touch == -1:
				_pad_touch = t.index
				_pad_origin = t.position
				_pad_pos = t.position
		else:
			if _btn_touch.has(t.index):
				InputRouter.touch_release(_btn_touch[t.index])
				_btn_touch.erase(t.index)
			if t.index == _pad_touch:
				_pad_touch = -1
				InputRouter.touch_axis = Vector2.ZERO
		queue_redraw()
	elif event is InputEventScreenDrag:
		var d := event as InputEventScreenDrag
		if d.index == _pad_touch:
			_pad_pos = d.position
			var v := (_pad_pos - _pad_origin) / PAD_R
			InputRouter.touch_axis = v.limit_length(1.0)
			queue_redraw()


func set_state(mp_v: float, potions_v: int, learned_v: Array = [true, true, true]) -> void:
	if absf(mp_v - mp) > 0.01 or potions_v != potions or learned_v != learned:
		mp = mp_v
		potions = potions_v
		learned = learned_v
		queue_redraw()


func _draw() -> void:
	var sz := get_viewport_rect().size
	var pad_c := _pad_origin if _pad_touch != -1 else pad_home()
	draw_circle(pad_c, PAD_R, Color(Tk.PAPER, 0.12))
	draw_arc(pad_c, PAD_R, 0, TAU, 24, Color(Tk.PAPER, 0.35), 1.0)
	var knob := pad_c + (InputRouter.touch_axis * PAD_R if _pad_touch != -1 else Vector2.ZERO)
	draw_circle(knob, 10, Color(Tk.PAPER, 0.35))
	for b in BUTTONS:
		var c := _btn_center(b)
		var r := _btn_radius(b)
		var col := Color(Tk.PAPER, 0.18)
		var enabled := true
		if String(b[0]).begins_with("skill"):
			var need := int(String(b[1]))
			enabled = mp >= float(need) and learned[need - 1]
			col = Color(Tk.MP, 0.55) if enabled else Color(Tk.INK_SOFT, 0.35)
		elif b[0] == "potion":
			enabled = potions > 0
		if _btn_touch.values().has(b[0]):
			col = col.lightened(0.4)
		draw_circle(c, r, col)
		draw_arc(c, r, 0, TAU, 24, Color(Tk.PAPER, 0.5 if enabled else 0.2), 1.0)
		var label: String = b[1] if b[0] != "potion" else "약%d" % potions
		if String(b[0]).begins_with("skill") and not learned[int(String(b[1])) - 1]:
			label = "-"
		var fs := 11
		var w := _font.get_string_size(label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		draw_string(_font, c + Vector2(-w / 2.0, 4), label, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, Color(Tk.TEXT, 0.9 if enabled else 0.4))
		if edit_mode and selected == b[0]:
			draw_arc(c, r + 3, 0, TAU, 32, Tk.GOLD, 2.0)
	if edit_mode and selected == "pad":
		draw_arc(pad_home(), PAD_R + 3, 0, TAU, 32, Tk.GOLD, 2.0)
