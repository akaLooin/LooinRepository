class_name Player
extends Fighter
## 플레이어 조작: 이동·점프·2단 점프·아래 점프·대시·지상 콤보·대시/공중 공격·MP 필살기·반격·포션.

const BUFFER := 8
const POTION_HEAL := 0.3
const MP_MAX := 3.0
const CHARGE_START := 24   # 공격 버튼을 이만큼(틱) 누르고 있으면 충전 시작

var cls: Dictionary = {}
var move: Dictionary = {}
var combo: Array = []
var combo_idx := 0
var mp := 0.0
var air_jumps_left := 0
var air_dash_used := false
var atk_buffer := 0
var potion_cd := 0
var god := false
var skill_name := ""
var skill_lv: Dictionary = {}
var skill_mul: Dictionary = {}
var mp_gain_mul := 1.0
var back_bonus := 0.0
var extra_air_jumps := 0
var charge_mode := false
var hold := 0
var _charge_fire := 0
var cut_proj := false
var ranged_cut := 0.0
var firm := false
var gold_need := 0          # 0 이면 금빛 일격 없음
var gold_mul := 1.0
var gold_count := 0
var gold_ready := false     # 다음 공격이 금빛
var gold_attack := false    # 지금 공격이 금빛
var cur_skill: Dictionary = {}
## 발동 횟수 기록 (자동 테스트 확인용)
var used := { "slash": 0, "guard_hit": 0, "guard_cancel": 0, "rain": 0, "gold": 0 }
var guard_frames := 0
var guard_refund := 0.0


func setup(class_id: String, st: Dictionary) -> void:
	team = 0
	cls = DataDB.get_row("classes", class_id)
	move = cls["move"]
	combo = cls["combo"]
	w = float(cls["size"][0])
	h = float(cls["size"][1])
	gravity = float(move["gravity"])
	max_hp = int(st["hp"])
	hp = max_hp
	atk = float(st["atk"])
	def = float(st["def"])
	crit = float(st["crit"])
	load_sprite(class_id)
	skill_lv = st.get("skills", {})
	skill_mul = st.get("skill_mul", {})
	mp_gain_mul = float(st.get("mp_gain_mul", 1.0))
	back_bonus = float(st.get("back_bonus", 0.0))
	extra_air_jumps = int(st.get("air_jumps", 0))
	charge_mode = bool(GameState.data["settings"].get("charge_attack", false))
	cut_proj = bool(st.get("cut_proj", false))
	ranged_cut = float(st.get("ranged_cut", 0.0))
	firm = bool(st.get("firm", false))
	if cls.has("gold"):
		gold_need = maxi(3, int(cls["gold"]["hits"]) + int(st.get("gold_hits", 0)))
		gold_mul = float(cls["gold"]["mul"])


## 근접 공격이 적에게 맞을 때마다 호출: 금빛 일격 게이지를 채운다.
func on_landed_hit() -> void:
	if gold_need <= 0 or gold_attack or gold_ready:
		return
	gold_count += 1
	if gold_count >= gold_need:
		gold_count = 0
		gold_ready = true
		Sfx.play("portal", 0.0)


## 은빛 수호 자세 중 공격을 받았을 때: 피해 없이 충격파로 되받아친다.
func guard_trigger() -> void:
	invuln = 50
	used["guard_hit"] += 1
	world.banner("은빛 수호!", Tk.GOLD)
	world.shake(4.0)
	Sfx.play("counter", 0.0)
	start_attack(cur_skill["attack"], _atk(cur_skill["attack"]))


func air_jumps() -> int:
	return int(move["air_jumps"]) + extra_air_jumps


func skill_learned(i: int) -> bool:
	return int(skill_lv.get(cls["skills"][i], 0)) > 0


func attack_mul(atk_id: String) -> float:
	return float(skill_mul.get(atk_id, 1.0))


func start_attack(id: String, data: Dictionary) -> void:
	super.start_attack(id, data)
	gold_attack = false
	if not id.begins_with("atk_mp") and id != "atk_counter":
		Sfx.play("slash")
		if gold_ready:
			gold_ready = false
			gold_attack = true
			used["gold"] += 1


func gain_mp(v: float) -> void:
	mp = clampf(mp + v, 0.0, MP_MAX)


func _atk(id: String) -> Dictionary:
	return DataDB.get_row("attacks", id)


## 충전 중이면 지금 놓았을 때 나갈 필살기 단계(0 = 없음)
func charge_level() -> int:
	if not charge_mode or hold < CHARGE_START:
		return 0
	var lvl := mini(int(mp), 3)
	while lvl > 0 and not skill_learned(lvl - 1):
		lvl -= 1
	return lvl


