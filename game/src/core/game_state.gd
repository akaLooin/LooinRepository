extends Node
## 플레이어 소유 데이터(세이브)와 진행 상태. 저장은 tmp -> rename, 직전본은 .bak 로 보존.

const SAVE_DIR := "user://save"
const SAVE_PATH := "user://save/slot0.json"
const SAVE_VERSION := 2
const LEVEL_CAP := 20

var data: Dictionary = {}
var current_class := "cls_tbd_01"
var last_result: Dictionary = {}


func _ready() -> void:
	load_game()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_game()


static func new_char() -> Dictionary:
	return { "lv": 1, "exp": 0, "equip": {}, "skills": { "sk_mp1": 1 }, "pet": "" }


static func new_save() -> Dictionary:
	var c := new_char()
	c["equip"] = { "weapon": "i1", "top": "i2" }
	return {
		"version": SAVE_VERSION,
		"saved_at": "",
		"account": { "gold": 300, "potions": 3, "revives": 1, "pages": 5, "applied_runs": [],
			"inventory": [ { "uid": "i1", "item": "eq_wpn_01", "enh": 0 }, { "uid": "i2", "item": "eq_top_01", "enh": 0 } ],
			"next_uid": 3, "pets": [] },
		"characters": { "cls_tbd_01": c },
		"progress": { "cleared": {} },
		"settings": { "show_touch": "auto", "show_hitboxes": false },
	}


func load_game() -> void:
	data = new_save()
	for path in [SAVE_PATH, SAVE_PATH + ".bak"]:
		if not FileAccess.file_exists(path):
			continue
		var f := FileAccess.open(path, FileAccess.READ)
		var parsed = JSON.parse_string(f.get_as_text())
		if typeof(parsed) == TYPE_DICTIONARY and int(parsed.get("version", 0)) >= 1:
			data = _migrate(parsed)
			return


func _migrate(d: Dictionary) -> Dictionary:
	var base := new_save()
	if int(d.get("version", 1)) < 2:
		# v1 -> v2: 인벤토리·장비·스킬·펫 추가. 기존 진행(레벨·골드)은 유지하고 기본 장비를 지급.
		d["account"]["inventory"] = base["account"]["inventory"]
		d["account"]["next_uid"] = 3
		for cls in d["characters"]:
			var nc := new_char()
			for k in nc:
				if not d["characters"][cls].has(k):
					d["characters"][cls][k] = nc[k]
		if d["characters"].has("cls_tbd_01"):
			d["characters"]["cls_tbd_01"]["equip"] = { "weapon": "i1", "top": "i2" }
		d["version"] = 2
	for k in base:
		if not d.has(k):
			d[k] = base[k]
	for k in base["account"]:
		if not d["account"].has(k):
			d["account"][k] = base["account"][k]
	return d


func save_game() -> bool:
	DirAccess.make_dir_recursive_absolute(SAVE_DIR)
	data["saved_at"] = Time.get_datetime_string_from_system(true)
	var tmp := SAVE_PATH + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		push_error("save failed: " + str(FileAccess.get_open_error()))
		return false
	f.store_string(JSON.stringify(data, "  "))
	f.close()
	if FileAccess.file_exists(SAVE_PATH):
		DirAccess.copy_absolute(SAVE_PATH, SAVE_PATH + ".bak")
		DirAccess.remove_absolute(SAVE_PATH)
	return DirAccess.rename_absolute(tmp, SAVE_PATH) == OK


func reset_save() -> void:
	data = new_save()
	save_game()


# ---------- 캐릭터 성장 ----------

func char_data(cls: String = "") -> Dictionary:
	if cls == "":
		cls = current_class
	if not data["characters"].has(cls):
		data["characters"][cls] = new_char()
	return data["characters"][cls]


static func exp_to_next(lv: int) -> int:
	return 60 + lv * lv * 25


