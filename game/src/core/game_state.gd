extends Node
## 플레이어 소유 데이터(세이브)와 진행 상태. 저장은 tmp -> rename, 직전본은 .bak 로 보존.

const SAVE_DIR := "user://save"
const SAVE_PATH := "user://save/slot0.json"
const SAVE_VERSION := 1
const LEVEL_CAP := 20

var data: Dictionary = {}
var current_class := "cls_tbd_01"
var last_result: Dictionary = {}


func _ready() -> void:
	load_game()


func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST:
		save_game()


static func new_save() -> Dictionary:
	return {
		"version": SAVE_VERSION,
		"saved_at": "",
		"account": { "gold": 0, "potions": 3, "revives": 1, "pages": 0, "applied_runs": [] },
		"characters": { "cls_tbd_01": { "lv": 1, "exp": 0 } },
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
	# version 1 이 첫 버전. 이후 버전이 생기면 여기서 단계별로 올린다.
	var base := new_save()
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
		data["characters"][cls] = { "lv": 1, "exp": 0 }
	return data["characters"][cls]


static func exp_to_next(lv: int) -> int:
	return 60 + lv * lv * 25


func stats(cls: String = "") -> Dictionary:
	if cls == "":
		cls = current_class
	var c: Dictionary = DataDB.get_row("classes", cls)
	var lv: int = int(char_data(cls)["lv"]) - 1
	return {
		"hp": int(c["base"]["hp"] + c["growth"]["hp"] * lv),
		"atk": int(c["base"]["atk"] + c["growth"]["atk"] * lv),
		"def": int(c["base"]["def"] + c["growth"]["def"] * lv),
		"crit": float(c["base"]["crit"]),
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
