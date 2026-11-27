class_name Boss
extends Enemy
## 보스 「제본 골렘」: 경직 저항(슈퍼아머) + 경직 게이지, 3패턴(휘두르기/내려찍기 충격파/돌진), HP 50% 이하 2페이즈.

var stagger_max := 900.0
var stagger := 0.0
var phase := 1
var pattern := ""
var summoned := false


func setup(id: String) -> void:
	super.setup(id)
	super_armor = true
	down_extend = false
	stagger_max = float(mon.get("stagger", 900))
	cooldown = 70


func take_hit(attacker: Fighter, a: Dictionary, res: Dictionary) -> void:
	super.take_hit(attacker, a, res)
	if dead:
		return
	if not is_down_state():
		stagger += float(res["dmg"])
		if stagger >= stagger_max:
			stagger = 0.0
			cur_atk = {}
			vel = Vector2(-2.0 * facing, 0)
			set_state("down")
			world.shake(4.0)
			world.banner("그로기!", Tk.GOLD)
	if phase == 1 and hp < max_hp / 2:
		phase = 2
		world.banner(phase_text(), Tk.DANGER)
		Sfx.play("boss_roar", 0.0)


func phase_text() -> String:
	return "%s이(가) 페이지를 찢는다!" % mon["name"]


func _speed_mul() -> float:
	return 0.75 if phase == 2 else 1.0


func think(_f: Dictionary) -> void:
	var p: Fighter = world.player
	if cooldown > 0:
		cooldown -= 1
	if phase == 2 and not summoned:
		summoned = true
		world.spawn_monster("mon_inkblob", Vector2(80, 238))
		world.spawn_monster("mon_inkblob", Vector2(float(world.width) - 80.0, 238))
	if state == "atk":
		_run_pattern(p)
		return
	if p.dead:
		vel.x = 0.0
		return
	var dx := p.position.x - position.x
	facing = 1 if dx > 0 else -1
	if cooldown <= 0:
		var far := absf(dx) > 110.0
		var roll := randf()
		if far:
			pattern = "charge" if roll < 0.55 else "slam"
		else:
			pattern = "swipe" if roll < 0.6 else "slam"
		vel.x = 0.0
		start_attack("boss_" + pattern, _pattern_data(pattern))
		return
	if absf(dx) > 60.0:
		vel.x = facing * speed * (1.3 if phase == 2 else 1.0)
		if state != "run":
			set_state("run")
	else:
		vel.x = 0.0
		if state != "idle":
			set_state("idle")


func _pattern_data(pat: String) -> Dictionary:
	var m := _speed_mul()
	match pat:
		"swipe":
			return { "startup": int(30 * m), "active": 8, "recovery": 34, "cancel": 99, "hitbox": [0, -54, 60, 54],
				"mul": 1.2, "hitstop": 6, "hitstun": 30, "kb": [3.2, 0.0], "launch": 3.4, "mp": 0.0 }
		"slam":
			return { "startup": int(46 * m), "active": 4, "recovery": 40, "cancel": 99, "hitbox": [-30, -20, 60, 20],
				"mul": 1.4, "hitstop": 8, "hitstun": 30, "kb": [2.0, 0.0], "launch": 4.0, "mp": 0.0 }
		_:
			return { "startup": int(36 * m), "active": 50, "recovery": 36, "cancel": 99, "hitbox": [-6, -52, 36, 52],
				"mul": 1.1, "hitstop": 6, "hitstun": 30, "kb": [4.0, 0.0], "launch": 3.0, "mp": 0.0 }


func _run_pattern(_p: Fighter) -> void:
	var s := int(cur_atk["startup"])
	match pattern:
		"swipe":
			vel.x = facing * 1.2 if t > s - 4 and t < s + 4 else 0.0
		"slam":
			vel.x = 0.0
			if t == s:
				world.shake(5.0)
				for dir in [-1, 1]:
					world.spawn_projectile(self, position + Vector2(dir * 26, -8), Vector2(dir * 2.7, 0),
						{ "mul": 1.0, "hitstop": 5, "hitstun": 26, "kb": [2.4, 0.0], "launch": 3.0, "mp": 0.0 }, "wave")
		"charge":
			if t >= s and t < s + int(cur_atk["active"]):
				vel.x = facing * 4.0
				if position.x <= w / 2.0 + 1.0 or position.x >= float(world.width) - w / 2.0 - 1.0:
					t = s + int(cur_atk["active"])   # 벽에 부딪히면 돌진 종료
					world.shake(3.0)
			else:
				vel.x *= 0.8
	if t >= atk_total(cur_atk):
		cur_atk = {}
		cooldown = int((60 + randi() % 40) * _speed_mul())
		set_state("idle")


func _draw() -> void:
	var tele := state == "atk" and t < int(cur_atk.get("startup", 0)) and (t / 4) % 2 == 0
	if state in ["down", "dead"]:
		px(-26, -18, 52, 18, Tk.B_COVER)
		px(-26, -18, 52, 4, Tk.B_SPINE)
		px(-20, -14, 40, 10, Tk.B_PAGE)
		draw_debug_boxes()
		return
	var lift := 0.0
	if state == "atk" and pattern == "slam" and t < int(cur_atk["startup"]):
		lift = -6.0
	# 다리 (두꺼운 책 두 권)
	px(-18, -12, 12, 12, Tk.B_COVER)
	px(6, -12, 12, 12, Tk.B_COVER)
	# 몸통: 펼쳐진 거대한 책
	px(-22, -50, 44, 38, Tk.B_COVER)
	px(-2, -50, 4, 38, Tk.B_SPINE)
	px(-18, -46, 15, 30, Tk.B_PAGE)
	px(3, -46, 15, 30, Tk.B_PAGE)
	for i in range(4):
		px(-16, -42 + i * 6, 11, 1, Tk.PAPER_DIM)
		px(5, -42 + i * 6, 11, 1, Tk.PAPER_DIM)
	# 머리: 책갈피 끈 + 눈
	px(-10, -58, 20, 8, Tk.B_COVER)
	var eye := Tk.DANGER if tele or phase == 2 else Tk.M_EYE
	px(-6, -56, 4, 3, eye)
	px(3, -56, 4, 3, eye)
	px(-1, -60, 2, 6, Tk.RIBBON)
	# 팔
	if state == "atk" and pattern == "swipe" and t >= int(cur_atk["startup"]):
		px(20, -40, 34, 8, Tk.B_SPINE)
	else:
		px(20, -44 + lift, 10, 26, Tk.B_SPINE)
		px(-30, -44 + lift, 10, 26, Tk.B_SPINE)
	draw_debug_boxes()
