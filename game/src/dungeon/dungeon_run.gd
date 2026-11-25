class_name DungeonRun
extends Node2D
## 던전 한 판: 스테이지(페이지) 로드, 웨이브 스폰, 판정, 카메라, 포탈 분기, 결과 계산.

signal finished(result: Dictionary)

const COMBO_TIMEOUT := 90

var dungeon_id := ""
var dungeon: Dictionary = {}
var difficulty := "normal"
var diff: Dictionary = { "hp": 1.0, "atk": 1.0, "reward": 1.0 }
var stage_id := ""
var stage: Dictionary = {}
var width := 900
var platforms: Array = []
var portals: Array = []          # [{rect, to}]
var player: Player
var pet: Pet = null
var enemies: Array = []
var projectiles: Array = []
var fx_list: Array = []
var wave := 0
var rng := RandomNumberGenerator.new()
var run_id := ""
var ticks := 0
var hits_taken := 0
var combo := 0
var combo_timer := 0
var max_combo := 0
var exp_gain := 0
var gold_gain := 0
var stage_path: Array = []
var total_pages := 1
var last_input: Dictionary = InputRouter.empty_frame()
var show_hitboxes := false
var paused := false
var ended := false
var _end_timer := -1
var _transition := 0
var _pending_stage := ""
var _shake := 0.0
var _freeze := 0
var _font: Font

var world_layer: Node2D
var bg: Node2D
var cam: Camera2D
var hud: Hud
var touch: TouchControls
var overlay: Control


func _ready() -> void:
	_font = ThemeDB.fallback_font


func start(dgn_id: String, seed_v: int = -1, diff_id: String = "normal") -> void:
	dungeon_id = dgn_id
	dungeon = DataDB.get_row("dungeons", dgn_id)
	difficulty = diff_id
	diff = dungeon.get("difficulties", {}).get(diff_id, diff)
	rng.seed = seed_v if seed_v >= 0 else int(Time.get_unix_time_from_system() * 1000.0) % 2147483647
	run_id = "%s-%d-%d" % [dgn_id, Time.get_unix_time_from_system(), rng.randi() % 100000]
	show_hitboxes = bool(GameState.data["settings"].get("show_hitboxes", false))

	bg = StageBackground.new()
	add_child(bg)
	world_layer = Node2D.new()
	add_child(world_layer)
	cam = Camera2D.new()
	cam.position = Vector2(240, 135)
	add_child(cam)
	cam.make_current()

	var ui := CanvasLayer.new()
	ui.layer = 10
	add_child(ui)
	hud = Hud.new()
	hud.run = self
	ui.add_child(hud)
	touch = TouchControls.new()
	ui.add_child(touch)
	var ts: String = GameState.data["settings"].get("show_touch", "auto")
	touch.visible = ts == "on" or (ts == "auto" and (DisplayServer.is_touchscreen_available() or OS.has_feature("mobile")))
	overlay = Control.new()
	overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui.add_child(overlay)

	player = Player.new()
	player.world = self
	var st := GameState.stats()
	player.setup(GameState.current_class, st)
	if st["pet"] != "":
		pet = Pet.new()
		pet.world = self
		pet.setup(st["pet"])
	total_pages = _longest_path(dungeon["first_stage"])
	_load_stage(dungeon["first_stage"])


func _load_stage(id: String) -> void:
	stage_id = id
	stage_path.append(id)
	stage = dungeon["stages"][id]
	width = int(stage["width"])
	for c in world_layer.get_children():
		world_layer.remove_child(c)
		if c != player and c != pet:
			c.queue_free()
	enemies.clear()
	projectiles.clear()
	fx_list.clear()
	platforms.clear()
	portals.clear()
	for p in stage["platforms"]:
		platforms.append({ "rect": Rect2(p[0], p[1], p[2], p[3]), "oneway": p[4] == "oneway" })
	bg.setup(self, stage)
	world_layer.add_child(player)
	player.position = Vector2(stage["spawn"][0], stage["spawn"][1])
	if pet:
		world_layer.add_child(pet)
		pet.position = player.position + Vector2(-16, -34)
	player.vel = Vector2.ZERO
	player.facing = 1
	if not player.dead:
		player.set_state("idle")
	wave = 0
	_spawn_wave()
	hud.show_title(stage["title"])
	var is_boss_stage: bool = stage["waves"].size() > 0 and DataDB.get_row("monsters", stage["waves"][0][0][0]).get("boss", false)
	Sfx.bgm("bgm_boss" if is_boss_stage else "bgm_dungeon")
	if is_boss_stage:
		Sfx.play("boss_roar", 0.0)
	if is_boss_stage:
		var dlg_id: String = dungeon.get("dialogs", {}).get("pre_boss", "")
		if dlg_id != "":
			var dlg := DialogBox.show_once(overlay, dlg_id, func(): paused = false)
			if dlg:
				paused = true
	cam.limit_left = 0
	cam.limit_right = width
	cam.limit_top = 0
	cam.limit_bottom = 270


