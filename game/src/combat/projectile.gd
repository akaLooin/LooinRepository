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


func rect() -> Rect2:
	return Rect2(position - Vector2(size.x / 2.0, size.y), size)


func tick() -> void:
	position += vel
	life -= 1
	if life <= 0 or position.x < -20 or position.x > float(world.width) + 20:
		remove_me = true
	queue_redraw()


func _draw() -> void:
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