func think(f: Dictionary) -> void:
	_charge_fire = 0
	if charge_mode:
		if f["attack_h"]:
			hold += 1
		else:
			if hold >= CHARGE_START:
				_charge_fire = charge_level()
			hold = 0
	if f["attack_p"]:
		atk_buffer = BUFFER
	elif atk_buffer > 0:
		atk_buffer -= 1
	if potion_cd > 0:
		potion_cd -= 1
	if f["potion_p"] and potion_cd == 0:
		_use_potion()
	match state:
		"idle", "run":
			_ground(f)
		"air":
			_air(f)
		"dash":
			_dash(f)
		"atk":
			_attacking(f)
		"guard":
			vel.x = 0.0
			if t >= guard_frames:
				gain_mp(guard_refund)
				used["guard_cancel"] += 1
				world.banner("수호 취소 — MP 일부 회수", Tk.TEXT_DIM)
				set_state("idle" if on_ground else "air")


func _tick_common_states() -> bool:
	# 반격: 맞고 있는 중 MP 1칸으로 대시 버튼 → 주변을 밀쳐내며 탈출
	if state in ["hurt", "air_hurt"] and not dead and mp >= 1.0 and world.last_input.get("dash_p", false):
		mp -= 1.0
		invuln = 40
		vel = Vector2.ZERO
		skill_name = "반격"
		world.on_counter(self)
		start_attack("atk_counter", _atk("atk_counter"))
		return false
	return super._tick_common_states()


func _try_skill(f: Dictionary) -> bool:
	var skills: Array = cls["skills"]
	for i in range(3):
		if (f["skill%d_p" % (i + 1)] or _charge_fire == i + 1) and skill_learned(i):
			var sk: Dictionary = DataDB.get_row("skills", skills[i])
			if mp >= float(sk["mp_cost"]):
				mp -= float(sk["mp_cost"])
				invuln = int(sk["invuln"])
				skill_name = sk["name"]
				vel = Vector2.ZERO
				cur_skill = sk
				if sk.has("guard"):
					guard_frames = int(sk["guard"]["frames"])
					guard_refund = float(sk["guard"]["refund"])
					set_state("guard")
					world.on_skill(self, sk, {})
					Sfx.play("skill", 0.0)
					return true
				var a := _atk(sk["attack"])
				start_attack(sk["attack"], a)
				Sfx.play("skill3" if sk.get("cutin", false) else "skill", 0.0)
				world.on_skill(self, sk, a)
				return true
	return false


func _ground(f: Dictionary) -> void:
	if not on_ground:
		set_state("air")
		air_jumps_left = air_jumps()
		return
	air_dash_used = false
	if _try_skill(f):
		return
	if f["jump_p"] and f["y"] > 0 and standing_on_oneway():
		drop_timer = 12
		position.y += 2.0
		set_state("air")
		air_jumps_left = air_jumps()
		return
	if f["jump_p"]:
		vel.y = -float(move["jump"])
		on_ground = false
		air_jumps_left = air_jumps()
		set_state("air")
		Sfx.play("jump")
		return
	if f["dash_p"]:
		_start_dash(f)
		return
	if atk_buffer > 0:
		atk_buffer = 0
		combo_idx = 0
		start_attack(combo[0], _atk(combo[0]))
		return
	vel.x = float(f["x"]) * float(move["run"])
	if f["x"] != 0:
		facing = f["x"]
		if state != "run":
			set_state("run")
	elif state != "idle":
		set_state("idle")


func _air(f: Dictionary) -> void:
	if on_ground and t > 1:
		set_state("idle")
		return
	if _try_skill(f):
		return
	vel.x = float(f["x"]) * float(move["run"])
	if f["x"] != 0:
		facing = f["x"]
	if f["jump_p"] and air_jumps_left > 0:
		air_jumps_left -= 1
		vel.y = -float(move["jump"]) * 0.88
		world.spawn_dust(position, 2)
		Sfx.play("jump")
	elif f["dash_p"] and not air_dash_used:
		air_dash_used = true
		_start_dash(f)
	elif atk_buffer > 0:
		atk_buffer = 0
		start_attack(cls["air_attack"], _atk(cls["air_attack"]))


func _start_dash(f: Dictionary) -> void:
	if f["x"] != 0:
		facing = f["x"]
	set_state("dash")
	vel = Vector2(facing * float(move["dash"]), 0.0)
	world.spawn_dust(position, 3)
	Sfx.play("dash")