func _spawn_wave() -> void:
	var waves: Array = stage["waves"]
	if wave >= waves.size():
		return
	for sp in waves[wave]:
		spawn_monster(sp[0], Vector2(sp[1], sp[2]))


func spawn_monster(id: String, at: Vector2) -> Enemy:
	var mon: Dictionary = DataDB.get_row("monsters", id)
	var e: Enemy
	match mon["ai"]:
		"boss_bell":
			e = BossBell.new()
		"boss_eel":
			e = BossEel.new()
		_:
			e = Boss.new() if mon.get("boss", false) else Enemy.new()
	e.world = self
	e.setup(id)
	var sc: Dictionary = dungeon.get("scale", {})
	var hp_scale := 1.0 if mon.get("boss", false) else float(sc.get("hp", 1.0))
	e.max_hp = int(e.max_hp * float(diff.get("hp", 1.0)) * hp_scale)
	e.atk *= float(sc.get("atk", 1.0))
	e.hp = e.max_hp
	e.atk *= float(diff.get("atk", 1.0))
	e.position = at
	e.invuln = 30
	world_layer.add_child(e)
	enemies.append(e)
	for i in range(6):
		spawn_spark(at + Vector2(0, -e.h / 2.0), Tk.M_INK_HI, 2.0)
	return e


func boss() -> Boss:
	for e in enemies:
		if e is BossEel and not e.dead:
			return e
	for e in enemies:
		if e is Boss and not e.dead:
			return e
	return null


func _physics_process(_delta: float) -> void:
	if paused or ended and _end_timer < 0:
		return
	tick_once(InputRouter.poll())


## 게임 한 틱. 자동 테스트도 이 함수를 그대로 쓴다.
func tick_once(input: Dictionary) -> void:
	last_input = input
	if input["pause_p"] and not ended:
		set_paused(true)
		return
	if _transition > 0:
		_transition -= 1
		hud.fade = clampf(1.0 - absf(_transition - 15) / 15.0, 0.0, 1.0)
		if _transition == 15:
			_load_stage(_pending_stage)
		return
	if _end_timer >= 0:
		_end_timer -= 1
		_tick_fx()
		if _end_timer < 0:
			_finish(true)
		return
	ticks += 1
	if combo_timer > 0:
		combo_timer -= 1
		if combo_timer == 0:
			combo = 0

	if _freeze > 0:
		_freeze -= 1
		player.tick(input)
	else:
		player.tick(input)
		if pet:
			pet.tick()
		for e in enemies:
			e.tick(last_input)
		for pr in projectiles:
			pr.tick()
	_resolve_hits()
	_cleanup()
	_tick_fx()
	_check_progress()
	_update_camera()
	touch.set_state(player.mp, int(GameState.data["account"]["potions"]), [player.skill_learned(0), player.skill_learned(1), player.skill_learned(2)])
	hud.queue_redraw()

	if player.dead and player.state == "dead" and player.t == 30 and overlay.get_child_count() == 0:
		_show_revive()


func _resolve_hits() -> void:
	var fighters: Array = [player]
	fighters.append_array(enemies)
	for f in fighters:
		var a: Dictionary = f.active_attack()
		if a.is_empty():
			continue
		var ar: Rect2 = f.attack_rect(a)
		for o in fighters:
			if o.team == f.team or o.dead or o.invuln > 0:
				continue
			if ar.intersects(o.hurtbox()) and f.can_hit(o):
				_apply_hit(f, o, a)
	# 투사체 베기: 플레이어의 공격 판정이 적 투사체에 닿으면 지운다
	var pa: Dictionary = player.active_attack()
	if player.cut_proj and not pa.is_empty():
		var par: Rect2 = player.attack_rect(pa)
		for pr in projectiles:
			if pr.team != 0 and pr.active() and not pr.remove_me and pr.kind != "bell" and par.intersects(pr.rect()):
				pr.remove_me = true
				for i in range(4):
					spawn_spark(pr.position, Tk.PAPER, 2.0)
	for pr in projectiles:
		if pr.remove_me or not pr.active():
			continue
		for o in fighters:
			if o.team == pr.team or o.dead or o.invuln > 0:
				continue
			if pr.rect().intersects(o.hurtbox()):
				if pr.pierce:
					if pr.hit_ids.has(o.get_instance_id()):
						continue
					pr.hit_ids[o.get_instance_id()] = true
					_apply_hit(pr.owner_f, o, pr.data, pr.position)
					continue
				_apply_hit(pr.owner_f, o, pr.data, pr.position)
				pr.remove_me = pr.kind != "wave"
				if pr.kind == "wave":
					o.invuln = maxi(o.invuln, 20)
				break


