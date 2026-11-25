extends Node
## 루트: 폰트/테마 설정, 화면 전환(SceneRouter 역할), 자동 테스트·스크린샷 모드.

var current: Node = null
var autotest: AutoTest = null


func _ready() -> void:
	var font := load("res://assets/fonts/Galmuri11.ttf") as FontFile
	if font:
		font.antialiasing = TextServer.FONT_ANTIALIASING_NONE
		font.hinting = TextServer.HINTING_NONE
		font.subpixel_positioning = TextServer.SUBPIXEL_POSITIONING_DISABLED
		ThemeDB.fallback_font = font
	ThemeDB.fallback_font_size = Tk.FONT_SIZE
	var args := OS.get_cmdline_user_args()
	if args.has("--autotest") or args.has("--shots") or args.has("--unit"):
		autotest = AutoTest.new()
		autotest.main = self
		add_child(autotest)
		autotest.begin(args)
		return
	go("title")


func go(screen: String, args: Dictionary = {}) -> void:
	Engine.time_scale = 1.0
	InputRouter.clear_touch()
	if current:
		current.queue_free()
		current = null
	match screen:
		"title":
			current = Screens.title(self)
		"town":
			current = Screens.town(self)
		"books":
			current = Screens.books(self)
		"options":
			current = Screens.options(self)
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
		"result":
			GameState.last_result = args
			current = Screens.result(self, args)
		"dungeon":
			var run := DungeonRun.new()
			current = run
			add_child(run)
			run.finished.connect(func(r: Dictionary): go("result", r))
			run.start(args["dungeon"], int(args.get("seed", -1)))
			if autotest:
				autotest.on_dungeon(run)
			return
	add_child(current)
	if current is MenuScreen:
		(current as MenuScreen).focus_first.call_deferred()
	if autotest:
		autotest.on_screen(screen, current)
