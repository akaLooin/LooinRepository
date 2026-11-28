class_name Player
extends Fighter
## 플레이어 조작: 이동·점프·아래 점프·대시·지상 콤보·대시/공중 공격·콤보 변형(올려베기·내려찍기·5타·돌진 연격)·
## MP 필살기(칸마다 장착한 1개)·반격·포션. 패시브 효과는 GameState.stats()["fx"] 로 들어온다.

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
var air_atks := 0
var atk_buffer := 0
var potion_cd := 0
var god := false
var skill_name := ""
var skill_lv: Dictionary = {}
var skill_mul: Dictionary = {}
var loadout: Array = []
var fx: Dictionary = {}
var mp_gain_mul := 1.0
var back_bonus := 0.0
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
var guard_frames := 0
var guard_refund := 0.0
var buff_t := 0             # 기사단의 맹세 남은 틱
var buff: Dictionary = {}
var afterglow_t := 0
var last_stand_ready := false
## 원거리(활) 캐릭터
var ranged := false
var stack_max := 0
var stack_pct := 0.0
var base_crit := 0.0
var shot_hold := 0
## 원소 마법사
const ELEM_COL := { "fire": Color("ff7a3c"), "ice": Color("9fd8ff"), "bolt": Color("ffe76a") }
const ELEM_NAME := { "fire": "불", "ice": "얼음", "bolt": "번개" }
var elements: Array = []
var elem_i := 0
var swap_t := 0
var shield := 0.0
var shield_max := 0.0
var no_hit_t := 0
var auto_shield_ready := false
var cast_hold := 0
## 발동 횟수 기록 (자동 테스트 확인용)
var used: Dictionary = {}


func setup(class_id: String, st: Dictionary) -> void:
	team = 0
	cls = DataDB.get_row("classes", class_id)
	move = cls["move"]
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
	loadout = st.get("loadout", cls["skills"])
	fx = st.get("fx", {})
	mp_gain_mul = float(st.get("mp_gain_mul", 1.0))
	back_bonus = float(st.get("back_bonus", 0.0))
	charge_mode = bool(GameState.data["settings"].get("charge_attack", false))
	cut_proj = _fx("cut_proj") > 0.0
	ranged_cut = minf(0.6, _fx("ranged_cut"))
	firm = _fx("firm") > 0.0
	last_stand_ready = _fx("last_stand") > 0.0
	if _fx("getup_fast") > 0.0:
		down_len = 22
		getup_len = 10
	ranged = cls.has("ranged")
	base_crit = crit
	if ranged:
		stack_max = int(cls["ranged"]["stack_max"]) + int(_fx("stick"))
		stack_pct = float(cls["ranged"]["stack_pct"]) + 0.02 * _fx("stick")
	elements = cls.get("elements", [])
	shield_max = max_hp * (float(cls.get("shield_base", 0.0)) + _fx("shield_pct"))
	shield = shield_max
	auto_shield_ready = _fx("auto_shield") > 0.0
	combo = (cls["combo"] as Array).duplicate()
	if _fx("rapid") > 0.0:
		combo.append(combo[0])
	if _fx("move_combo5") > 0.0:
		combo.append(cls["moves"]["combo5"])
	if cls.has("gold"):
		gold_need = maxi(3, int(cls["gold"]["hits"]) + int(_fx("gold_hits")))
		gold_mul = float(cls["gold"]["mul"]) + _fx("gold_mul_add")


func elem() -> String:
	return elements[elem_i] if not elements.is_empty() else ""


## 지금 원소의 공격 배율 (원소 체인지 버프 + 원소 버프)
func elem_mul() -> float:
	var m := 1.0
	if swap_t > 0:
		m += _fx("swap_buff")
	if _fx("elem_buff") > 0.0 and elem() == "fire":
		m += 0.08
	return m


func _fx(k: String) -> float:
	return float(fx.get(k, 0.0))


func _count(k: String) -> void:
	used[k] = int(used.get(k, 0)) + 1


func _cur_gold_need() -> int:
	return int(buff["gold_need"]) if buff_t > 0 and buff.has("gold_need") else gold_need


## 근접 공격이 적에게 맞을 때마다 호출: 금빛 일격 게이지를 채운다.
func on_landed_hit() -> void:
	if gold_need <= 0 or gold_attack or gold_ready:
		return
	gold_count += 1
	if gold_count >= _cur_gold_need():
		gold_count = 0
		gold_ready = true
		Sfx.play("portal", 0.0)


## 은빛 수호 자세 중 공격을 받았을 때: 피해 없이 충격파로 되받아친다.
func guard_trigger() -> void:
	invuln = 50
	_count("guard_hit")
	world.banner("은빛 수호!", Tk.GOLD)
	world.shake(4.0)
	Sfx.play("counter", 0.0)
	start_attack(cur_skill["attack"], _atk(cur_skill["attack"]))


