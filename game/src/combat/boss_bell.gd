class_name BossBell
extends Boss
## 보스 「녹슨 종지기」: 거대한 녹슨 종을 뒤집어쓴 문지기.
## 패턴: 망치 내려치기(근접) / 타종(사방으로 음표탄) / 종 낙하(예고 후 떨어지는 작은 종들). 2페이즈에 수량·속도 증가.


func phase_text() -> String:
	return "녹슨 종지기가 마지막 종을 울린다!"


func think(_f: Dictionary) -> void:
	var p: Fighter = world.player
	if cooldown > 0:
		cooldown -= 1
	if state == "atk":
		_run_pattern(p)
		return
	if p.dead:
		vel.x = 0.0
		return
	var dx := p.position.x - position.x
	facing = 1 if dx > 0 else -1
	if cooldown <= 0:
		var roll := randf()
		if absf(dx) < 70.0:
			pattern = "hammer" if roll < 0.6 else "toll"
		else:
			pattern = "bells" if roll < 0.5 else "toll"
		vel.x = 0.0
		start_attack("bell_" + pattern, _pattern_data(pattern))
		return
	if absf(dx) > 50.0:
		vel.x = facing * speed * (1.2 if phase == 2 else 0.8)
		if state != "run":
			set_state("run")
	else:
		vel.x = 0.0
		if state != "idle":
			set_state("idle")


func _pattern_data(pat: String) -> Dictionary:
	var m := _speed_mul()
	match pat:
		"hammer":
			return { "startup": int(34 * m), "active": 6, "recovery": 36, "cancel": 99, "hitbox": [0, -40, 62, 40],
				"mul": 1.3, "hitstop": 7, "hitstun": 30, "kb": [3.0, 0.0], "launch": 3.8, "mp": 0.0 }
		"toll":
			return { "startup": int(40 * m), "active": 1, "recovery": 46, "cancel": 99, "hitbox": [0, 0, 0, 0],
				"mul": 0.0, "hitstop": 0, "hitstun": 0, "kb": [0, 0], "launch": 0.0, "mp": 0.0 }
		_:
			return { "startup": int(26 * m), "active": 1, "recovery": 70, "cancel": 99, "hitbox": [0, 0, 0, 0],
				"mul": 0.0, "hitstop": 0, "hitstun": 0, "kb": [0, 0], "launch": 0.0, "mp": 0.0 }


func _run_pattern(p: Fighter) -> void:
	var s := int(cur_atk["startup"])
	vel.x = 0.0
	if t == s:
		match pattern:
			"hammer":
				world.shake(4.0)
				Sfx.play("bell", 0.2)
			"toll":
				Sfx.play("bell", 0.0)
				world.shake(3.0)
				var n := 12 if phase == 2 else 8
				for i in range(n):
					var a := TAU * float(i) / float(n) + (0.2 if phase == 2 else 0.0)
					var v := Vector2(cos(a), sin(a) * 0.8) * (1.9 if phase == 2 else 1.6)
					world.spawn_projectile(self, position + Vector2(0, -34), v,
						{ "mul": 0.8, "hitstop": 3, "hitstun": 20, "kb": [1.8, 0.0], "launch": 0.0, "mp": 0.0 }, "note")
			"bells":
				var n := 5 if phase == 2 else 3
				for i in range(n):
					var x := clampf(p.position.x + (i - (n - 1) / 2.0) * 46.0, 10.0, float(world.width) - 10.0)
					var pr: Projectile = world.spawn_projectile(self, Vector2(x, 20), Vector2(0, 0.5),
						{ "mul": 1.1, "hitstop": 5, "hitstun": 26, "kb": [1.0, 0.0], "launch": 3.0, "mp": 0.0 }, "bell")
					pr.gravity = 0.25
					pr.delay = 40 + i * 6
	if t >= atk_total(cur_atk):
		cur_atk = {}
		cooldown = int((50 + randi() % 40) * _speed_mul())
		set_state("idle")


func _draw() -> void:
	var tele := state == "atk" and t < int(cur_atk.get("startup", 0)) and (t / 4) % 2 == 0
	var rust := Color("4f7a72")
	var rust_dk := Color("34544f")
	var brass := Color("b48f55")
	if state in ["down", "dead"]:
		px(-28, -16, 56, 16, rust)
		px(-28, -16, 56, 3, brass)
		px(-6, -6, 12, 6, Tk.INK)
		draw_debug_boxes()
		return
	var sway := 1.0 if state == "run" and (t / 8) % 2 == 0 else 0.0
	# 다리
	px(-14, -10, 9, 10, Tk.INK)
	px(5, -10, 9, 10, Tk.INK)
	# 종 몸통 (위가 좁고 아래가 넓은 실루엣)
	for i in range(8):
		var half := 12 + i * 2
		px(-half, -54 + i * 6 + sway, half * 2, 6, rust if i % 3 != 2 else rust_dk)
	px(-26, -12 + sway, 52, 3, brass)
	px(-14, -56 + sway, 28, 3, brass)
	# 녹 자국
	px(-12, -40 + sway, 4, 8, Color("8a5a3a"))
	px(10, -28 + sway, 5, 6, Color("8a5a3a"))
	# 종 안쪽 어둠 속의 눈
	var eye := Tk.DANGER if tele or phase == 2 else Tk.M_EYE
	px(-8, -22 + sway, 4, 3, eye)
	px(4, -22 + sway, 4, 3, eye)
	# 손잡이 고리
	px(-4, -62 + sway, 8, 6, brass)
	px(-2, -60 + sway, 4, 3, Tk.INK)
	# 망치(종채)
	if state == "atk" and pattern == "hammer" and t >= int(cur_atk["startup"]):
		px(22, -30, 30, 4, Color("6b4f2a"))
		px(48, -38, 12, 18, brass)
	elif state == "atk" and pattern == "hammer":
		px(18, -70, 4, 30, Color("6b4f2a"))
		px(14, -80, 12, 12, brass)
	else:
		px(22, -40 + sway, 4, 28, Color("6b4f2a"))
		px(18, -16 + sway, 12, 10, brass)
	draw_debug_boxes()
