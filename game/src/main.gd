extends Node
## 루트: 폰트/테마 설정, 화면 전환(SceneRouter 역할), 자동 테스트·스크린샷 모드.

var current: Node = null
var autotest: AutoTest = null


func _ready() -> void:
	UiKit.setup_fonts()
	var args := OS.get_cmdline_user_args()
	if args.has("--autotest") or args.has("--shots") or args.has("--unit"):
		autotest = AutoTest.new()
		autotest.main = self
		add_child(autotest)
		autotest.begin(args)
		return
	go("title")


## 대기실에서 장비·스킬 등으로 나갔다가 '돌아가기'를 누르면 열람실 대신 여기로 돌아온다.
var return_to: Dictionary = {}


func go(screen: String, args: Dictionary = {}) -> void:
	if screen in ["title", "map"]:
		return_to = {}
	if screen == "town" and not return_to.is_empty():
		screen = return_to["screen"]
		args = return_to["args"]
		return_to = {}
	Engine.time_scale = 1.0
	InputRouter.clear_touch()
	if current:
		current.queue_free()
		current = null
	Sfx.bgm("bgm_town")
	match screen:
		"title":
			var ts := TitleScreen.new()
			ts.router = self
			current = ts
		"town":
			var tw := TownScreen.new()
			tw.router = self
			current = tw
		"map", "books":
			var bm := BookMapScreen.new()
			bm.router = self
			bm.sel = args.get("sel", "")
			bm.diff = args.get("difficulty", "normal")
			current = bm
		"options":
			current = Screens.options(self, args)
		"select":
			current = MetaScreens.select(self)
		"equip":
			current = MetaScreens.equip(self, args)
		"skills":
			current = MetaScreens.skills(self, args)
		"enhance":
			current = MetaScreens.enhance(self, args)
		"shop":
			current = MetaScreens.shop(self, args)
		"pets":
			current = MetaScreens.pets(self, args)
		"missions":
			current = MetaScreens.missions(self, args)
		"layout":
			var le := LayoutEditor.new()
			le.router = self
			current = le
		"result":
			GameState.last_result = args
			current = Screens.result(self, args)
		"room":
			current = RoomScreen.build(self, args)
		"loading":
			var ld := LoadingScreen.new()
			ld.router = self
			ld.args = args
			current = ld
		"dungeon":
			Sfx.bgm("bgm_dungeon")
			var run := DungeonRun.new()
			current = run
			add_child(run)
			run.finished.connect(func(r: Dictionary): go("result", r))
			run.start(args["dungeon"], int(args.get("seed", -1)), args.get("difficulty", "normal"))
			if autotest:
				autotest.on_dungeon(run)
			return
	add_child(current)
	if current is MenuScreen:
		(current as MenuScreen).focus_first.call_deferred()
	if current is Control and not (current is MenuScreen):
		pass
	if autotest:
		autotest.on_screen(screen, current)