func air_jumps() -> int:
	return int(move["air_jumps"]) + int(_fx("air_jumps"))


## MP 칸(0~2)에 장착된 필살기를 배웠는가
func skill_learned(i: int) -> bool:
	return i < loadout.size() and int(skill_lv.get(loadout[i], 0)) > 0


func attack_mul(atk_id: String) -> float:
	var m := float(skill_mul.get(atk_id, 1.0))
	if buff_t > 0:
		m *= 1.0 + float(buff.get("atk_pct", 0.0))
	return m


func start_attack(id: String, data: Dictionary) -> void:
	super.start_attack(id, data)
	gold_attack = false
	if not id.begins_with("atk_mp") and not _is_skill_attack(id) and id != "atk_counter":
		Sfx.play("slash")
		if gold_ready:
			gold_ready = false
			gold_attack = true
			_count("gold")
			if _fx("gold_wave") > 0.0:
				world.spawn_projectile(self, position + Vector2(facing * 12, 0), Vector2(facing * 4.5, 0),
					{ "mul": 1.4 * attack_mul(""), "hitstop": 5, "hitstun": 24, "kb": [2.0, 0.0], "launch": 0.0, "mp": 0.0 }, "goldslash")
				_count("goldwave")


func _is_skill_attack(id: String) -> bool:
	for sid in loadout:
		if DataDB.get_row("skills", sid).get("attack", "") == id:
			return true
	return false


func gain_mp(v: float) -> void:
	mp = clampf(mp + v, 0.0, MP_MAX)


func _atk(id: String) -> Dictionary:
	return DataDB.get_row("attacks", id)


## 루미나 영창 단계 (0 = 아직)
func cast_level() -> int:
	if not cls.has("charge"):
		return 0
	var lv := 0
	var spd := 1.0 + _fx("charge_spd")
	for need in cls["charge"]["levels"]:
		if cast_hold * spd >= float(need):
			lv += 1
	return lv


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
	if buff_t > 0:
		buff_t -= 1
		super_armor = bool(buff.get("armor", false))
		if buff_t == 0:
			super_armor = false
			world.banner("강화 효과가 끝났다", Tk.TEXT_DIM)
	if afterglow_t > 0:
		afterglow_t -= 1
	if charge_mode:
		if f["attack_h"]:
			hold += 1
		else:
			if hold >= CHARGE_START:
				_charge_fire = charge_level()
			hold = 0
	if buff_t > 0:
		crit = base_crit + float(buff.get("crit_add", 0.0))
	else:
		crit = base_crit
	if not elements.is_empty():
		if f.get("element_p", false):
			elem_i = (elem_i + 1) % elements.size()
			swap_t = 180 if _fx("swap_buff") > 0.0 else 0
			world.banner("원소: %s" % ELEM_NAME[elem()], ELEM_COL[elem()])
			Sfx.play("portal", 0.0)
			_count("swap")
		if swap_t > 0:
			swap_t -= 1
		if _fx("mp_regen") > 0.0:
			gain_mp(_fx("mp_regen") / 60.0)
		no_hit_t += 1
		if shield_max > 0.0 and no_hit_t > 300 and shield < shield_max:
			shield = minf(shield_max, shield + shield_max / 120.0)
		if cls.has("charge") and not charge_mode:
			# 인내한 만큼 강한 마법: 누르고 있으면 마법진이 커지고, 떼면 그 단계의 원소 마법
			if f["attack_h"]:
				cast_hold += 1
			else:
				var lv := cast_level()
				if lv > 0 and not dead and state in ["idle", "run", "atk", "air"]:
					var cid: String = cls["charge"]["attacks"][lv - 1]
					_count("cast%d" % lv)
					start_attack(cid, _atk(cid))
				cast_hold = 0
	if ranged and not charge_mode:
		# 차지 샷: 공격을 누르고 있다가 떼면 관통 화살
		if f["attack_h"]:
			shot_hold += 1
		else:
			if shot_hold >= int(cls["ranged"]["charge_frames"]) and not dead and state in ["idle", "run", "atk", "air"]:
				_count("charge")
				var cid: String = cls["moves"]["charge"]
				start_attack(cid, _atk(cid))
			shot_hold = 0
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
				_count("guard_cancel")
				world.banner("수호 취소 — MP 일부 회수", Tk.TEXT_DIM)
				set_state("idle" if on_ground else "air")


