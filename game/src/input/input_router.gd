extends Node
## 키보드/게임패드/터치 입력을 매 틱 하나의 InputFrame(Dictionary)으로 모은다.
## 전투 로직은 이 프레임만 읽는다 (온라인 대비 규칙 1).

const KEYS := {
	"move_left": [KEY_LEFT],
	"move_right": [KEY_RIGHT],
	"move_up": [KEY_UP],
	"move_down": [KEY_DOWN],
	"attack": [KEY_Z, KEY_J],
	"jump": [KEY_X, KEY_K, KEY_SPACE],
	"dash": [KEY_C, KEY_L, KEY_SHIFT],
	"skill1": [KEY_A, KEY_1],
	"skill2": [KEY_S, KEY_2],
	"skill3": [KEY_D, KEY_3],
	"potion": [KEY_Q],
	"pause": [KEY_ESCAPE, KEY_P],
}
const PAD := {
	"attack": [JOY_BUTTON_X],
	"jump": [JOY_BUTTON_A],
	"dash": [JOY_BUTTON_B],
	"skill1": [JOY_BUTTON_Y],
	"skill2": [JOY_BUTTON_LEFT_SHOULDER],
	"skill3": [JOY_BUTTON_RIGHT_SHOULDER],
	"potion": [JOY_BUTTON_BACK],
	"pause": [JOY_BUTTON_START],
}
const EDGE_ACTIONS := ["attack", "jump", "dash", "skill1", "skill2", "skill3", "potion", "pause"]

var touch_axis := Vector2.ZERO
var touch_held: Dictionary = {}
var _touch_edges: Dictionary = {}
## 자동 테스트용 가짜 입력 (null 이면 사용 안 함)
var scripted: Callable = Callable()


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for action in KEYS:
		if not InputMap.has_action(action):
			InputMap.add_action(action, 0.3)
		for k in KEYS[action]:
			var ev := InputEventKey.new()
			ev.physical_keycode = k
			InputMap.action_add_event(action, ev)
		for b in PAD.get(action, []):
			var jb := InputEventJoypadButton.new()
			jb.button_index = b
			InputMap.action_add_event(action, jb)
	var axes := { "move_left": [JOY_AXIS_LEFT_X, -1.0], "move_right": [JOY_AXIS_LEFT_X, 1.0],
		"move_up": [JOY_AXIS_LEFT_Y, -1.0], "move_down": [JOY_AXIS_LEFT_Y, 1.0] }
	for action in axes:
		var jm := InputEventJoypadMotion.new()
		jm.axis = axes[action][0]
		jm.axis_value = axes[action][1]
		InputMap.action_add_event(action, jm)
		var dp := InputEventJoypadButton.new()
		dp.button_index = { "move_left": JOY_BUTTON_DPAD_LEFT, "move_right": JOY_BUTTON_DPAD_RIGHT,
			"move_up": JOY_BUTTON_DPAD_UP, "move_down": JOY_BUTTON_DPAD_DOWN }[action]
		InputMap.action_add_event(action, dp)


func touch_press(action: String) -> void:
	touch_held[action] = true
	_touch_edges[action] = true


func touch_release(action: String) -> void:
	touch_held.erase(action)


func clear_touch() -> void:
	touch_held.clear()
	_touch_edges.clear()
	touch_axis = Vector2.ZERO


## 한 틱 분량의 입력. *_p = 이번 틱에 눌림, *_h = 누르고 있음.
func poll() -> Dictionary:
	if scripted.is_valid():
		return scripted.call()
	var x := Input.get_axis("move_left", "move_right")
	var y := Input.get_axis("move_up", "move_down")
	if absf(touch_axis.x) > 0.35:
		x = signf(touch_axis.x)
	if absf(touch_axis.y) > 0.55:
		y = signf(touch_axis.y)
	var f := { "x": int(signf(x)) if absf(x) > 0.3 else 0, "y": int(signf(y)) if absf(y) > 0.5 else 0 }
	for a in EDGE_ACTIONS:
		f[a + "_p"] = Input.is_action_just_pressed(a) or _touch_edges.has(a)
		f[a + "_h"] = Input.is_action_pressed(a) or touch_held.has(a)
	_touch_edges.clear()
	return f


static func empty_frame() -> Dictionary:
	var f := { "x": 0, "y": 0 }
	for a in EDGE_ACTIONS:
		f[a + "_p"] = false
		f[a + "_h"] = false
	return f
