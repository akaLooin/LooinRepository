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
	var pad_c := _pad_origin if _pad_touch != -1 else pad_home()
	draw_circle(pad_c, PAD_R, Color(Tk.INK, 0.25))
	draw_arc(pad_c, PAD_R, 0, TAU, 32, Color("fff1b8", 0.6), 1.0)
	for k in range(4):
		var a := k * PI / 2.0
		draw_rect(Rect2(pad_c + Vector2(cos(a), sin(a)) * (PAD_R - 5) - Vector2(1, 1), Vector2(3, 3)), Color("fff1b8", 0.7))
	var knob := pad_c + (InputRouter.touch_axis * PAD_R if _pad_touch != -1 else Vector2.ZERO)
	draw_circle(knob, 10, Color(Tk.PAPER, 0.55))
	draw_arc(knob, 10, 0, TAU, 20, Color(Tk.INK, 0.5), 1.0)
	for b in BUTTONS:
		var c := _btn_center(b)
		var r := _btn_radius(b)
		var id: String = b[0]
		var pressed := _btn_touch.values().has(id)
		if id.begins_with("skill"):
			var need := int(String(b[1]))
			var ok: bool = mp >= float(need) and learned[need - 1]
			var seal := Color("b8323f", 0.92) if ok else Color("4a3a4a", 0.6)
			if pressed:
				seal = seal.lightened(0.3)
			for k in range(8):
				var a := k * TAU / 8.0
				draw_circle(c + Vector2(cos(a), sin(a)) * r * 0.9, r * 0.28, seal)
			draw_circle(c, r, seal)
			draw_arc(c, r * 0.72, 0, TAU, 20, Color("6e1a24", 0.9) if ok else Color(Tk.INK, 0.5), 1.0)
			var lab: String = b[1] if learned[need - 1] else "-"
			UiKit.text(self, c + Vector2(0, 4), lab, Color("fff1b8") if ok else Color("8a7f9a"), 11, true, Color("6e1a24") if ok else Tk.INK)
			continue
		var fill := Color(Tk.INK, 0.5)
		var ring := Color(Tk.PAPER, 0.6)
		if id == "attack":
			ring = Color(Tk.GOLD, 0.85)
		if pressed:
			fill = Color(Tk.GOLD, 0.35)
		draw_circle(c, r, fill)
		draw_arc(c, r, 0, TAU, 32, ring, 1.5 if id == "attack" else 1.0)
		if id == "attack":
			for k in range(int(r * 0.9)):
				var t := float(k) / (r * 0.9)
				draw_rect(Rect2(c + Vector2(-r * 0.45 + t * r * 0.9, r * 0.35 - t * r * 0.9), Vector2(2, 2)), Color("e9f0f7"))
			draw_rect(Rect2(c + Vector2(-r * 0.5, r * 0.2), Vector2(6, 2)), Tk.GOLD)
			UiKit.text(self, c + Vector2(0, r * 0.75), "공격", Color("fff1b8"), 11, true)
		elif id == "potion":
			var pi := UiKit.icon("potion")
			if pi:
				draw_texture(pi, c - Vector2(8, 10), Color(1, 1, 1, 1.0 if potions > 0 else 0.4))
			UiKit.text(self, c + Vector2(r - 2, r), str(potions), Tk.TEXT, 11, false)
		else:
			UiKit.text(self, c + Vector2(0, 4), b[1], Color("fff1b8"), 11, true)
		if edit_mode and selected == id:
			draw_arc(c, r + 3, 0, TAU, 32, Tk.GOLD, 2.0)
	if edit_mode and selected == "pad":
		draw_arc(pad_home(), PAD_R + 3, 0, TAU, 32, Tk.GOLD, 2.0)
