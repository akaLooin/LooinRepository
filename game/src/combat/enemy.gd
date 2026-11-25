class_name Enemy
extends Fighter
## 일반 몬스터 AI: melee(근접 돌진형) / ranged(비행 사격형). 예고(번쩍임) → 공격 → 후딜.

var mon: Dictionary = {}
var mon_id := ""
var ai := "melee"
var speed := 1.0
var reach := 22.0
var cooldown := 40
var _home_fly := false
var _bob := 0.0


func setup(id: String) -> void:
	team = 1
	mon_id = id
	mon = DataDB.get_row("monsters", id)
	ai = mon["ai"]
	w = float(mon["size"][0])
	h = float(mon["size"][1])
	max_hp = int(mon["hp"])
	hp = max_hp
	atk = float(mon["atk"])
	def = float(mon["def"])
	speed = float(mon["speed"])
	reach = float(mon["reach"])
	flying = bool(mon["fly"])
	_home_fly = flying
	gravity = 0.3
	cooldown = 30 + randi() % 40
	facing = -1


func melee_attack() -> Dictionary:
	return { "startup": 26, "active": 6, "recovery": 28, "cancel": 99,
		"hitbox": [0, -h, reach + 6, h], "mul": 1.0, "hitstop": 5, "hitstun": 24,
		"kb": [2.2, 0.0], "launch": 0.0, "mp": 0.0 }


func on_getup() -> void:
	flying = _home_fly


func take_hit(attacker: Fighter, a: Dictionary, res: Dictionary) -> void:
	if flying and float(a["launch"]) > 0.0:
		flying = false   # 띄우는 공격에 맞으면 날개를 접고 떨어진다
	super.take_hit(attacker, a, res)


func think(_f: Dictionary) -> void:
	var p: Fighter = world.player
	if cooldown > 0:
		cooldown -= 1
	if ai == "ranged":
		_think_ranged(p)
	else:
		_think_melee(p)


func _think_melee(p: Fighter) -> void:
	if state == "atk":
		vel.x *= 0.7
		if t >= atk_total(cur_atk):
			cur_atk = {}
			cooldown = 50 + randi() % 30
			set_state("idle")
		return
	if not on_ground:
		return
	var dx := p.position.x - position.x
	var dy := p.position.y - position.y
	if p.dead:
		vel.x = 0.0
		return
	if absf(dx) < reach and absf(dy) < 26.0 and cooldown <= 0:
		facing = 1 if dx > 0 else -1
		vel.x = 0.0
		start_attack("mon_melee", melee_attack())
	elif absf(dx) < 320.0 and absf(dx) > reach * 0.6:
		facing = 1 if dx > 0 else -1
		vel.x = facing * speed
		if state != "run":
			set_state("run")
	else:
		vel.x = 0.0
		if state != "idle":
			set_state("idle")


func _think_ranged(p: Fighter) -> void:
	_bob += 0.08
	if not flying:
		# 땅에 떨어진 상태: 다시 날아오른다
		flying = true
		vel = Vector2.ZERO
	if state == "atk":
		vel *= 0.8
		if t == 20:
			var dir := (p.position + Vector2(0, -12) - (position + Vector2(0, -6))).normalized()
			world.spawn_projectile(self, position + Vector2(0, -6), dir * 2.3, { "mul": 1.0, "hitstop": 3,
				"hitstun": 20, "kb": [1.5, 0.0], "launch": 0.0, "mp": 0.0 }, "ink")
		if t >= 50:
			cur_atk = {}
			cooldown = 110 + randi() % 50
			set_state("idle")
		return
	var side := -1.0 if position.x < p.position.x else 1.0
	var target := p.position + Vector2(side * 100.0, -64.0 + sin(_bob) * 8.0)
	var to := target - position
	vel = to.limit_length(speed) if to.length() > 4.0 else vel * 0.8
	facing = 1 if p.position.x > position.x else -1
	if cooldown <= 0 and position.distance_to(p.position) < 220.0 and not p.dead:
		start_attack("mon_shot", { "startup": 20, "active": 0, "recovery": 30, "cancel": 99, "hitbox": [0, 0, 0, 0],
			"mul": 0.0, "hitstop": 0, "hitstun": 0, "kb": [0, 0], "launch": 0.0, "mp": 0.0 })


func _draw() -> void:
	var tele := state == "atk" and t < int(cur_atk.get("startup", 0)) and (t / 3) % 2 == 0
	match mon_id:
		"mon_inkblob":
			_draw_inkblob(tele)
		"mon_crane":
			_draw_crane(tele)
		"mon_quill":
			_draw_quill(tele)
	draw_debug_boxes()


func _draw_inkblob(tele: bool) -> void:
	var squash := 1.0 if (t / 8) % 2 == 0 else 0.0
	if state in ["down", "dead"]:
		px(-10, -6, 20, 6, Tk.M_INK)
		return
	px(-9, -12 + squash, 18, 12 - squash, Tk.M_INK)
	px(-7, -14 + squash, 14, 2, Tk.M_INK)
	px(-6, -12 + squash, 4, 2, Tk.M_INK_HI)
	var eye := Tk.DANGER if tele else Tk.M_EYE
	px(1, -10 + squash, 2, 3, eye)
	px(5, -10 + squash, 2, 3, eye)
	px(-11, -2, 4, 2, Tk.M_INK)
	px(8, -2, 4, 2, Tk.M_INK)


func _draw_crane(tele: bool) -> void:
	var flap := (t / 6) % 2 == 0
	if state in ["down", "dead"]:
		px(-8, -4, 16, 4, Tk.M_PAPER)
		return
	px(-6, -8, 12, 5, Tk.M_PAPER)
	px(4, -11, 5, 3, Tk.M_PAPER)
	px(8, -10, 2, 1, Tk.RIBBON if tele else Tk.INK)
	px(-9, -7, 4, 2, Tk.M_PAPER_SH)
	if flap:
		px(-4, -14, 8, 6, Tk.M_PAPER_SH)
	else:
		px(-4, -4, 8, 5, Tk.M_PAPER_SH)


func _draw_quill(tele: bool) -> void:
	if state in ["down", "dead"]:
		px(-13, -5, 26, 5, Tk.M_QUILL)
		return
	var step := 1.0 if state == "run" and (t / 6) % 2 == 0 else 0.0
	px(-3, -6, 2, 6 - step, Tk.M_INK)
	px(2, -6, 2, 6 - (1.0 - step), Tk.M_INK)
	px(-5, -20, 10, 14, Tk.M_QUILL)
	px(-4, -26, 8, 6, Tk.M_PAPER)
	px(1, -24, 2, 2, Tk.DANGER if tele else Tk.INK)
	# 깃펜 창
	if state == "atk" and t >= int(cur_atk["startup"]) and t < int(cur_atk["startup"]) + 10:
		px(4, -15, 22, 2, Tk.M_PAPER)
		px(25, -16, 3, 4, Tk.M_INK)
	else:
		px(5, -32, 2, 24, Tk.M_PAPER)
		px(4, -34, 4, 4, Tk.M_PAPER_SH)
