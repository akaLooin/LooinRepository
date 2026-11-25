class_name AutoTest
extends Node
## 자동 플레이 봇 + 스크린샷. 사용: godot --path game -- --autotest [--god] [--shots <dir>]
## 던전을 처음부터 끝까지 봇이 플레이하고, 결과를 출력한 뒤 종료한다.

var main: Node
var shots_dir := ""
var god := false
var hard := false
var only_skill := 0   # --skill N: 봇이 그 필살기만 쓴다
var dungeon_id := "dgn_01"
var _hold := 0
var charge_fired := 0
var run: DungeonRun = null
var k := 0
var _shot_marks: Dictionary = {}
var _deadline := 60 * 60 * 8
var _wall := 0


func begin(args: PackedStringArray) -> void:
	god = args.has("--god")
	var si := args.find("--skill")
	if si >= 0:
		only_skill = int(args[si + 1])
	if args.has("--hard"):
		hard = true
	if args.has("--unit"):
		var f := MetaTests.run()
		get_tree().quit(1 if f > 0 else 0)
		return
	var i := args.find("--shots")
	if i >= 0 and i + 1 < args.size():
		shots_dir = args[i + 1]
		DirAccess.make_dir_recursive_absolute(shots_dir)
	GameState.data = GameState.new_save()   # 자동 테스트는 항상 새 세이브로
	GameState.autoplay = true
	if args.has("--charge"):
		GameState.data["settings"]["charge_attack"] = true
	if args.has("--touch"):
		GameState.data["settings"]["show_touch"] = "on"
	var di := args.find("--dungeon")
	if di >= 0:
		dungeon_id = args[di + 1]
	var li := args.find("--lv")
	if li >= 0:
		_gear_up(int(args[li + 1]))
	InputRouter.scripted = _bot_input
	if shots_dir != "":
		_menu_tour()
	else:
		main.go("dungeon", { "dungeon": dungeon_id, "seed": 7, "difficulty": "hard" if hard else "normal" })


## 밸런스 점검용: 그 레벨의 평범한 플레이어 상태(해당 레벨 장비 +2, 스킬 습득)를 흉내 낸다.
func _gear_up(lv: int) -> void:
	var cls := GameState.current_class
	GameState.char_data(cls)["lv"] = lv
	GameState.data["account"]["pets"] = ["pet_bookworm"]
	GameState.char_data(cls)["pet"] = "pet_bookworm"
	for slot in Meta.SLOTS:
		var best := ""
		var best_lv := -1
		for item_id in DataDB.tables["items"]:
			var d: Dictionary = DataDB.tables["items"][item_id]
			if d["slot"] == slot and int(d["lv"]) <= lv and int(d["lv"]) > best_lv and d["grade"] != "epic":
				best = item_id
				best_lv = int(d["lv"])
		if best != "":
			var uid := Meta.add_item(best)
			Meta.find(uid)["enh"] = 2
			Meta.equip(cls, uid)
	for sid in ["sk_mp2", "sk_mp3", "ps_atk", "ps_atk", "ps_hp", "ps_hp", "ps_atk", "ps_hp"]:
		Meta.learn(cls, sid)
	var st := GameState.stats()
	print("[autotest] lv=%d hp=%d atk=%d def=%d" % [lv, st["hp"], st["atk"], st["def"]])


func _menu_tour() -> void:
	GameState.char_data()["lv"] = 5
	GameState.data["account"]["pets"] = ["pet_bookworm"]
	GameState.char_data()["pet"] = "pet_bookworm"
	Meta.add_item("eq_wpn_02")
	Meta.add_item("eq_top_03")
	Meta.learn("cls_silver", "sk_mp2")
	Meta.learn("cls_silver", "sk_mp3")
	var tour := ["title", "select", "town", "equip", "skills", "enhance", "shop", "pets", "missions", "options", "layout", "map", "room", "loading"]
	if dungeon_id != "dgn_01":
		tour = ["map"]
		for d in ["dgn_01", "dgn_02"]:
			GameState.data["progress"]["cleared"][d + ":normal"] = { "best_rank": "A", "best_time": 100.0 }
	for scr in tour:
		main.go(scr, { "sel": "i3" } if scr in ["equip", "enhance"] else ({ "dungeon": "dgn_01" } if scr in ["room", "loading"] else {}))
		await _frames(20)
		await shot("menu_" + scr)
	main.go("dungeon", { "dungeon": dungeon_id, "seed": 7 })


func _frames(n: int) -> void:
	for i in range(n):
		await get_tree().process_frame


func shot(name: String) -> void:
	if shots_dir == "":
		return
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png("%s/%s.png" % [shots_dir, name])
	print("[autotest] shot ", name)


func on_dungeon(r: DungeonRun) -> void:
	run = r
	r.finished.connect(func(_res): print("[autotest] used ", JSON.stringify(r.player.used)))
	run.player.god = god
	k = 0