func _tick_common_states() -> bool:
	# 반격: 맞고 있는 중 MP로 대시 버튼 → 주변을 밀쳐내며 탈출
	var cost := 0.5 if _fx("counter_cost") > 0.0 else 1.0
	if state in ["hurt", "air_hurt"] and not dead and mp >= cost and world.last_input.get("dash_p", false):
		mp -= cost
		invuln = 40
		vel = Vector2.ZERO
		skill_name = "반격"
		world.on_counter(self)
		start_attack("atk_counter", _atk("atk_counter"))
		return false
	return super._tick_common_states()


func _try_skill(f: Dictionary) -> bool:
	for i in range(3):
		if (f["skill%d_p" % (i + 1)] or _charge_fire == i + 1) and skill_learned(i):
			var sk: Dictionary = DataDB.get_row("skills", loadout[i])
			if mp < float(sk["mp_cost"]):
				continue
			mp -= float(sk["mp_cost"])
			invuln = int(sk["invuln"])
			skill_name = sk["name"]
			vel = Vector2.ZERO
			cur_skill = sk
			afterglow_t = 120
			_count(loadout[i])
			if sk.has("guard"):
				guard_frames = int(sk["guard"]["frames"])
				guard_refund = float(sk["guard"]["refund"])
				set_state("guard")
				world.on_skill(self, sk, {})
				Sfx.play("skill", 0.0)
				return true
			var a := _atk(sk["attack"])
			start_attack(sk["attack"], a)
			if sk.has("leap"):
				vel.y = -float(sk["leap"])
				on_ground = false
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
	air_atks = 0
	if _try_skill(f):
		return
	if f["jump_p"] and f["y"] > 0 and standing_on_oneway():
		drop_timer = 12
		position.y += 2.0
		set_state("air")
		air_jumps_left = air_jumps()
		return
	if f["jump_p"]:
		_jump()
		return
	if f["dash_p"]:
		_start_dash(f)
		return
	if atk_buffer > 0 and ranged:
		atk_buffer = 0
		if _fx("bash") > 0.0 and world.enemy_near(self, 26.0):
			_count("bash")
			start_attack(cls["moves"]["bash"], _atk(cls["moves"]["bash"]))
			return
		combo_idx = 0
		if f["x"] != 0:
			facing = f["x"]
		var sid: String = cls["moves"]["aim_up"] if f["y"] < 0 else combo[0]
		if f["y"] < 0:
			_count("aim_up")
		start_attack(sid, _atk(sid))
		return
	if atk_buffer > 0 and not elements.is_empty() and f["y"] < 0 and cls["moves"].has("aim_up"):
		atk_buffer = 0
		_count("aim_up")
		start_attack(cls["moves"]["aim_up"], _atk(cls["moves"]["aim_up"]))
		return
	if atk_buffer > 0:
		atk_buffer = 0
		if f["y"] < 0 and _fx("move_up") > 0.0:
			_count("up")
			start_attack(cls["moves"]["up"], _atk(cls["moves"]["up"]))
			return
		combo_idx = 0
		start_attack(combo[0], _atk(combo[0]))
		return
	vel.x = float(f["x"]) * float(move["run"]) * (1.1 if _fx("elem_buff") > 0.0 and elem() == "bolt" else 1.0)
	if f["x"] != 0:
		facing = f["x"]
		if state != "run":
			set_state("run")
	elif state != "idle":
		set_state("idle")


func _jump() -> void:
	vel.y = -float(move["jump"])
	on_ground = false
	air_jumps_left = air_jumps()
	air_atks = 0
	set_state("air")
	Sfx.play("jump")


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
		if ranged and f["y"] > 0:
			_count("aim_down")
			start_attack(cls["moves"]["aim_down"], _atk(cls["moves"]["aim_down"]))
			return
		if f["y"] > 0 and _fx("move_down") > 0.0:
			_count("down")
			start_attack(cls["moves"]["dive"], _atk(cls["moves"]["dive"]))
			return
		var max_air := 2 if _fx("air_chain") > 0.0 else 1
		if air_atks < max_air:
			air_atks += 1
			start_attack(cls["air_attack"], _atk(cls["air_attack"]))


func _start_dash(f: Dictionary) -> void:
	if f["x"] != 0:
		facing = f["x"]
	if move.has("blink"):
		var dist := float(move["blink"]) * (1.4 if _fx("blink_up") > 0.0 else 1.0)
		world.spawn_dust(position, 4)
		position.x = clampf(position.x + facing * dist, w, float(world.width) - w)
		invuln = maxi(invuln, 24 if _fx("blink_up") > 0.0 else 12)
		world.spawn_dust(position, 4)
		Sfx.play("portal", 0.1)
		_count("blink")
		set_state("dash")
		vel = Vector2.ZERO
		return
	set_state("dash")
	vel = Vector2(facing * float(move["dash"]) * (1.25 if _fx("dodge") > 0.0 else 1.0), 0.0)
	world.spawn_dust(position, 3)
	Sfx.play("dash")