func _dash(f: Dictionary) -> void:
	vel.x = facing * float(move["dash"]) * (1.0 - float(t) / float(move["dash_frames"]) * 0.4)
	if not on_ground:
		vel.y = minf(vel.y, 0.6)   # 공중 대시는 잠깐 수평 유지
	if atk_buffer > 0:
		atk_buffer = 0
		start_attack(cls["dash_attack"], _atk(cls["dash_attack"]))
		return
	if f["jump_p"] and on_ground:
		vel.y = -float(move["jump"])
		on_ground = false
		air_jumps_left = air_jumps()
		set_state("air")
		return
	if t >= int(move["dash_frames"]):
		set_state("idle" if on_ground else "air")


func _attacking(f: Dictionary) -> void:
	var a := cur_atk
	var startup := int(a["startup"])
	if not cur_skill.is_empty() and cur_atk_id == cur_skill.get("attack", ""):
		if cur_skill.has("projectile") and t == startup:
			var pd: Dictionary = (cur_skill["projectile"] as Dictionary).duplicate()
			pd["mul"] = float(pd["mul"]) * attack_mul(cur_atk_id)
			pd["mp"] = 0.0
			world.spawn_projectile(self, position + Vector2(facing * 14, 0), Vector2(facing * float(pd["speed"]), 0), pd, pd["kind"])
			Sfx.play("slash", 0.0)
			used["slash"] += 1
		if cur_skill.has("rain"):
			var act := int(a["active"])
			if t >= startup and t < startup + act and t % 3 == 0:
				world.spawn_blade(position.x + randf_range(-115, 115))
			if t == startup + act:
				var sw: Projectile = world.spawn_projectile(self, Vector2(position.x + facing * 26, -30), Vector2(0, 7),
					{ "mul": float(cur_skill["rain"]["sword_mul"]) * attack_mul(cur_atk_id), "hitstop": 10, "hitstun": 40,
					"kb": [3.0, 0.0], "launch": 5.0, "mp": 0.0 }, "sword")
				sw.gravity = 0.4
				used["rain"] += 1
	var lunge := float(a.get("lunge", 0.0))
	if cur_atk_id == cls["air_attack"]:
		vel.x = float(f["x"]) * float(move["run"]) * 0.6
		if on_ground and t > 2:
			set_state("idle")
			return
	elif t <= startup + 2 and lunge > 0.0:
		vel.x = facing * lunge
	else:
		vel.x *= 0.75
	var total := atk_total(a)
	var is_combo := combo.has(cur_atk_id)
	if t >= int(a["cancel"]):
		if is_combo and atk_buffer > 0 and combo_idx < combo.size() - 1:
			atk_buffer = 0
			combo_idx += 1
			if f["x"] != 0:
				facing = f["x"]
			start_attack(combo[combo_idx], _atk(combo[combo_idx]))
			return
		if f["dash_p"] and on_ground:
			_start_dash(f)
			return
		if f["jump_p"] and on_ground:
			vel.y = -float(move["jump"])
			on_ground = false
			air_jumps_left = air_jumps()
			set_state("air")
			return
		if _try_skill(f):
			return
	if t >= total:
		cur_atk = {}
		set_state("idle" if on_ground else "air")
		air_jumps_left = 0 if not on_ground else air_jumps_left


func _use_potion() -> void:
	var acc: Dictionary = GameState.data["account"]
	if int(acc["potions"]) <= 0 or hp >= max_hp or dead:
		return
	acc["potions"] = int(acc["potions"]) - 1
	var heal := int(max_hp * POTION_HEAL)
	hp = mini(max_hp, hp + heal)
	potion_cd = 60
	Sfx.play("potion", 0.0)
	world.spawn_number(position + Vector2(0, -h - 4), "+%d" % heal, Tk.HEAL)


func take_hit(attacker: Fighter, a: Dictionary, res: Dictionary) -> void:
	super_armor = firm and state == "atk" and (cur_atk_id == combo[combo.size() - 1] or cur_atk_id.begins_with("atk_mp"))
	if god:
		res = res.duplicate()
		res["dmg"] = 0
	super.take_hit(attacker, a, res)
	gain_mp(0.03)


func revive() -> void:
	dead = false
	hp = max_hp
	invuln = 150
	vel = Vector2.ZERO
	set_state("idle")


# ---------- 그리기: 견습 사서 (임시 캐릭터) ----------

