class_name Fighter
extends Node2D
## 플레이어·몬스터 공통: 60틱 고정 물리, 단방향 발판, 피격/다운/기상 상태, 공격 프레임 데이터 실행.
## position = 발 중앙(바닥 기준점).

const MAX_FALL := 7.0
const DOWN_FRAMES := 40
const GETUP_FRAMES := 18
const GETUP_INVULN := 45

var world: Node = null
var team := 0
var vel := Vector2.ZERO
var w := 12.0
var h := 26.0
var facing := 1
var max_hp := 100
var hp := 100
var atk := 10.0
var def := 0.0
var crit := 0.0
var gravity := 0.32
var flying := false
var super_armor := false

var state := "idle"
var t := 0
var stun := 0
var hitstop := 0
var invuln := 0
var on_ground := false
var drop_timer := 0
var flash := 0
var dead := false
var remove_me := false

var def_down := 0.0     # 방어 약화 비율
var def_down_t := 0     # 남은 틱
var sprite: Dictionary = {}     # data/sprites.json 항목 (+ 로드된 "tex")

var cur_atk: Dictionary = {}
var cur_atk_id := ""
var _hit_log: Dictionary = {}   # 대상 instance_id -> 마지막으로 맞힌 히트 번호


func hurtbox() -> Rect2:
	return Rect2(position.x - w / 2.0, position.y - h, w, h)


func attack_rect(a: Dictionary) -> Rect2:
	var hb: Array = a["hitbox"]
	var x0: float = position.x + facing * float(hb[0])
	var y0: float = position.y + float(hb[1])
	if facing > 0:
		return Rect2(x0, y0, float(hb[2]), float(hb[3]))
	return Rect2(x0 - float(hb[2]), y0, float(hb[2]), float(hb[3]))


func set_state(s: String) -> void:
	state = s
	t = 0


func start_attack(id: String, data: Dictionary) -> void:
	cur_atk_id = id
	cur_atk = data
	_hit_log.clear()
	set_state("atk")


func atk_total(a: Dictionary) -> int:
	return int(a["startup"]) + int(a["active"]) + int(a["recovery"])


## 지금 판정이 살아있는 공격이면 그 데이터를, 아니면 빈 Dictionary.
func active_attack() -> Dictionary:
	if cur_atk.is_empty() or not is_attacking():
		return {}
	var s := int(cur_atk["startup"])
	if t >= s and t < s + int(cur_atk["active"]):
		return cur_atk
	return {}


func is_attacking() -> bool:
	return state == "atk"


## 같은 공격으로 같은 대상을 몇 번 때릴 수 있는지 (다단히트).
func can_hit(target: Fighter) -> bool:
	var hits := int(cur_atk.get("hits", 1))
	var active := int(cur_atk["active"])
	var interval := maxi(1, active / hits)
	var idx := mini(hits - 1, (t - int(cur_atk["startup"])) / interval)
	var last := int(_hit_log.get(target.get_instance_id(), -1))
	if idx > last:
		_hit_log[target.get_instance_id()] = idx
		return true
	return false


func is_down_state() -> bool:
	return state in ["down", "getup"]


func is_hurt_state() -> bool:
	return state in ["hurt", "air_hurt", "down", "getup", "dead"]


## 매 틱 호출. hitstop 중에는 아무것도 하지 않는다.
func tick(input: Dictionary) -> void:
	if hitstop > 0:
		hitstop -= 1
		return
	t += 1
	if invuln > 0:
		invuln -= 1
	if flash > 0:
		flash -= 1
	if drop_timer > 0:
		drop_timer -= 1
	if def_down_t > 0:
		def_down_t -= 1
	if not _tick_common_states():
		think(input)
	physics()
	queue_redraw()


## 피격/다운 계열 상태 처리. 처리했으면 true.
func _tick_common_states() -> bool:
	match state:
		"hurt":
			vel.x *= 0.85
			if t >= stun:
				set_state("idle")
			return true
		"air_hurt":
			vel.x *= 0.98
			if on_ground and t > 2:
				vel = Vector2.ZERO
				if dead:
					set_state("dead")
				else:
					set_state("down")
					invuln = DOWN_FRAMES + GETUP_FRAMES
			return true
		"down":
			vel.x *= 0.7
			if t >= DOWN_FRAMES:
				set_state("getup")
			return true
		"getup":
			if t >= GETUP_FRAMES:
				invuln = GETUP_INVULN
				on_getup()
				set_state("idle")
			return true
		"dead":
			vel.x *= 0.8
			if t > 50:
				remove_me = true
			return true
	return false


func on_getup() -> void:
	pass


## 하위 클래스가 조작/AI 를 구현.
func think(_input: Dictionary) -> void:
	pass