func _dash(f: Dictionary) -> void:
	vel.x = facing * float(move["dash"]) * (1.0 - float(t) / float(move["dash_frames"]) * 0.4)
	if move.has("blink"):
		vel.x = 0.0
	if not on_ground:
		vel.y = minf(vel.y, 0.6)   # 공중 대시는 잠깐 수평 유지
	if atk_buffer > 0:
		atk_buffer = 0
		start_attack(cls["dash_attack"], _atk(cls["dash_attack"]))
		if ranged and _fx("dodge") > 0.0:
			invuln = maxi(invuln, 14)
		return
	if f["jump_p"] and on_ground:
		_jump()
		return
	if t >= int(move["dash_frames"]):
		set_state("idle" if on_ground else "air")


## 화살 한 발. ang = 화면 기준 각도(0 = 정면, 음수 = 위), 바라보는 방향으로 뒤집는다.
func fire_arrow(ang: float, ad: Dictionary, kind: String = "arrow", from: Vector2 = Vector2.INF) -> Projectile:
	var r := deg_to_rad(ang)
	var dir := Vector2(cos(r) * facing, sin(r))
	var d := ad.duplicate()
	d["mul"] = float(ad.get("mul", 1.0)) * attack_mul(cur_atk_id)
	if cur_atk_id == cls["moves"].get("charge", ""):
		d["mul"] = float(d["mul"]) * (1.0 + _fx("charge_pct"))
	d["stick"] = kind == "arrow"
	var spd := float(ad.get("speed", 6.5)) * (1.0 + _fx("arrow_spd"))
	var at := from if from != Vector2.INF else position + Vector2(facing * 10, -9)
	var pr: Projectile = world.spawn_projectile(self, at, dir * spd, d, kind)
	pr.pierce = bool(ad.get("pierce", false)) or _fx("pierce") > 0.0 or (buff_t > 0 and bool(buff.get("pierce", false))) or kind == "snipe"
	return pr


func _ranged_shots(a: Dictionary, startup: int) -> void:
	if not a.has("arrow") or t != startup:
		return
	var ad: Dictionary = a["arrow"]
	var ang := float(ad["angle"])
	if cur_atk_id == cls["moves"].get("charge", "") and _fx("multi") > 0.0:
		for off in [-10.0, 0.0, 10.0]:
			fire_arrow(ang + off, ad)
	else:
		fire_arrow(ang, ad)
	Sfx.play("dash", 0.05)
	_count("shot")


func _boom_data(base: Dictionary) -> Dictionary:
	var d := base.duplicate()
	d["mul"] = float(base["mul"]) * attack_mul(cur_atk_id) * (1.0 + _fx("boom_pct"))
	d["radius"] = float(base.get("radius", 36.0)) * (1.0 + _fx("boom_radius"))
	d["shrapnel"] = _fx("shrapnel") > 0.0
	return d


func _throw_grenade(base: Dictionary) -> void:
	var v: Array = base["vel"]
	var pr: Projectile = world.spawn_projectile(self, position + Vector2(facing * 8, -24), Vector2(float(v[0]) * facing, float(v[1])), _boom_data(base), "grenade")
	pr.gravity = float(base["gravity"])


func _plant_trap(base: Dictionary, dx: float) -> void:
	var d := _boom_data(base)
	var pr: Projectile = world.spawn_projectile(self, Vector2(position.x + dx, world.ground_below(position)), Vector2.ZERO, d, "trap")
	pr.life = int(float(base["life"]) * (1.0 + _fx("trap_dur")))