func _apply_hit(att: Fighter, o: Fighter, a: Dictionary, from_pos = null) -> void:
	var src: Vector2 = from_pos if from_pos != null else att.position
	var is_back := (o.facing > 0 and src.x < o.position.x - 1.0) or (o.facing < 0 and src.x > o.position.x + 1.0)
	if o is Boss:
		is_back = is_back and not o.is_attacking()
	if o == player and player.state == "guard":
		player.guard_trigger()
		return
	var mul := float(a["mul"])
	var gold := false
	if att == player and from_pos == null:
		mul *= player.attack_mul(player.cur_atk_id)
		gold = player.gold_attack
		if gold:
			mul *= player.gold_mul
	var eff_def := o.def * (1.0 - o.def_down) if o.def_down_t > 0 else o.def
	var res := DamageCalc.resolve(att.atk, eff_def, mul, att.crit, is_back, rng)
	if o == player and from_pos != null and player.ranged_cut > 0.0:
		res["dmg"] = maxi(1, int(res["dmg"] * (1.0 - player.ranged_cut)))
	if a.has("def_down") and o.team == 1:
		o.def_down = float(a["def_down"][0])
		o.def_down_t = int(a["def_down"][1])
		spawn_number(o.position + Vector2(0, -o.h - 14), "방어↓", Tk.MP)
	if att == player and from_pos == null and o.team == 1:
		player.on_landed_hit()
	if att == player and res["back"] and player.back_bonus > 0.0:
		res["dmg"] = int(res["dmg"] * (1.0 + player.back_bonus))
	o.take_hit(att, a, res)
	var hs := int(a["hitstop"])
	att.hitstop = maxi(att.hitstop, hs)
	o.hitstop = maxi(o.hitstop, hs)
	var col := Tk.TEXT
	if gold:
		col = Tk.GOLD
		for i in range(6):
			spawn_spark(Vector2(o.position.x, o.position.y - o.h / 2.0), Tk.GOLD, 2.0)
	elif res["crit"]:
		col = Tk.CRIT
	elif res["back"]:
		col = Tk.BACK_ATK
	Sfx.play("crit" if res["crit"] else ("hurt" if o == player else "hit"))
	if o.dead and o.team == 1:
		Sfx.play("enemy_die")
	if o == player:
		col = Tk.DANGER
		hits_taken += 1
		combo = 0
		shake(2.0)
	else:
		player.gain_mp(float(a.get("mp", 0.0)) * player.mp_gain_mul)
		combo += 1
		combo_timer = COMBO_TIMEOUT
		max_combo = maxi(max_combo, combo)
		if res["crit"]:
			shake(1.5)
	var label := str(res["dmg"])
	if res["crit"]:
		label += "!"
	spawn_number(o.position + Vector2(rng.randf_range(-6, 6), -o.h - 4), label, col)
	var mid := Vector2(o.position.x, o.position.y - o.h / 2.0)
	for i in range(4 if not res["crit"] else 8):
		spawn_spark(mid, Tk.M_INK_HI if o.team == 1 else Tk.DANGER, 2.0)
	if att == player and not a.has("hits") or att == player and int(a.get("hits", 1)) == 1:
		var sr := Rect2(mid.x - 10, mid.y - 2, 20, 4)
		_add_fx("slash", Vector2.ZERO, { "rect": sr, "color": Tk.PAPER, "life": 6 })
	if o.dead and o.team == 1:
		exp_gain += int(o.mon["exp"])
		gold_gain += int(o.mon["gold"])


func _cleanup() -> void:
	for e in enemies.duplicate():
		if e.remove_me:
			enemies.erase(e)
			e.queue_free()
	for pr in projectiles.duplicate():
		if pr.remove_me:
			projectiles.erase(pr)
			pr.queue_free()


