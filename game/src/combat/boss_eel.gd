class_name BossEel
extends Boss
## 보스 「등불을 삼킨 장어왕」: 수로의 물웅덩이 사이를 잠수해 옮겨 다닌다.
## 수면 위에 있을 때만 맞는다. 패턴: 물어뜯기 돌진 / 잉크 포물선 3연발 / (2페이즈) 유도 등불 구슬.

const POOLS := [120.0, 320.0, 520.0]

var mode := "up"        # under(잠수) → rise(떠오름 예고) → up(공격 가능) → dive(잠수)
var mode_t := 0
var target_x := 320.0
var attacks_left := 2


func phase_text() -> String:
	return "장어왕 뱃속의 등불이 타오른다!"


func setup(id: String) -> void:
	super.setup(id)
	cooldown = 50


func _set_mode(m: String) -> void:
	mode = m
	mode_t = 0
	if m == "under":
		invuln = 9999
		var choices: Array = POOLS.filter(func(x): return absf(x - position.x) > 40.0)
		target_x = choices[randi() % choices.size()]
		Sfx.play("splash")
	elif m == "rise":
		invuln = 9999
	elif m == "up":
		invuln = 0
		attacks_left = 3 if phase == 2 else 2
		cooldown = 24
		Sfx.play("splash")
		world.spawn_dust(position, 6)


func on_getup() -> void:
	_set_mode("dive")


func think(_f: Dictionary) -> void:
	var p: Fighter = world.player
	mode_t += 1
	if cooldown > 0:
		cooldown -= 1
	match mode:
		"under":
			position.x = move_toward(position.x, target_x, 3.0)
			if absf(position.x - target_x) < 1.0 and mode_t > 30:
				_set_mode("rise")
			return
		"rise":
			if mode_t >= int(40 * _speed_mul()):
				_set_mode("up")
			return
		"dive":
			vel.x = 0.0
			if mode_t >= 24:
				_set_mode("under")
			return
	if state == "atk":
		_run_pattern(p)
		return
	vel.x = 0.0
	var dx := p.position.x - position.x
	facing = 1 if dx > 0 else -1
	if attacks_left <= 0:
		_set_mode("dive")
		return
	if cooldown <= 0 and not p.dead:
		var roll := randf()
		if phase == 2 and roll < 0.3:
			pattern = "lantern"
		elif absf(dx) < 160.0 and roll < 0.65:
			pattern = "bite"
		else:
			pattern = "spit"
		attacks_left -= 1
		start_attack("eel_" + pattern, _pattern_data(pattern))


func _pattern_data(pat: String) -> Dictionary:
	var m := _speed_mul()
	match pat:
		"bite":
			return { "startup": int(28 * m), "active": 34, "recovery": 30, "cancel": 99, "hitbox": [-6, -30, 46, 30],
				"mul": 1.3, "hits": 1, "hitstop": 7, "hitstun": 30, "kb": [3.6, 0.0], "launch": 3.4, "mp": 0.0 }
		"spit":
			return { "startup": int(24 * m), "active": 1, "recovery": 40, "cancel": 99, "hitbox": [0, 0, 0, 0],
				"mul": 0.0, "hitstop": 0, "hitstun": 0, "kb": [0, 0], "launch": 0.0, "mp": 0.0 }
		_:
			return { "startup": int(30 * m), "active": 1, "recovery": 50, "cancel": 99, "hitbox": [0, 0, 0, 0],
				"mul": 0.0, "hitstop": 0, "hitstun": 0, "kb": [0, 0], "launch": 0.0, "mp": 0.0 }


