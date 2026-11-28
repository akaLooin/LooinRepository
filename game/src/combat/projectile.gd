class_name Projectile
extends Node2D
## 투사체 (몬스터 잉크탄, 보스 충격파).

var world: Node = null
var owner_f: Fighter = null
var team := 1
var vel := Vector2.ZERO
var data: Dictionary = {}
var kind := "ink"
var life := 240
var size := Vector2(6, 6)
var remove_me := false
var gravity := 0.0
var delay := 0          # 0보다 크면 그동안 멈춰서 예고만 (판정 없음)
var pierce := false
var hit_ids: Dictionary = {}
var homing := 0.0       # 플레이어 쪽으로 꺾는 정도
var ground_y := 238.0


func active() -> bool:
	return delay <= 0


func rect() -> Rect2:
	return Rect2(position - Vector2(size.x / 2.0, size.y), size)


func tick() -> void:
	if delay > 0:
		delay -= 1
		queue_redraw()
		return
	vel.y += gravity
	if homing > 0.0 and world.player and not world.player.dead:
		var want: Vector2 = (world.player.position + Vector2(0, -12) - position).normalized() * vel.length()
		vel = vel.lerp(want, homing)
	position += vel
	if kind == "grenade" and position.y >= world.ground_below(position) - 1.0:
		remove_me = true
		world.explode(owner_f, position, data)
		return
	if (kind == "bell" or gravity > 0.0) and position.y >= ground_y:
		remove_me = true
		world.spawn_dust(Vector2(position.x, ground_y), 4)
		if kind == "bell":
			Sfx.play("bell", 0.15)
			world.shake(2.0)
		if kind == "sword":
			Sfx.play("crit", 0.0)
			world.shake(5.0)
	life -= 1
	if life <= 0 or position.x < -20 or position.x > float(world.width) + 20:
		remove_me = true
	queue_redraw()


func _draw() -> void:
	if delay > 0 and kind == "bell":
		# 떨어질 자리 예고: 바닥의 깜빡이는 표시 (자기 위치 기준 아래쪽)
		var gy := ground_y - position.y
		if (delay / 4) % 2 == 0:
			draw_rect(Rect2(-9, gy - 2, 18, 2), Color(Tk.DANGER, 0.85))
		return
	if kind == "bell":
		draw_rect(Rect2(-7, -14, 14, 12), Color("8a6a3a"))
		draw_rect(Rect2(-9, -4, 18, 3), Color("6b4f2a"))
		draw_rect(Rect2(-2, -1, 4, 2), Tk.INK)
		draw_rect(Rect2(-5, -12, 3, 6), Color("b48f55"))
		return
	if kind in ["arrow", "rainarrow", "snipe"]:
		var a := vel.angle()
		var ln := 22.0 if kind == "snipe" else 9.0
		var d := Vector2(cos(a), sin(a))
		if kind == "snipe":
			draw_line(-d * 60.0, Vector2.ZERO, Color(Tk.GOLD, 0.35), 6.0)
		draw_line(-d * ln, Vector2.ZERO, Color("c9a06a"), 2.0 if kind == "snipe" else 1.0)
		draw_line(Vector2.ZERO, d * 3.0, Color("dfe6ee"), 2.0)
		draw_line(-d * ln, -d * (ln - 3.0) + Vector2(-d.y, d.x) * 2.0, Tk.GOLD, 1.0)
		draw_line(-d * ln, -d * (ln - 3.0) - Vector2(-d.y, d.x) * 2.0, Tk.GOLD, 1.0)
		return
	if kind == "grenade":
		draw_circle(Vector2.ZERO, 4, Color("3a2a22"))
		draw_rect(Rect2(-1, -6, 2, 2), Color("9aa3ad"))
		if (life / 4) % 2 == 0:
			draw_rect(Rect2(1, -8, 2, 2), Tk.DANGER)
		return
	if kind == "net":
		for k in range(-5, 6, 3):
			draw_line(Vector2(k, -6), Vector2(k, 6), Color("c9b28a"), 1.0)
			draw_line(Vector2(-6, k), Vector2(6, k), Color("c9b28a"), 1.0)
		return
	if kind == "trap":
		var blink := (life / 15) % 2 == 0
		draw_rect(Rect2(-7, -3, 14, 3), Color("4a3220"))
		draw_rect(Rect2(-5, -5, 10, 2), Color("9aa3ad"))
		draw_rect(Rect2(-1, -7, 2, 2), Tk.DANGER if blink else Color("6b2f3a"))
		return
	if kind == "spike":
		for k in range(-6, 7, 3):
			draw_colored_polygon(PackedVector2Array([Vector2(k - 1, 0), Vector2(k, -6), Vector2(k + 1, 0)]), Color("b4c0cf"))
		draw_rect(Rect2(-8, -1, 16, 1), Color("4a3220"))
		return
	if kind == "slash" or kind == "goldslash":
		var dir := 1.0 if vel.x >= 0.0 else -1.0
		var c1 := Color("fff1b8") if kind == "goldslash" else Color("f4f8fc")
		var c2 := Tk.GOLD if kind == "goldslash" else Color("b4c0cf", 0.8)
		for i in range(5):
			var k := absf(i - 2.0)
			draw_rect(Rect2((4.0 - k * 3.0) * dir - 2.0, -22 + i * 5, 4, 5), c1)
			draw_rect(Rect2((1.0 - k * 3.0) * dir - 2.0, -22 + i * 5, 3, 5), c2)
		return
	if kind == "sword":
		draw_rect(Rect2(-2, -30, 4, 26), Color("f4f8fc"))
		draw_rect(Rect2(1, -30, 1, 26), Color("b4c0cf"))
		draw_rect(Rect2(-5, -34, 10, 3), Tk.GOLD)
		draw_rect(Rect2(-1, -40, 2, 6), Tk.LEATHER)
		draw_rect(Rect2(-6, -60, 12, 30), Color(Tk.GOLD, 0.18))
		return
	if kind == "note":
		draw_rect(Rect2(-3, -5, 5, 4), Tk.INK)
		draw_rect(Rect2(1, -12, 1, 8), Tk.INK)
		draw_rect(Rect2(1, -12, 4, 2), Tk.INK)
		return
	if kind == "orb":
		var f := (life / 4) % 2
		draw_rect(Rect2(-4 - f, -8 - f, 8 + f * 2, 8 + f * 2), Color(Tk.GOLD, 0.5))
		draw_rect(Rect2(-3, -7, 6, 6), Color("fff1b8"))
		return
	if kind == "wave":
		var f := (life / 3) % 2
		draw_rect(Rect2(-6, -14 + f, 12, 14 - f), Color(Tk.B_PAGE, 0.9))
		draw_rect(Rect2(-4, -10, 8, 10), Tk.B_SPINE)
	elif kind == "page":
		draw_rect(Rect2(-3, -5, 6, 4), Tk.PAPER)
		draw_rect(Rect2(-2, -4, 4, 1), Tk.PAPER_DIM)
	else:
		draw_rect(Rect2(-3, -6, 6, 6), Tk.M_INK)
		draw_rect(Rect2(-2, -5, 2, 2), Tk.M_INK_HI)