func _check_progress() -> void:
	var alive := 0
	for e in enemies:
		if not e.dead:
			alive += 1
	if alive > 0:
		return
	var waves: Array = stage["waves"]
	if wave < waves.size() - 1:
		wave += 1
		_spawn_wave()
		return
	var nexts: Array = stage["next"]
	if nexts.is_empty():
		if _end_timer < 0 and not ended:
			ended = true
			_end_timer = 150
			Engine.time_scale = 1.0
			hud.banner_text("페이지 정화 완료!", Tk.GOLD, 150)
			Sfx.play("fanfare", 0.0)
		return
	if portals.is_empty():
		for n in nexts:
			portals.append({ "rect": Rect2(float(n[1]) - 10.0, float(n[2]) - 34.0, 20, 34), "to": n[0] })
		hud.banner_text("다음 페이지가 열렸다 →" if nexts.size() == 1 else "갈림길! 넘길 페이지를 고르자", Tk.GOLD, 120)
		bg.portals = portals
		Sfx.play("portal", 0.0)
	for p in portals:
		if (p["rect"] as Rect2).intersects(player.hurtbox()) and not player.dead:
			_pending_stage = p["to"]
			_transition = 30
			Sfx.play("page", 0.0)
			return


func _update_camera() -> void:
	var vw := get_viewport_rect().size.x
	var target_x := clampf(player.position.x + player.facing * 30.0, vw / 2.0, float(width) - vw / 2.0)
	if float(width) < vw:
		target_x = float(width) / 2.0
	cam.position.x = lerpf(cam.position.x, target_x, 0.12)
	cam.position.y = 135
	if _shake > 0.1:
		cam.offset = Vector2(rng.randf_range(-_shake, _shake), rng.randf_range(-_shake, _shake))
		_shake *= 0.85
	else:
		cam.offset = Vector2.ZERO
	bg.cam_x = cam.position.x


# ---------- 이벤트 (플레이어/보스가 호출) ----------

func on_skill(p: Player, sk: Dictionary, a: Dictionary) -> void:
	hud.banner_text(sk["name"], Tk.MP, 50)
	if sk.get("cutin", false):
		_freeze = int(a["startup"])
		hud.cutin(sk["name"], int(a["startup"]))
		shake(3.0)
	_add_fx("ring", p.position + Vector2(0, -12), { "size": 40.0 + 30.0 * float(sk["mp_cost"]), "color": Tk.MP, "life": 24 })


func on_counter(p: Player) -> void:
	Sfx.play("counter", 0.0)
	hud.banner_text("반격!", Tk.GOLD, 40)
	_add_fx("ring", p.position + Vector2(0, -12), { "size": 50.0, "color": Tk.GOLD, "life": 20 })


func shake(v: float) -> void:
	_shake = maxf(_shake, v)


func banner(text: String, col: Color) -> void:
	hud.banner_text(text, col, 90)


func spawn_projectile(owner_f: Fighter, at: Vector2, v: Vector2, data: Dictionary, kind: String) -> Projectile:
	var pr := Projectile.new()
	pr.world = self
	pr.owner_f = owner_f
	pr.team = owner_f.team
	pr.position = at
	pr.vel = v
	pr.data = data
	pr.kind = kind
	pr.size = Vector2(12, 14) if kind == "wave" else Vector2(6, 6)
	if kind == "page":
		pr.life = 90
	elif kind == "slash":
		pr.size = Vector2(12, 24)
		pr.life = 70
		pr.pierce = true
	elif kind == "sword":
		pr.size = Vector2(36, 40)
		pr.life = 120
		pr.pierce = true
	elif kind == "bell":
		pr.size = Vector2(16, 14)
		pr.life = 400
	elif kind == "orb":
		pr.size = Vector2(8, 8)
		pr.life = 300
	world_layer.add_child(pr)
	projectiles.append(pr)
	return pr


func spawn_number(at: Vector2, text: String, col: Color) -> void:
	_add_fx("number", at, { "text": text, "color": col, "life": 40, "vel": Vector2(0, -1.2) })


func spawn_spark(at: Vector2, col: Color, sz: float) -> void:
	_add_fx("spark", at, { "color": col, "size": sz, "life": 14 + rng.randi() % 8,
		"vel": Vector2(rng.randf_range(-2.2, 2.2), rng.randf_range(-2.6, 0.4)) })