func _run_pattern(p: Fighter) -> void:
	var s := int(cur_atk["startup"])
	match pattern:
		"bite":
			if t >= s and t < s + int(cur_atk["active"]):
				vel.x = facing * 4.4
				if position.x <= w / 2.0 + 1.0 or position.x >= float(world.width) - w / 2.0 - 1.0:
					t = s + int(cur_atk["active"])
			else:
				vel.x *= 0.75
		"spit":
			vel.x = 0.0
			if t == s:
				for i in range(3):
					var pr: Projectile = world.spawn_projectile(self, position + Vector2(facing * 14, -30),
						Vector2(facing * (1.4 + i * 0.9), -3.6 + i * 0.3),
						{ "mul": 0.9, "hitstop": 4, "hitstun": 22, "kb": [1.6, 0.0], "launch": 0.0, "mp": 0.0 }, "ink")
					pr.gravity = 0.13
		"lantern":
			vel.x = 0.0
			if t == s:
				for i in range(3):
					var a := -PI / 2.0 + (i - 1) * 0.7
					var pr: Projectile = world.spawn_projectile(self, position + Vector2(0, -24), Vector2(cos(a), sin(a)) * 1.5,
						{ "mul": 0.8, "hitstop": 3, "hitstun": 20, "kb": [1.4, 0.0], "launch": 0.0, "mp": 0.0 }, "orb")
					pr.homing = 0.035
	if t >= atk_total(cur_atk):
		cur_atk = {}
		cooldown = int(30 * _speed_mul())
		set_state("idle")


func _draw() -> void:
	var water := Color("4f8f96")
	# 물웅덩이 (항상)
	for x in POOLS:
		var lx: float = x - position.x
		draw_rect(Rect2(lx - 22, -1, 44, 3), Color(water, 0.8))
		draw_rect(Rect2(lx - 14, -2, 28, 1), Color("a9dcd8"))
	if mode == "under":
		var f := (mode_t / 6) % 2
		draw_rect(Rect2(-10 - f * 3, -3, 20 + f * 6, 2), Color("a9dcd8"))
		return
	if mode == "rise":
		if (mode_t / 4) % 2 == 0:
			draw_rect(Rect2(-18, -4, 36, 3), Color(Tk.DANGER, 0.7))
		draw_rect(Rect2(-6, -6, 12, 3), Color("a9dcd8"))
		return
	var body := Color("2f5e66")
	var belly := Color("8fb9a8")
	var tele := state == "atk" and t < int(cur_atk.get("startup", 0)) and (t / 4) % 2 == 0
	if state in ["down", "dead"]:
		px(-30, -10, 60, 10, body)
		px(-26, -6, 50, 4, belly)
		draw_debug_boxes()
		return
	var lunge := state == "atk" and pattern == "bite" and t >= int(cur_atk["startup"])
	var rise_h := 34.0 if mode == "up" else 14.0
	if mode == "dive":
		rise_h = maxf(4.0, 34.0 - mode_t * 1.4)
	# 물 위로 솟은 몸통 마디 (뒤에서 앞으로 굽음)
	for i in range(6):
		var k := float(i) / 5.0
		var x := -20.0 + k * 26.0 + (10.0 if lunge else 0.0)
		var y := -k * rise_h
		px(x - 5, y - 8, 11, 9, body)
		px(x - 4, y - 2, 9, 2, belly)
	# 머리
	var hx := 8.0 + (10.0 if lunge else 0.0)
	var hy := -rise_h - 10.0
	px(hx - 2, hy, 18, 12, body)
	px(hx + 12, hy + 6, 6, 3, Color("e8e0c8"))   # 이빨
	px(hx + 8, hy + 2, 3, 3, Tk.DANGER if tele or phase == 2 else Tk.M_EYE)
	# 지느러미
	px(hx - 6, hy - 4, 8, 4, Color("3f7a80"))
	# 뱃속 등불 (2페이즈에 밝아짐)
	var glow := 0.5 + 0.5 * sin(t * 0.2)
	var lc := Color(Tk.GOLD, 0.6 + 0.4 * glow) if phase == 2 else Color(Tk.GOLD, 0.45)
	px(-6, -rise_h * 0.5 - 6, 8, 6, lc)
	draw_debug_boxes()