func _ranged_skill_effects(a: Dictionary, startup: int) -> void:
	var act := int(a["active"])
	if cur_skill.has("throw") and t == startup:
		_throw_grenade(cur_skill["throw"])
	if cur_skill.has("fan") and t == startup:
		var fd: Dictionary = cur_skill["fan"]
		var n := int(fd["count"])
		for i in range(n):
			fire_arrow(-float(fd["spread"]) / 2.0 + float(fd["spread"]) * i / float(n - 1), { "speed": fd["speed"], "mul": fd["mul"], "hitstop": 3, "hitstun": 20, "kb": [1.4, 0.0], "launch": 0.0, "mp": 0.0 })
	if cur_skill.has("net") and t == startup:
		var nd: Dictionary = cur_skill["net"]
		var pr := fire_arrow(0.0, { "speed": nd["speed"], "mul": nd["mul"], "hitstop": 3, "hitstun": 10, "kb": [0.0, 0.0], "launch": 0.0, "mp": 0.0,
			"root": int(float(nd["root"]) * (1.0 + _fx("trap_dur"))), "radius": nd["radius"] }, "net")
		pr.life = 70
	if cur_skill.has("trap") and t == startup:
		_plant_trap(cur_skill["trap"], facing * 14.0)
		if _fx("trap_count") > 0.0:
			_plant_trap(cur_skill["trap"], facing * 46.0)
	if cur_skill.has("spikes") and t == startup:
		var sd: Dictionary = cur_skill["spikes"]
		for i in range(int(sd["count"])):
			var d := { "mul": float(sd["mul"]) * attack_mul(cur_atk_id), "hitstop": 2, "hitstun": 18, "kb": [0.4, 0.0], "launch": 0.0, "mp": 0.0, "interval": sd["interval"] }
			var pr: Projectile = world.spawn_projectile(self, Vector2(position.x + facing * (24.0 + i * float(sd["gap"])), world.ground_below(position)), Vector2.ZERO, d, "spike")
			pr.life = int(float(sd["life"]) * (1.0 + _fx("trap_dur")))
	if cur_skill.has("arrowrain"):
		var rd: Dictionary = cur_skill["arrowrain"]
		if t >= startup and t < startup + act and (t - startup) % maxi(1, act / int(rd["count"])) == 0:
			var x := position.x + facing * float(rd["offset"]) + randf_range(-float(rd["width"]) / 2.0, float(rd["width"]) / 2.0)
			var pr: Projectile = world.spawn_projectile(self, Vector2(x, 10), Vector2(randf_range(-0.4, 0.4), 7.0),
				{ "mul": float(rd["mul"]) * attack_mul(cur_atk_id), "hitstop": 2, "hitstun": 18, "kb": [0.6, 0.0], "launch": 0.0, "mp": 0.0 }, "rainarrow")
			pr.life = 60
	if cur_skill.has("snipe") and t == startup:
		var snd: Dictionary = cur_skill["snipe"]
		fire_arrow(0.0, { "speed": snd["speed"], "mul": snd["mul"], "hitstop": 10, "hitstun": 40, "kb": [3.6, 0.0], "launch": 4.0, "mp": 0.0 }, "snipe")
		world.shake(5.0)
	if cur_skill.has("hunt"):
		var k := t - startup
		if k == 0:
			_throw_grenade(DataDB.get_row("skills", "sk_g_grenade")["throw"])
		elif k == 14:
			_plant_trap(DataDB.get_row("skills", "sk_g_trap")["trap"], facing * 18.0)
		elif k == 28:
			for i in range(5):
				fire_arrow(-18.0 + 9.0 * i, { "speed": 6.5, "mul": 1.1, "hitstop": 3, "hitstun": 20, "kb": [1.4, 0.0], "launch": 0.0, "mp": 0.0 })
		elif k == 44:
			fire_arrow(0.0, { "speed": 14.0, "mul": 3.6, "hitstop": 8, "hitstun": 36, "kb": [3.0, 0.0], "launch": 3.4, "mp": 0.0 }, "snipe")
			world.shake(4.0)


## 원소 구체 하나. size 1~3
func fire_orb(od: Dictionary, ang: float = 0.0, e: String = "") -> Projectile:
	var r := deg_to_rad(ang)
	var d := od.duplicate()
	d["mul"] = float(od.get("mul", 1.0)) * attack_mul(cur_atk_id) * elem_mul()
	if cur_atk_id == "atk_lc3":
		d["mul"] = float(d["mul"]) * (1.0 + _fx("charge_pct"))
	d["elem"] = e if e != "" else elem()
	var pr: Projectile = world.spawn_projectile(self, position + Vector2(facing * 12, -12), Vector2(cos(r) * facing, sin(r)) * float(od.get("speed", 5.0)), d, "orb")
	pr.orb_size = int(od.get("size", 1))
	pr.size = Vector2(8, 8) * pr.orb_size
	pr.pierce = bool(od.get("pierce", false))
	pr.life = 110
	return pr


func _caster_shots(a: Dictionary, startup: int) -> void:
	if not a.has("orb") or t != startup:
		return
	var od: Dictionary = a["orb"]
	var multi := _fx("multi") > 0.0 and cur_atk_id in ["atk_lc2", "atk_lc3"]
	for off in ([-14.0, 0.0, 14.0] if multi else [float(od.get("angle", 0.0))]):
		fire_orb(od, off)
	Sfx.play("skill", 0.15)