func spawn_dust(at: Vector2, n: int) -> void:
	for i in range(n):
		_add_fx("dust", at + Vector2(rng.randf_range(-4, 4), -1), { "color": Tk.PAPER_DIM, "size": 2.0, "life": 14,
			"vel": Vector2(rng.randf_range(-0.6, 0.6), rng.randf_range(-0.5, -0.1)) })


func _add_fx(kind: String, at: Vector2, o: Dictionary) -> void:
	if fx_list.size() > 160:
		return
	var f := Fx.new()
	f.kind = kind
	f.position = at
	f.font = _font
	for k in o:
		f.set(k, o[k])
	f.max_life = f.life
	world_layer.add_child(f)
	fx_list.append(f)


func _tick_fx() -> void:
	for f in fx_list.duplicate():
		if f.tick():
			fx_list.erase(f)
			f.queue_free()


# ---------- 일시정지 / 부활 / 종료 ----------

func set_paused(v: bool) -> void:
	paused = v
	InputRouter.clear_touch()
	for c in overlay.get_children():
		c.queue_free()
	if not v:
		return
	var box := _overlay_box("일시정지")
	box.add_child(UiKit.button("계속하기", func(): set_paused(false), true))
	var hb_label := "판정 상자 숨기기" if show_hitboxes else "판정 상자 보기 (디버그)"
	box.add_child(UiKit.button(hb_label, func():
		show_hitboxes = not show_hitboxes
		GameState.data["settings"]["show_hitboxes"] = show_hitboxes
		set_paused(true)))
	box.add_child(UiKit.button("던전 포기", func():
		paused = false
		_finish(false)))


func _overlay_box(title: String) -> VBoxContainer:
	var dim := ColorRect.new()
	dim.color = Tk.OVERLAY
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	overlay.add_child(center)
	var panel := UiKit.panel()
	center.add_child(panel)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 6)
	box.custom_minimum_size = Vector2(170, 0)
	panel.add_child(box)
	var t := UiKit.label(title, Tk.GOLD, 11)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(t)
	return box


func _show_revive() -> void:
	paused = true
	var revives := int(GameState.data["account"]["revives"])
	var box := _overlay_box("쓰러졌다…")
	box.add_child(UiKit.label("부활의 책갈피: %d개" % revives, Tk.TEXT_DIM))
	var rb := UiKit.button("책갈피로 부활", func():
		GameState.data["account"]["revives"] = int(GameState.data["account"]["revives"]) - 1
		for c in overlay.get_children():
			c.queue_free()
		player.revive()
		paused = false, true)
	rb.disabled = revives <= 0
	box.add_child(rb)
	box.add_child(UiKit.button("책 덮기 (실패)", func():
		paused = false
		_finish(false)))
	if not rb.disabled:
		rb.grab_focus()


func _finish(cleared: bool) -> void:
	if ended and not cleared and _end_timer >= 0:
		return
	ended = true
	_end_timer = -1
	var t_sec := float(ticks) / 60.0
	var sc := RankCalc.score(t_sec, float(dungeon["time_par"]), hits_taken, max_combo) if cleared else 0
	var result := {
		"run_id": run_id, "dungeon": dungeon_id, "cleared": cleared,
		"time": snappedf(t_sec, 0.1), "hits_taken": hits_taken, "max_combo": max_combo,
		"score": sc, "rank": RankCalc.rank_of(sc) if cleared else "-",
		"difficulty": difficulty,
		"exp": int((exp_gain if cleared else exp_gain / 3) * float(diff.get("reward", 1.0))),
		"gold": int((gold_gain if cleared else gold_gain / 3) * float(diff.get("reward", 1.0))),
		"path": stage_path,
		"drops": Meta.roll_drops(_drop_table(), rng) if cleared else [],
		"pet": dungeon.get("first_clear_pet", "") if cleared else "",
	}
	finished.emit(result)


func _drop_table() -> Dictionary:
	var t: Dictionary = dungeon.get("drops", {}).duplicate()
	if diff.has("drop_rolls"):
		t["rolls"] = int(diff["drop_rolls"])
	return t


func _longest_path(st_id: String) -> int:
	var best := 0
	for n in dungeon["stages"][st_id]["next"]:
		best = maxi(best, _longest_path(n[0]))
	return best + 1


## 은빛 깃털비의 떨어지는 칼날 (연출)
func spawn_blade(x: float) -> void:
	_add_fx("blade", Vector2(x, cam.position.y - 150.0 + rng.randf_range(0, 30)), { "color": Color("f4f8fc"), "life": 26, "vel": Vector2(0, 9) })
