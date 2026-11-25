class_name LoadingScreen
extends Control
## 로딩 화면: 장 이름 + 도움말 한 줄. 페이지가 넘어가는 동안 잠깐 보여 주고 던전으로 들어간다.

const TIPS := [
	"아래 방향 + 점프로 발판 아래로 내려갈 수 있어요.",
	"적의 등 뒤에서 때리면 백어택으로 피해가 커져요.",
	"맞는 도중 MP 1칸으로 대시를 누르면 반격으로 빠져나옵니다.",
	"띄운 적은 공중에서 계속 이어 때릴 수 있어요.",
	"보스의 노란 경직 게이지를 다 채우면 그로기 상태가 됩니다.",
	"눈이 빨갛게 깜빡이면 공격 예고예요. 대시로 피하세요.",
	"빨리, 덜 맞고, 콤보를 길게 이으면 랭크가 올라요.",
	"강화에 실패해도 강화 수치는 떨어지지 않아요.",
]

var router: Node
var args: Dictionary = {}
var _t := 0
var _tip := ""


func _init() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_tip = TIPS[randi() % TIPS.size()]


func _ready() -> void:
	Sfx.play("page", 0.0)


func _process(_d: float) -> void:
	_t += 1
	if _t >= 100 or (GameState.autoplay and _t >= 30) or (_t > 20 and (Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("jump"))):
		set_process(false)
		router.go("dungeon", args)
		return
	queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if _t > 20 and ((event is InputEventMouseButton and event.pressed) or (event is InputEventScreenTouch and event.pressed)):
		_t = 100


func _draw() -> void:
	var sz := get_viewport_rect().size
	var cx := sz.x / 2.0
	draw_rect(Rect2(Vector2.ZERO, sz), Tk.INK)
	var d: Dictionary = DataDB.get_row("dungeons", args["dungeon"])
	# 넘어가는 책
	var by := 120.0
	draw_rect(Rect2(cx - 64, by - 34, 128, 40), Tk.LEATHER)
	draw_rect(Rect2(cx - 60, by - 38, 60, 40), Tk.PAPER)
	draw_rect(Rect2(cx, by - 38, 60, 40), Tk.PAPER)
	draw_rect(Rect2(cx - 1, by - 40, 2, 42), Tk.LEATHER.darkened(0.3))
	var flip := fmod(_t * 0.04, 1.0)
	var fx := cx + cos(flip * PI) * 60.0
	draw_colored_polygon(PackedVector2Array([Vector2(cx, by - 38), Vector2(fx, by - 42 - sin(flip * PI) * 12.0), Vector2(fx, by - 2 - sin(flip * PI) * 12.0), Vector2(cx, by + 2)]), Tk.PAPER_DIM)
	UiKit.text(self, Vector2(cx, 50), "「%s」" % d["book"], Tk.PAPER_DIM, 11, true)
	UiKit.text(self, Vector2(cx, 66), "%s%s" % [d["name"], "  (어려움)" if args.get("difficulty", "normal") == "hard" else ""], Tk.GOLD, 11, true)
	UiKit.text(self, Vector2(cx, sz.y - 50), "도움말", Tk.RIBBON, 11, true)
	UiKit.text(self, Vector2(cx, sz.y - 34), _tip, Tk.PAPER, 11, true)
	var w := 120.0
	draw_rect(Rect2(cx - w / 2.0, sz.y - 20, w, 4), Tk.INK_SOFT)
	draw_rect(Rect2(cx - w / 2.0, sz.y - 20, w * minf(1.0, _t / 100.0), 4), Tk.GOLD)
