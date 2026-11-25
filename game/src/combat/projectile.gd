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
	if (kind == "bell" or gravity > 0.0) and position.y >= ground_y:
		remove_me = true
		world.spawn_dust(Vector2(position.x, ground_y), 4)
		if kind == "bell":
			Sfx.play("bell", 0.15)
			world.shake(2.0)
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