## 최종 능력치 = 기본 + 성장 + 장비(강화 포함) → 패시브/펫 % 보너스. 전투 보조 수치도 함께 돌려준다.
func stats(cls: String = "") -> Dictionary:
	if cls == "":
		cls = current_class
	var c: Dictionary = DataDB.get_row("classes", cls)
	var cd := char_data(cls)
	var lv: int = int(cd["lv"]) - 1
	var st := {
		"hp": float(c["base"]["hp"] + c["growth"]["hp"] * lv),
		"atk": float(c["base"]["atk"] + c["growth"]["atk"] * lv),
		"def": float(c["base"]["def"] + c["growth"]["def"] * lv),
		"crit": float(c["base"]["crit"]),
	}
	for slot in cd["equip"]:
		var it := Meta.find(cd["equip"][slot])
		if it.is_empty():
			continue
		var ist := Meta.item_stats(it)
		for k in ist:
			st[k] = float(st.get(k, 0.0)) + float(ist[k])
	var pct := { "atk_pct": 0.0, "hp_pct": 0.0, "mp_gain_pct": 0.0, "back_pct": 0.0, "air_jumps": 0.0 }
	var nodes := Meta.tree(cls)
	for sid in cd["skills"]:
		var eff: Dictionary = nodes.get(sid, {}).get("effect", {})
		for k in eff:
			pct[k] = float(pct.get(k, 0.0)) + float(eff[k]) * int(cd["skills"][sid])
	var pet_id: String = cd.get("pet", "")
	if pet_id != "":
		var bonus: Dictionary = DataDB.get_row("pets", pet_id).get("bonus", {})
		for k in bonus:
			pct[k] = float(pct.get(k, 0.0)) + float(bonus[k])
	var skill_mul := {}
	for sid in cd["skills"]:
		if nodes.get(sid, {}).get("kind", "") == "active":
			var atk_id: String = DataDB.get_row("skills", sid)["attack"]
			skill_mul[atk_id] = 1.0 + 0.15 * (int(cd["skills"][sid]) - 1)
	return {
		"hp": int(st["hp"] * (1.0 + pct["hp_pct"])),
		"atk": int(st["atk"] * (1.0 + pct["atk_pct"])),
		"def": int(st["def"]),
		"crit": float(st["crit"]),
		"mp_gain_mul": 1.0 + pct["mp_gain_pct"],
		"back_bonus": pct["back_pct"],
		"air_jumps": int(pct["air_jumps"]),
		"skill_mul": skill_mul,
		"skills": (cd["skills"] as Dictionary).duplicate(),
		"pet": pet_id,
	}


## 보상 반영. 같은 run_id 는 두 번 반영하지 않는다 (앱이 결과 화면에서 꺼졌다 켜지는 경우 대비).
func apply_rewards(result: Dictionary) -> Dictionary:
	var receipt := { "level_ups": 0, "applied": false }
	var applied: Array = data["account"]["applied_runs"]
	if applied.has(result["run_id"]):
		return receipt
	applied.append(result["run_id"])
	while applied.size() > 20:
		applied.pop_front()
	data["account"]["gold"] += int(result["gold"])
	var cd := char_data()
	cd["exp"] = int(cd["exp"]) + int(result["exp"])
	while int(cd["lv"]) < LEVEL_CAP and int(cd["exp"]) >= exp_to_next(int(cd["lv"])):
		cd["exp"] = int(cd["exp"]) - exp_to_next(int(cd["lv"]))
		cd["lv"] = int(cd["lv"]) + 1
		receipt["level_ups"] += 1
	if result.get("cleared", false):
		var key: String = result["dungeon"] + ":normal"
		var prev: Dictionary = data["progress"]["cleared"].get(key, {})
		if prev.is_empty() or RankCalc.rank_value(result["rank"]) > RankCalc.rank_value(prev["best_rank"]):
			data["progress"]["cleared"][key] = { "best_rank": result["rank"], "best_time": result["time"] }
	for item_id in result.get("drops", []):
		Meta.add_item(item_id)
	var pet: String = result.get("pet", "")
	if pet != "" and not data["account"]["pets"].has(pet):
		data["account"]["pets"].append(pet)
		receipt["new_pet"] = pet
		if char_data()["pet"] == "":
			char_data()["pet"] = pet
	receipt["applied"] = true
	save_game()
	return receipt


func grant_card(card: Dictionary) -> void:
	match card["kind"]:
		"gold":
			data["account"]["gold"] += int(card["amount"])
		"potion":
			data["account"]["potions"] += int(card["amount"])
		"revive":
			data["account"]["revives"] += int(card["amount"])
		"page":
			data["account"]["pages"] += int(card["amount"])
	save_game()