func _caster_skill_effects(a: Dictionary, startup: int) -> void:
	var act := int(a["active"])
	var k := t - startup
	var sm := attack_mul(cur_atk_id)
	if cur_skill.has("split"):
		var sd: Dictionary = cur_skill["split"]
		if k >= 0 and k < int(sd["count"]) * int(sd["gap"]) and k % int(sd["gap"]) == 0:
			fire_orb({ "speed": sd["speed"], "mul": sd["mul"], "size": 1, "hitstop": 3, "hitstun": 22, "kb": [1.6, 0.0], "launch": 0.0, "mp": 0.0 }, 0.0, sd["elem"])
	if cur_skill.has("lance") and k == 0:
		var ld: Dictionary = cur_skill["lance"]
		var pr := fire_orb({ "speed": ld["speed"], "mul": ld["mul"], "size": 2, "pierce": true, "hitstop": 6, "hitstun": 30, "kb": [1.0, 0.0], "launch": 0.0, "mp": 0.0, "freeze": ld["freeze"] }, 0.0, "ice")
		pr.kind = "lance"
	if cur_skill.has("chain") and k == 0:
		var cd: Dictionary = cur_skill["chain"]
		world.chain_bolt(self, position + Vector2(0, -14), float(cd["range"]), int(cd["jumps"]) + int(_fx("chain_add")),
			{ "mul": float(cd["mul"]) * sm * elem_mul(), "hitstop": 5, "hitstun": 28, "kb": [1.2, 0.0], "launch": 0.0, "mp": 0.0, "elem": "bolt" })
	if cur_skill.has("bang"):
		var bd: Dictionary = cur_skill["bang"]
		if k == 0:
			world.mark_enemies(self, int(bd["targets"]), float(bd["range"]))
		if k == int(bd["delay"]):
			world.detonate_marks(self, { "mul": float(bd["mul"]) * sm, "radius": float(bd["radius"]), "hitstop": 6, "hitstun": 30, "kb": [2.4, 0.0], "launch": float(bd["launch"]), "mp": 0.0, "elem": "fire" })
	if cur_skill.has("ring") and k == 0:
		var rd: Dictionary = cur_skill["ring"]
		world.explode(self, position + Vector2(0, -4), { "mul": float(rd["mul"]) * sm, "radius": float(rd["radius"]), "hitstop": 6, "hitstun": 28, "kb": [2.0, 0.0], "launch": 0.0, "mp": 0.0, "elem": "ice", "freeze": rd["freeze"], "fx": "ice" })
	if cur_skill.has("storm"):
		var sd2: Dictionary = cur_skill["storm"]
		if k >= 0 and k < act and k % int(sd2["interval"]) == 0:
			var x := position.x + facing * float(sd2["offset"]) + randf_range(-float(sd2["width"]) / 2.0, float(sd2["width"]) / 2.0)
			world.lightning_column(self, x, { "mul": float(sd2["mul"]) * sm, "hitstop": 3, "hitstun": 22, "kb": [0.6, 0.0], "launch": 0.0, "mp": 0.0, "elem": "bolt" })
	if cur_skill.has("meteor") and k == 0:
		var md: Dictionary = cur_skill["meteor"]
		var target := Vector2(position.x + facing * float(md["offset"]), world.ground_below(position))
		var pr: Projectile = world.spawn_projectile(self, target + Vector2(-facing * 120.0, -230.0), Vector2(facing * 4.0, 7.6),
			{ "mul": float(md["mul"]) * sm, "radius": md["radius"], "hitstop": 12, "hitstun": 40, "kb": [3.0, 0.0], "launch": float(md["launch"]), "mp": 0.0, "elem": "fire", "fx": "fire" }, "meteor")
		pr.life = 200
	if cur_skill.has("glacier"):
		if k == 0:
			world.freeze_all(self, act + 10)
		if k == act - 1:
			world.shatter_all(self, { "mul": float(cur_skill["glacier"]["mul"]) * sm, "hitstop": 10, "hitstun": 36, "kb": [2.4, 0.0], "launch": 4.0, "mp": 0.0, "elem": "ice" })
	if cur_skill.has("judgment") and k == 0:
		for e in world.enemies.duplicate():
			if not e.dead:
				world.lightning_column(self, e.position.x, { "mul": float(cur_skill["judgment"]["mul"]) * sm, "hitstop": 10, "hitstun": 36, "kb": [2.0, 0.0], "launch": 3.6, "mp": 0.0, "elem": "bolt" }, true)
		world.shake(7.0)


