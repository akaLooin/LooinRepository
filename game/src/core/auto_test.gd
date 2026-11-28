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
	var ci := args.find("--class")
	if ci >= 0:
		GameState.current_class = args[ci + 1]
		GameState.char_data()
	var di := args.find("--dungeon")
	if di >= 0:
		dungeon_id = args[di + 1]
	var li := args.find("--lv")
	if li >= 0:
		_gear_up(int(args[li + 1]))
	if args.has("--alltree"):
		# 스킬 트리 전체를 배운 상태로 (검증용)
		var cls0 := GameState.current_class
		for sid in Meta.tree(cls0):
			GameState.char_data(cls0)["skills"][sid] = int(Meta.tree(cls0)[sid]["max"])
	var lo := args.find("--loadout")
	if lo >= 0:
		GameState.char_data(GameState.current_class)["loadout"] = String(args[lo + 1]).split(",")
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
	for sid in ["sk_mp2", "sk_mp3", "ps_atk", "ps_atk", "ps_hp", "ps_hp", "ps_def", "ps_atk", "ps_hp", "ps_def"]:
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
	if shots_dir.contains("luminatabs"):
		GameState.current_class = "cls_lumina"
		GameState.char_data()["lv"] = 12
		for sid in ["sk_l_frost", "sk_l_bang", "sk_l_ring", "ps_l_atk", "ps_burn", "ps_swap", "ps_charge_spd", "ps_regen", "ps_shield", "ps_l_hp"]:
			Meta.learn("cls_lumina", sid)
		for tb in ["mp", "elem", "mana", "ward"]:
			main.go("skills", { "tab": tb })
			await _frames(20)
			await shot("lskills_" + tb)
		main.go("select")
		await _frames(20)
		await shot("select3")
		main.go("town")
		await _frames(30)
		await shot("town_lumina")
		get_tree().quit(0)
		return
	if shots_dir.contains("glenntabs"):
		GameState.current_class = "cls_glenn"
		GameState.char_data()["lv"] = 12
		for sid in ["sk_g_fan", "sk_g_trap", "sk_g_rain", "ps_g_atk", "ps_g_charge", "cb_multi", "ps_bash", "ps_far", "ps_stick", "ps_trap_pow", "ps_trap_radius"]:
			Meta.learn("cls_glenn", sid)
		for tb in ["mp", "shoot", "hunt", "trap"]:
			main.go("skills", { "tab": tb })
			await _frames(20)
			await shot("gskills_" + tb)
		main.go("select")
		await _frames(20)
		await shot("select2")
		main.go("town")
		await _frames(30)
		await shot("town_glenn")
		get_tree().quit(0)
		return
	if shots_dir.contains("skilltabs"):
		GameState.char_data()["lv"] = 12
		for sid in ["sk_rush", "sk_mp2", "sk_thrust", "cb_up", "cb_down", "ps_atk", "ps_atk", "ps_crit", "ps_hp", "ps_def", "ps_gold", "ps_goldpow", "ps_cut", "ps_mpgain"]:
			Meta.learn("cls_silver", sid)
		for tb in ["mp", "sword", "guard", "silver"]:
			main.go("skills", { "tab": tb })
			await _frames(20)
			await shot("skills_" + tb)
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
	r.finished.connect(func(_res): print("[autotest] used ", JSON.stringify(r.player.used), " buff_ok=", r.player.buff_t >= 0))
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
	if OS.get_cmdline_user_args().has("--trace") and run.ticks < 400 and run.ticks % 40 == 0:
		print("[t2] t=%d st=%s t=%d vel=%s on_ground=%s invuln=%d root=%d" % [run.ticks, run.player.state, run.player.t, run.player.vel, run.player.on_ground, run.player.invuln, run.player.root_t])
	if OS.get_cmdline_user_args().has("--trace") and run.ticks % 600 == 0:
		var al := run.enemies.filter(func(e): return not e.dead)
		print("[trace] t=%d p=%s st=%s mp=%.1f el=%s alive=%d %s" % [run.ticks, run.player.position, run.player.state, run.player.mp, run.player.elem(), al.size(),
			str(al.map(func(e): return "%s hp%d @%d,%d st=%s" % [e.mon_id, e.hp, e.position.x, e.position.y, e.state]))])
	if run.ticks > _deadline or _wall > _deadline * 2:
		print("[autotest] TIMEOUT stage=", run.stage_id)
		get_tree().quit(1)
	var marks := {
		"stage1_combat": run.stage_id.ends_with("_1") and run.ticks == 420,
		"stage2_branch": run.stage_id.ends_with("_2") and not run.portals.is_empty(),
		"boss": run.stage_id.ends_with("_boss") and run.ticks % 60 == 0 and run.boss() != null and run.boss().hp < run.boss().max_hp * 0.8 and run.boss().state == "atk",
		"guard": run.player.state == "guard" and run.player.t == 10,
		"orb": run.projectiles.filter(func(pr): return pr.kind == "orb").size() >= 2,
		"boom": run.fx_list.any(func(fx): return fx.kind == "ring" and fx.life == 10 and fx.color == Color("ffb347")),
		"trap": run.projectiles.any(func(pr): return pr.kind in ["trap", "spike"] and pr.life % 200 == 100),
		"arrows": run.projectiles.filter(func(pr): return pr.kind == "arrow").size() >= 3,
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
	if p.ranged:
		return _bot_ranged(f, p, target, dx, dy)
	if not p.elements.is_empty():
		if k % 300 == 0:
			f["element_p"] = true
		if dy < -30.0 and absf(dx) < 90.0 and p.on_ground and k % 8 == 0:
			f["y"] = -1
			f["attack_p"] = true
			return f
		# 가끔 영창: 공격을 길게 눌렀다 뗀다
		if k % 400 < 70 and absf(dx) > 60.0 and absf(dx) < 140.0 and only_skill == 0:
			f["attack_h"] = k % 400 < 66
			f["x"] = 0 if absf(dx) < 100.0 else int(signf(dx))
			return f
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
		# 배운 콤보 동작도 섞어 쓴다
		if p.on_ground and k % 45 == 0:
			f["y"] = -1
		elif not p.on_ground and k % 15 == 0:
			f["y"] = 1
	if p.state == "dash" and k % 3 == 0:
		f["attack_p"] = true
	if k % 140 == 0 and p.on_ground and absf(dx) < 80.0:
		f["dash_p"] = true
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


## 원거리 봇: 거리를 두고 적을 바라보며 쏜다. 위에 있으면 위로, 공중에서 아래면 아래로 조준.
func _bot_ranged(f: Dictionary, p: Player, target: Fighter, dx: float, dy: float) -> Dictionary:
	var adx := absf(dx)
	var want := int(signf(dx))
	if target is Boss and adx < 80.0 and p.on_ground:
		var cornered := p.position.x < 50.0 or p.position.x > float(run.width) - 50.0
		if cornered:
			# 벽에 몰리면 보스를 뛰어넘는다
			f["x"] = want
			f["jump_p"] = k % 10 == 0
			return f
		f["x"] = -want
		if k % 7 == 0 and p.facing == want:
			f["attack_p"] = true
		return f
	if adx < 46.0 and p.on_ground and k % 50 < 25 and target.state not in ["down", "getup"]:
		f["x"] = -want      # 물러서기
	elif adx > 170.0 or absf(dy) > 60.0:
		f["x"] = want
	elif p.facing != want and p.state in ["idle", "run"]:
		f["x"] = want        # 돌아보기
	if dy < -40.0 and adx < 90.0 and k % 20 == 0:
		f["jump_p"] = true
	if adx < 210.0 and k % 7 == 0:
		f["attack_p"] = true
		if dy < -24.0 and p.on_ground:
			f["y"] = -1
		elif dy > 20.0 and not p.on_ground:
			f["y"] = 1
	if k % 160 == 0 and adx < 40.0:
		f["dash_p"] = true
	if only_skill > 0:
		if p.mp >= float(only_skill) and k % 40 == 0 and adx < 160.0:
			f["skill%d_p" % only_skill] = true
		return f
	if p.mp >= 3.0 and k % 10 == 0 and adx < 200.0:
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