func _draw() -> void:
	if invuln > 0 and state not in ["down", "getup"] and (t / 3) % 2 == 0 and invuln < 140:
		modulate.a = 0.55
	else:
		modulate.a = 1.0
	if state == "guard":
		var gr := 16.0 + sin(t * 0.4) * 2.0
		draw_arc(Vector2(0, -14), gr, 0, TAU, 24, Color("dfe6ee", 0.9), 2.0)
		draw_arc(Vector2(0, -14), gr - 4, 0, TAU, 24, Color(Tk.MP, 0.5), 1.0)
	if gold_ready or gold_attack:
		for i in range(4):
			var ga := t * 0.15 + i * PI / 2.0
			draw_rect(Rect2(cos(ga) * 12.0 - 1, -14 + sin(ga) * 14.0 - 1, 2, 2), Tk.GOLD)
	if draw_sprite():
		var cl0 := charge_level()
		if hold >= CHARGE_START:
			for i in range(3):
				draw_rect(Rect2(-7 + i * 5, -36, 4, 3), Tk.MP if i < cl0 else Color(Tk.TEXT_DIM, 0.5))
		draw_debug_boxes()
		return
	var run_phase := (t / 6) % 2
	match state:
		"down", "dead":
			px(-13, -6, 26, 6, Tk.P_COAT)
			px(9, -8, 6, 6, Tk.P_SKIN)
			px(9, -9, 6, 2, Tk.P_HAIR)
			draw_debug_boxes()
			return
	var crouch := 2.0 if state in ["getup", "hurt"] else 0.0
	# 다리
	if state == "run":
		if run_phase == 0:
			px(-4, -6, 3, 6, Tk.P_COAT_DARK)
			px(2, -6, 3, 5, Tk.P_COAT_DARK)
		else:
			px(-5, -6, 3, 5, Tk.P_COAT_DARK)
			px(1, -6, 3, 6, Tk.P_COAT_DARK)
	elif state == "air":
		px(-4, -7, 3, 5, Tk.P_COAT_DARK)
		px(1, -8, 3, 5, Tk.P_COAT_DARK)
	else:
		px(-4, -6, 3, 6, Tk.P_COAT_DARK)
		px(1, -6, 3, 6, Tk.P_COAT_DARK)
	# 외투(몸)
	px(-6, -19 + crouch, 12, 13 - crouch, Tk.P_COAT)
	px(-6, -8, 12, 2, Tk.P_COAT_DARK)
	# 스카프
	px(-5, -20 + crouch, 10, 3, Tk.P_SCARF)
	var scarf_tail := -9 if state in ["run", "dash"] else -7
	px(scarf_tail, -19 + crouch, 3, 2, Tk.P_SCARF)
	# 머리
	px(-4, -27 + crouch, 8, 7, Tk.P_SKIN)
	px(-5, -28 + crouch, 10, 3, Tk.P_HAIR)
	px(-5, -26 + crouch, 2, 4, Tk.P_HAIR)
	px(2, -24 + crouch, 1, 2, Tk.INK)
	# 무기: 리본 달린 책갈피 검
	_draw_blade(crouch)
	var cl := charge_level()
	if hold >= CHARGE_START:
		for i in range(3):
			var col := Tk.MP if i < cl else Color(Tk.TEXT_DIM, 0.5)
			draw_rect(Rect2(-7 + i * 5, -36, 4, 3), col)
	draw_debug_boxes()


func _draw_blade(crouch: float) -> void:
	var swing := -1
	if state == "atk" and not cur_atk.is_empty():
		var s := int(cur_atk["startup"])
		swing = 0 if t < s else (1 if t < s + int(cur_atk["active"]) else 2)
	if state == "dash":
		swing = 2
	match swing:
		0:  # 들어올림
			px(-8, -34 + crouch, 3, 14, Tk.P_BLADE)
			px(-9, -36 + crouch, 3, 3, Tk.P_RIBBON)
		1:  # 휘두르는 중
			px(5, -18 + crouch, 18, 3, Tk.P_BLADE)
			px(22, -19 + crouch, 2, 5, Tk.P_BLADE)
			px(3, -16 + crouch, 3, 4, Tk.P_RIBBON)
		2:  # 내려벤 뒤
			px(5, -12 + crouch, 14, 3, Tk.P_BLADE)
			px(3, -11 + crouch, 3, 4, Tk.P_RIBBON)
		_:
			px(5, -22 + crouch, 3, 13, Tk.P_BLADE)
			px(4, -11 + crouch, 5, 2, Tk.LEATHER)
			px(8, -12 + crouch, 2, 5, Tk.P_RIBBON)