func on_screen(screen: String, node: Node) -> void:
	if screen != "result":
		return
	print("[autotest] RESULT ", JSON.stringify(GameState.last_result if not GameState.last_result.is_empty() else {}))
	await _frames(10)
	# 보상 카드 한 장 뒤집기
	var cards := node.find_children("*", "Button", true, false)
	for c in cards:
		if (c as Button).text == "?":
			(c as Button).pressed.emit()
			break
	await _frames(10)
	await shot("result")
	print("[autotest] save: lv=%d gold=%d charge_fired=%d" % [GameState.char_data()["lv"], GameState.data["account"]["gold"], charge_fired])
	var errs := DataDB.errors.size()
	print("[autotest] DONE data_errors=%d" % errs)
	get_tree().quit(0 if errs == 0 else 2)


func _physics_process(_d: float) -> void:
	if run == null or not is_instance_valid(run):
		return
	_wall += 1
	if run.paused and run.overlay.get_child_count() > 0 and _wall % 30 == 0:
		var btns := run.overlay.find_children("*", "Button", true, false)
		for b in btns:
			if not (b as Button).disabled and ((b as Button).text.contains("부활") or (b as Button).text.contains("덮기")):
				print("[autotest] overlay -> ", (b as Button).text)
				(b as Button).pressed.emit()
				break
	if run.ticks > _deadline or _wall > _deadline * 2:
		print("[autotest] TIMEOUT stage=", run.stage_id)
		get_tree().quit(1)
	var marks := {
		"stage1_combat": run.stage_id.ends_with("_1") and run.ticks == 420,
		"stage2_branch": run.stage_id.ends_with("_2") and not run.portals.is_empty(),
		"boss": run.stage_id.ends_with("_boss") and run.ticks % 60 == 0 and run.boss() != null and run.boss().hp < run.boss().max_hp * 0.8 and run.boss().state == "atk",
		"guard": run.player.state == "guard" and run.player.t == 10,
		"rain": run.player.cur_atk_id == "atk_mp3" and run.player.state == "atk" and run.player.t == 62,
		"slash": run.projectiles.any(func(pr): return pr.kind == "slash" and pr.life == 62),
		"cutin": run.hud._cutin_t > 0 and run.hud._cutin_t < run.hud._cutin_max - 12,
	}
	for m in marks:
		if marks[m] and not _shot_marks.has(m):
			_shot_marks[m] = true
			shot(m)


func _bot_input() -> Dictionary:
	var f := InputRouter.empty_frame()
	if run == null or not is_instance_valid(run) or run.player == null:
		return f
	k += 1
	var p := run.player
	if p.dead:
		return f
	var target: Fighter = null
	var best := 1e9
	for e in run.enemies:
		if e.dead:
			continue
		var d: float = absf(e.position.x - p.position.x) + absf(e.position.y - p.position.y) * 1.5
		if d < best:
			best = d
			target = e
	if target == null:
		if not run.portals.is_empty():
			var lowest: Dictionary = run.portals[0]
			for po in run.portals:
				if (po["rect"] as Rect2).position.y > (lowest["rect"] as Rect2).position.y:
					lowest = po
			var dxp: float = (lowest["rect"] as Rect2).get_center().x - p.position.x
			f["x"] = int(signf(dxp))
		else:
			f["x"] = 1
		return f
	var dx: float = target.position.x - p.position.x
	var dy: float = target.position.y - p.position.y
	if absf(dx) > 22.0:
		f["x"] = int(signf(dx))
	elif p.state in ["idle", "run"] and signi(int(dx)) != p.facing and absf(dx) > 2.0:
		f["x"] = int(signf(dx))
	if dy < -28.0 and absf(dx) < 70.0 and k % 18 == 0:
		f["jump_p"] = true
	if dy > 30.0 and absf(dx) < 80.0 and k % 30 == 0 and p.on_ground:
		f["y"] = 1
		f["jump_p"] = true
	if absf(dx) < 36.0 and absf(dy) < 44.0 and k % 5 == 0:
		f["attack_p"] = true
	if p.charge_mode:
		# 원작식: 공격을 길게 눌렀다 떼서 필살기
		if p.mp >= 1.0 and absf(dx) < 60.0 and p.state in ["idle", "run"]:
			_hold += 1
			f["attack_p"] = false
			f["attack_h"] = _hold < 40
			if _hold >= 40:
				if p.charge_level() > 0:
					charge_fired += 1
				_hold = 0
			return f
		_hold = 0
	if only_skill > 0:
		if p.mp >= float(only_skill) and k % 40 == 0 and absf(dx) < 60.0:
			f["skill%d_p" % only_skill] = true
		return f
	if p.mp >= 3.0 and k % 10 == 0:
		f["skill3_p"] = true
	elif p.mp >= 2.0 and p.mp < 3.0 and k % 120 == 0:
		f["skill2_p"] = true
	elif p.mp >= 1.0 and p.mp < 2.0 and k % 200 == 0:
		f["skill1_p"] = true
	if p.hp < p.max_hp / 3 and k % 30 == 0:
		f["potion_p"] = true
	if p.is_hurt_state() and p.mp >= 1.5 and k % 25 == 0:
		f["dash_p"] = true
	return f