func physics() -> void:
	var use_gravity := not flying or state in ["air_hurt", "dead"]
	if use_gravity:
		vel.y = minf(vel.y + gravity, MAX_FALL)
	var prev_bottom := position.y
	position.x = clampf(position.x + vel.x, w / 2.0, float(world.width) - w / 2.0)
	position.y += vel.y
	on_ground = false
	if not use_gravity:
		position.y = clampf(position.y, 30.0, 236.0)
		return
	if vel.y >= 0.0:
		for p in world.platforms:
			if p["oneway"] and drop_timer > 0:
				continue
			var r: Rect2 = p["rect"]
			if position.x + w / 2.0 > r.position.x and position.x - w / 2.0 < r.end.x:
				if prev_bottom <= r.position.y + 0.01 and position.y >= r.position.y:
					position.y = r.position.y
					vel.y = 0.0
					on_ground = true
					break
	if position.y > 300.0:   # 혹시 바닥 밑으로 빠지면 복구
		position.y = 238.0
		vel.y = 0.0


## 지금 서 있는 발판이 단방향(아래 점프 가능)인지
func standing_on_oneway() -> bool:
	if not on_ground:
		return false
	for p in world.platforms:
		var r: Rect2 = p["rect"]
		if p["oneway"] and absf(position.y - r.position.y) < 0.5 and position.x + w / 2.0 > r.position.x and position.x - w / 2.0 < r.end.x:
			return true
	return false


## 피격 처리. 데미지 계산은 이미 끝난 상태로 들어온다.
func take_hit(attacker: Fighter, a: Dictionary, res: Dictionary) -> void:
	hp = maxi(0, hp - int(res["dmg"]))
	flash = 6
	var dir := 1 if attacker.position.x <= position.x else -1
	var kb: Array = a["kb"]
	if hp <= 0:
		dead = true
		vel = Vector2(float(kb[0]) * dir + 1.0 * dir, -3.6)
		on_ground = false
		set_state("air_hurt")
		return
	if super_armor and not is_down_state():
		return
	if is_down_state():
		return
	var launch := float(a["launch"])
	if not on_ground or state == "air_hurt":
		launch = maxf(launch, 2.3)   # 공중 콤보: 맞으면 살짝 다시 뜬다
	if launch > 0.0:
		vel = Vector2(float(kb[0]) * dir * 0.6, -launch)
		on_ground = false
		set_state("air_hurt")
	else:
		vel.x = float(kb[0]) * dir
		stun = int(a["hitstun"])
		set_state("hurt")
	if not flying:
		facing = -dir


# ---------- 스프라이트 시트 ----------

## id 의 스프라이트 시트를 찾아 둔다. 시트 파일이 없으면 코드 그림을 쓴다.
func load_sprite(id: String) -> void:
	var row: Dictionary = DataDB.tables.get("sprites", {}).get(id, {})
	if row.is_empty() or not ResourceLoader.exists(row["sheet"]):
		sprite = {}
		return
	sprite = row.duplicate()
	sprite["tex"] = load(row["sheet"])


func anim_name() -> String:
	match state:
		"run":
			return "run"
		"air":
			return "air"
		"dash":
			return "dash"
		"atk":
			return "atk"
		"hurt", "air_hurt":
			return "hurt"
		"guard":
			return "guard"
		"down", "getup", "dead":
			return "down"
	return "idle"


## 스프라이트로 그렸으면 true
func draw_sprite() -> bool:
	if sprite.is_empty():
		return false
	var anims: Dictionary = sprite["anims"]
	var key := anim_name()
	if not anims.has(key):
		key = "idle"
	var a: Dictionary = anims[key]
	var frames := int(a.get("frames", 1))
	var idx := 0
	if a.get("phased", false) and not cur_atk.is_empty():
		var s := int(cur_atk["startup"])
		idx = 0 if t < s else (1 if t < s + int(cur_atk["active"]) else 2)
		idx = mini(idx, frames - 1)
	elif frames > 1:
		idx = int(t * float(a.get("fps", 6)) / 60.0) % frames
	var col := int(a.get("col", 0)) + idx
	var fw := float(sprite["frame"][0])
	var fh := float(sprite["frame"][1])
	var src := Rect2(col * fw, int(a["row"]) * fh, fw, fh)
	var o := Vector2(float(sprite["origin"][0]), float(sprite["origin"][1]))
	var mod := Color(1, 1, 1, 1)
	if flash > 0 and flash % 2 == 0:
		mod = Color(3, 3, 3, 1)
	if facing < 0:
		draw_set_transform(Vector2.ZERO, 0.0, Vector2(-1, 1))
	draw_texture_rect_region(sprite["tex"], Rect2(-o, Vector2(fw, fh)), src, mod)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
	return true


# ---------- 그리기 도우미 (픽셀 사각형) ----------

func px(x: float, y: float, ww: float, hh: float, c: Color) -> void:
	if flash > 0 and flash % 2 == 0:
		c = Color(1, 1, 1, c.a)
	var fx := -x - ww if facing < 0 else x
	draw_rect(Rect2(roundf(fx), roundf(y), ww, hh), c)


func draw_debug_boxes() -> void:
	if not world.show_hitboxes:
		return
	var hb := hurtbox()
	draw_rect(Rect2(hb.position - position, hb.size), Color(0.2, 1, 0.4, 0.8), false, 1.0)
	var a := active_attack()
	if not a.is_empty():
		var ar := attack_rect(a)
		draw_rect(Rect2(ar.position - position, ar.size), Color(1, 0.2, 0.2, 0.8), false, 1.0)