func _skill_effects(a: Dictionary, startup: int) -> void:
	_ranged_shots(a, startup)
	_caster_shots(a, startup)
	if cur_skill.is_empty() or cur_atk_id != cur_skill.get("attack", ""):
		return
	if ranged:
		_ranged_skill_effects(a, startup)
	if not elements.is_empty():
		_caster_skill_effects(a, startup)
	var act := int(a["active"])
	if cur_skill.has("projectile") and t == startup:
		var pd: Dictionary = (cur_skill["projectile"] as Dictionary).duplicate()
		pd["mul"] = float(pd["mul"]) * attack_mul(cur_atk_id)
		pd["mp"] = 0.0
		world.spawn_projectile(self, position + Vector2(facing * 14, 0), Vector2(facing * float(pd["speed"]), 0), pd, pd["kind"])
		Sfx.play("slash", 0.0)
	if cur_skill.has("rain"):
		if t >= startup and t < startup + act and t % 3 == 0:
			world.spawn_blade(position.x + randf_range(-115, 115))
		if t == startup + act:
			var sw: Projectile = world.spawn_projectile(self, Vector2(position.x + facing * 26, -30), Vector2(0, 7),
				{ "mul": float(cur_skill["rain"]["sword_mul"]) * attack_mul(cur_atk_id), "hitstop": 10, "hitstun": 40,
				"kb": [3.0, 0.0], "launch": 5.0, "mp": 0.0 }, "sword")
			sw.gravity = 0.4
	if cur_skill.has("rush"):
		if t >= startup and t < startup + act:
			vel.x = facing * float(cur_skill["rush"])
			if t % 4 == 0:
				world.spawn_dust(position, 1)
	if cur_skill.has("waves") and t == startup:
		var wv: Dictionary = (cur_skill["waves"] as Dictionary).duplicate()
		wv["mul"] = float(wv["mul"]) * attack_mul(cur_atk_id)
		wv["mp"] = 0.0
		for d in [-1, 1]:
			world.spawn_projectile(self, position + Vector2(d * 16, 0), Vector2(d * float(wv["speed"]), 0), wv, "slash")
		world.shake(5.0)
		world.spawn_dust(position, 8)
		Sfx.play("crit", 0.0)
	if cur_skill.has("buff") and t == startup:
		buff = cur_skill["buff"]
		buff_t = int(buff["frames"])
		gold_count = 0
		world.banner("%s — %d초" % [cur_skill["name"], int(buff["frames"]) / 60], Tk.GOLD)
	if cur_atk_id == "atk_dawn" and t == startup:
		world.shake(7.0)
		world.flash_slash(position + Vector2(facing * 150, -40), facing)


func _attacking(f: Dictionary) -> void:
	var a := cur_atk
	var startup := int(a["startup"])
	_skill_effects(a, startup)
	var lunge := float(a.get("lunge", 0.0))
	if cur_atk_id == cls["moves"].get("dive", ""):
		# 내려찍기: 빠르게 떨어지다 땅에 닿으면 끝
		vel.x = 0.0
		if t >= startup:
			vel.y = 6.5
		if on_ground and t > startup:
			world.shake(3.0)
			world.spawn_dust(position, 5)
			cur_atk = {}
			set_state("idle")
		return
	if cur_atk_id == cls["air_attack"]:
		vel.x = float(f["x"]) * float(move["run"]) * 0.6
		if on_ground and t > 2:
			set_state("idle")
			return
	elif cur_skill.has("rush") and cur_atk_id == cur_skill.get("attack", ""):
		pass
	elif cur_skill.has("leap") and cur_atk_id == cur_skill.get("attack", ""):
		vel.x *= 0.9
	elif t <= startup + 2 and lunge > 0.0:
		vel.x = facing * lunge
	else:
		vel.x *= 0.75
	var total := atk_total(a)
	var is_combo := combo.has(cur_atk_id)
	# 돌진 연격: 대시 공격이 끝나 갈 때 공격을 한 번 더
	if cur_atk_id == cls["dash_attack"] and _fx("move_dash2") > 0.0 and t >= startup + int(a["active"]) and atk_buffer > 0:
		atk_buffer = 0
		_count("dash2")
		start_attack(cls["moves"]["dash2"], _atk(cls["moves"]["dash2"]))
		return
	if ranged and _fx("rapid") > 0.0 and is_combo:
		total = int(total * 0.8)
	if t >= int(a["cancel"]):
		if is_combo and atk_buffer > 0 and combo_idx < combo.size() - 1:
			atk_buffer = 0
			combo_idx += 1
			if f["x"] != 0:
				facing = f["x"]
			if combo[combo_idx] == cls["moves"].get("combo5", ""):
				_count("combo5")
			start_attack(combo[combo_idx], _atk(combo[combo_idx]))
			return
		if f["dash_p"] and on_ground:
			_start_dash(f)
			return
		if f["jump_p"] and on_ground:
			_jump()
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
	var heal := int(max_hp * POTION_HEAL * (1.0 + _fx("potion_pct")))
	hp = mini(max_hp, hp + heal)
	potion_cd = 60
	Sfx.play("potion", 0.0)
	world.spawn_number(position + Vector2(0, -h - 4), "+%d" % heal, Tk.HEAL)


