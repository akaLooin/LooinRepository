class_name Pet
extends Node2D
## 펫: 플레이어 뒤를 따라다니며 일정 주기로 가장 가까운 적에게 종잇조각을 쏜다. 피해는 플레이어 공격력 기반.

var world: Node = null
var pet: Dictionary = {}
var pet_id := ""
var timer := 120
var t := 0


func setup(id: String) -> void:
	pet_id = id
	pet = DataDB.get_row("pets", id)


func tick() -> void:
	t += 1
	var p: Player = world.player
	var target := p.position + Vector2(-18 * p.facing, -34 + sin(t * 0.07) * 3.0)
	position = position.lerp(target, 0.08)
	timer -= 1
	if timer <= 0 and not p.dead:
		var best: Fighter = null
		var bd := 200.0
		for e in world.enemies:
			if e.dead:
				continue
			var dd: float = position.distance_to(e.position + Vector2(0, -e.h / 2.0))
			if dd < bd:
				bd = dd
				best = e
		if best:
			var dir := (best.position + Vector2(0, -best.h / 2.0) - position).normalized()
			world.spawn_projectile(p, position, dir * 3.2, { "mul": float(pet["mul"]), "hitstop": 2, "hitstun": 14,
				"kb": [0.8, 0.0], "launch": 0.0, "mp": 0.02 }, "page")
			timer = int(pet["interval"])
		else:
			timer = 30
	queue_redraw()


func _draw() -> void:
	# 책벌레 꼬물: 크림색 몸통 마디 + 동그란 안경
	var wob := int(t / 10) % 2
	var face := 1 if world and world.player.facing > 0 else -1
	for i in range(3):
		var x := (-i * 4) * face
		draw_rect(Rect2(x - 2, -3 + (wob if i == 1 else 0), 5, 5), Color("9bd36b") if i > 0 else Color("b6e38a"))
	draw_rect(Rect2(1 * face - 1 if face > 0 else -4, -4, 3, 3), Tk.INK)
	draw_rect(Rect2((2 if face > 0 else -3), -3, 1, 1), Tk.TEXT)
	draw_rect(Rect2(-6 * face - 1, -7, 3, 4), Tk.PAPER)