func take_hit(attacker: Fighter, a: Dictionary, res: Dictionary) -> void:
	var armor_now: bool = firm and state == "atk" and (cur_atk_id == combo[combo.size() - 1] or _is_skill_attack(cur_atk_id))
	super_armor = armor_now or (buff_t > 0 and bool(buff.get("armor", false)))
	res = res.duplicate()
	if god:
		res["dmg"] = 0
	if afterglow_t > 0 and _fx("afterglow") > 0.0:
		res["dmg"] = int(res["dmg"] * (1.0 - minf(0.5, _fx("afterglow"))))
	if not elements.is_empty() and int(res["dmg"]) > 0:
		no_hit_t = 0
		if _fx("elem_buff") > 0.0 and elem() == "ice":
			res["dmg"] = int(res["dmg"] * 0.92)
		if auto_shield_ready and hp - int(res["dmg"]) < max_hp * 0.3 and shield_max > 0.0:
			auto_shield_ready = false
			shield = shield_max
			world.banner("위기의 결계!", Tk.MP)
		if shield > 0.0:
			var absorb := minf(shield, float(res["dmg"]))
			shield -= absorb
			res["dmg"] = int(float(res["dmg"]) - absorb)
			if int(res["dmg"]) <= 0:
				flash = 4
				world.spawn_number(position + Vector2(0, -h - 4), "방패", Tk.MP)
				return
	if last_stand_ready and int(res["dmg"]) >= hp and hp > 1:
		last_stand_ready = false
		res["dmg"] = hp - 1
		invuln = 90
		_count("last_stand")
		world.banner("불굴의 기사!", Tk.GOLD)
		Sfx.play("counter", 0.0)
	super.take_hit(attacker, a, res)
	gain_mp(0.03)


func revive() -> void:
	dead = false
	hp = max_hp
	invuln = 150
	vel = Vector2.ZERO
	set_state("idle")


# ---------- 그리기 ----------

func _draw() -> void:
	if invuln > 0 and state not in ["down", "getup"] and (t / 3) % 2 == 0 and invuln < 140:
		modulate.a = 0.55
	else:
		modulate.a = 1.0
	if buff_t > 0:
		var k := 0.5 + 0.5 * sin(t * 0.2)
		draw_arc(Vector2(0, -14), 15 + k * 2, 0, TAU, 24, Color(Tk.GOLD, 0.35 + 0.2 * k), 1.5)
		if t % 6 == 0:
			world.spawn_spark(position + Vector2(randf_range(-8, 8), -randf_range(4, 26)), Tk.GOLD, 1.0)
	if state == "guard":
		var gr := 16.0 + sin(t * 0.4) * 2.0
		draw_arc(Vector2(0, -14), gr, 0, TAU, 24, Color("dfe6ee", 0.9), 2.0)
		draw_arc(Vector2(0, -14), gr - 4, 0, TAU, 24, Color(Tk.MP, 0.5), 1.0)
	if gold_ready or gold_attack:
		for i in range(4):
			var ga := t * 0.15 + i * PI / 2.0
			draw_rect(Rect2(cos(ga) * 12.0 - 1, -14 + sin(ga) * 14.0 - 1, 2, 2), Tk.GOLD)
	if not draw_sprite():
		# 시트가 없을 때의 대체 그림
		px(-6, -26, 12, 26, Tk.P_COAT)
		px(-4, -32, 8, 7, Tk.P_SKIN)
		px(-5, -33, 10, 3, Tk.P_HAIR)
	if cls.has("charge") and cast_hold > 8:
		var lv := cast_level()
		var col: Color = ELEM_COL.get(elem(), Tk.MP)
		var r0 := 8.0 + lv * 6.0 + sin(t * 0.3) * 1.0
		draw_arc(Vector2(0, -2), r0, 0, TAU, 28, Color(col, 0.7), 1.5)
		draw_arc(Vector2(0, -2), r0 * 0.6, 0, TAU, 20, Color(col, 0.4), 1.0)
		for i in range(lv):
			draw_rect(Rect2(-7 + i * 5, -40, 4, 3), col)
	if shield > 1.0:
		draw_arc(Vector2(0, -14), 17, 0, TAU, 28, Color(Tk.MP, 0.25 + 0.35 * shield / maxf(1.0, shield_max)), 1.0)
	if ranged and shot_hold > 6:
		var need := int(cls["ranged"]["charge_frames"])
		var k2 := clampf(float(shot_hold) / need, 0.0, 1.0)
		draw_rect(Rect2(-8, -38, 16, 3), Tk.INK)
		draw_rect(Rect2(-7, -37, 14 * k2, 1), Tk.GOLD if k2 >= 1.0 else Tk.PAPER_DIM)
	if hold >= CHARGE_START:
		var cl := charge_level()
		for i in range(3):
			draw_rect(Rect2(-7 + i * 5, -40, 4, 3), Tk.MP if i < cl else Color(Tk.TEXT_DIM, 0.5))
	draw_debug_boxes()
