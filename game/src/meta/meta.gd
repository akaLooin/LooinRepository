class_name Meta
extends RefCounted
## 성장 시스템: 인벤토리·장비·강화·상점·스킬 트리·펫. 세이브(GameState.data)를 직접 다룬다.
## 실패 시 사람이 읽을 이유 문자열을, 성공 시 "" 를 돌려준다.

const SLOTS := ["weapon", "helm", "top", "bottom", "glove", "shoe"]
const SLOT_NAMES := { "weapon": "무기", "helm": "머리", "top": "상의", "bottom": "하의", "glove": "장갑", "shoe": "신발" }
const GRADE_NAMES := { "common": "일반", "rare": "희귀", "epic": "영웅" }
const STAT_NAMES := { "atk": "공격", "def": "방어", "hp": "HP", "crit": "치명" }
const ENH_MAX := 5
const ENH_RATE := [1.0, 0.9, 0.75, 0.6, 0.45]
const ENH_BONUS := 0.12
const SHOP := [
	{ "kind": "potion", "name": "HP 포션", "price": 50 },
	{ "kind": "revive", "name": "부활 책갈피", "price": 300 },
	{ "kind": "page", "name": "페이지 조각 ×3", "price": 120, "amount": 3 },
	{ "kind": "item", "item": "eq_hel_01" },
	{ "kind": "item", "item": "eq_bot_01" },
	{ "kind": "item", "item": "eq_glv_01" },
	{ "kind": "item", "item": "eq_sho_01" },
]


static func acc() -> Dictionary:
	return GameState.data["account"]


static func inv() -> Array:
	return acc()["inventory"]


static func item_def(item_id: String) -> Dictionary:
	return DataDB.get_row("items", item_id)


static func find(uid: String) -> Dictionary:
	for it in inv():
		if it["uid"] == uid:
			return it
	return {}


static func add_item(item_id: String) -> String:
	var a := acc()
	var uid := "i%d" % int(a["next_uid"])
	a["next_uid"] = int(a["next_uid"]) + 1
	inv().append({ "uid": uid, "item": item_id, "enh": 0 })
	return uid


static func equipped_by(uid: String) -> String:
	var chars: Dictionary = GameState.data["characters"]
	for cls in chars:
		if (chars[cls]["equip"] as Dictionary).values().has(uid):
			return cls
	return ""


static func equipped(cls: String, slot: String) -> Dictionary:
	var uid: String = GameState.char_data(cls)["equip"].get(slot, "")
	return find(uid) if uid != "" else {}


static func equip(cls: String, uid: String) -> String:
	var it := find(uid)
	if it.is_empty():
		return "없는 아이템입니다"
	var d := item_def(it["item"])
	var cd := GameState.char_data(cls)
	if int(d["lv"]) > int(cd["lv"]):
		return "레벨 %d 이상 필요합니다" % int(d["lv"])
	var owner := equipped_by(uid)
	if owner != "" and owner != cls:
		return "다른 캐릭터가 착용 중입니다"
	cd["equip"][d["slot"]] = uid
	return ""


static func unequip(cls: String, slot: String) -> void:
	GameState.char_data(cls)["equip"].erase(slot)


static func sell_price(it: Dictionary) -> int:
	return int(int(item_def(it["item"])["price"]) / 4.0 * (1.0 + 0.5 * int(it["enh"])))


static func sell(uid: String) -> String:
	var it := find(uid)
	if it.is_empty():
		return "없는 아이템입니다"
	if equipped_by(uid) != "":
		return "착용 중인 장비는 팔 수 없습니다"
	acc()["gold"] = int(acc()["gold"]) + sell_price(it)
	inv().erase(it)
	return ""


static func item_stats(it: Dictionary) -> Dictionary:
	var base: Dictionary = item_def(it["item"])["stats"]
	var out := {}
	var mul := 1.0 + ENH_BONUS * int(it.get("enh", 0))
	for k in base:
		out[k] = float(base[k]) if k == "crit" else float(int(round(float(base[k]) * mul)))
	return out


static func stat_text(st: Dictionary) -> String:
	var parts: PackedStringArray = []
	for k in ["atk", "def", "hp", "crit"]:
		if st.has(k):
			parts.append("%s +%d%s" % [STAT_NAMES[k], int(round(st[k] * 100.0)) if k == "crit" else int(st[k]), "%" if k == "crit" else ""])
	return " · ".join(parts)


static func item_label(it: Dictionary) -> String:
	var d := item_def(it["item"])
	var enh := int(it.get("enh", 0))
	return "[%s] %s%s" % [GRADE_NAMES[d["grade"]], d["name"], (" +%d" % enh) if enh > 0 else ""]


static func grade_color(item_id: String) -> Color:
	match item_def(item_id)["grade"]:
		"rare":
			return Tk.MP
		"epic":
			return Tk.BACK_ATK
	return Tk.TEXT


# ---------- 강화 ----------

static func enhance_cost(it: Dictionary) -> Dictionary:
	var enh := int(it["enh"])
	var grade_mul := { "common": 1, "rare": 2, "epic": 3 }[item_def(it["item"])["grade"]] as int
	return { "gold": 80 * (enh + 1) * grade_mul, "pages": enh + 1, "rate": ENH_RATE[mini(enh, ENH_RATE.size() - 1)] }


## 결과: "success" | "fail" | 실패 이유 문자열
static func try_enhance(uid: String, rng: RandomNumberGenerator) -> String:
	var it := find(uid)
	if it.is_empty():
		return "없는 아이템입니다"
	if int(it["enh"]) >= ENH_MAX:
		return "최대 강화입니다"
	var c := enhance_cost(it)
	if int(acc()["gold"]) < int(c["gold"]):
		return "골드가 부족합니다"
	if int(acc()["pages"]) < int(c["pages"]):
		return "페이지 조각이 부족합니다"
	acc()["gold"] = int(acc()["gold"]) - int(c["gold"])
	acc()["pages"] = int(acc()["pages"]) - int(c["pages"])
	if rng.randf() < float(c["rate"]):
		it["enh"] = int(it["enh"]) + 1
		return "success"
	return "fail"   # 데모: 실패해도 강화 수치는 유지 (재료만 소모)


# ---------- 상점 ----------

static func shop_price(entry: Dictionary) -> int:
	if entry["kind"] == "item":
		return int(item_def(entry["item"])["price"])
	return int(entry["price"])


static func shop_name(entry: Dictionary) -> String:
	if entry["kind"] == "item":
		return item_label({ "item": entry["item"], "enh": 0 })
	return entry["name"]


static func buy(entry: Dictionary) -> String:
	var price := shop_price(entry)
	if int(acc()["gold"]) < price:
		return "골드가 부족합니다"
	acc()["gold"] = int(acc()["gold"]) - price
	match entry["kind"]:
		"potion":
			acc()["potions"] = int(acc()["potions"]) + 1
		"revive":
			acc()["revives"] = int(acc()["revives"]) + 1
		"page":
			acc()["pages"] = int(acc()["pages"]) + int(entry.get("amount", 1))
		"item":
			add_item(entry["item"])
	return ""


# ---------- 스킬 트리 ----------

static func tree(cls: String) -> Dictionary:
	return DataDB.get_row("skill_tree", DataDB.get_row("classes", cls)["skill_tree"])["nodes"]


static func skill_lv(cls: String, sid: String) -> int:
	return int(GameState.char_data(cls)["skills"].get(sid, 0))


static func sp_total(cls: String) -> int:
	return int(GameState.char_data(cls)["lv"]) + 1


static func sp_spent(cls: String) -> int:
	var n := 0
	for sid in GameState.char_data(cls)["skills"]:
		n += int(GameState.char_data(cls)["skills"][sid])
	return n


static func sp_left(cls: String) -> int:
	return sp_total(cls) - sp_spent(cls)


static func can_learn(cls: String, sid: String) -> String:
	var node: Dictionary = tree(cls).get(sid, {})
	if node.is_empty():
		return "없는 스킬입니다"
	if skill_lv(cls, sid) >= int(node["max"]):
		return "최대 레벨"
	if int(GameState.char_data(cls)["lv"]) < int(node["req_lv"]):
		return "Lv%d 필요" % int(node["req_lv"])
	for p in node["pre"]:
		if skill_lv(cls, p) < 1:
			return "%s 먼저" % tree(cls)[p]["name"]
	if sp_left(cls) <= 0:
		return "SP 부족"
	return ""


static func learn(cls: String, sid: String) -> String:
	var why := can_learn(cls, sid)
	if why == "":
		GameState.char_data(cls)["skills"][sid] = skill_lv(cls, sid) + 1
	return why


static func reset_skills(cls: String) -> void:
	GameState.char_data(cls)["skills"] = { "sk_mp1": 1 }


# ---------- 펫 ----------

static func equip_pet(cls: String, pid: String) -> void:
	GameState.char_data(cls)["pet"] = pid


# ---------- 드롭 ----------

static func roll_drops(drops: Dictionary, rng: RandomNumberGenerator) -> Array:
	var out: Array = []
	for i in range(int(drops.get("rolls", 0))):
		var r := rng.randf()
		var acc_p := 0.0
		for row in drops.get("table", []):
			acc_p += float(row[1])
			if r < acc_p:
				out.append(row[0])
				break
	return out


# ---------- 미션 ----------

static func mission_done(mid: String) -> bool:
	var c: Dictionary = DataDB.get_row("missions", mid)["cond"]
	var cls := GameState.current_class
	match c["type"]:
		"clear":
			return GameState.data["progress"]["cleared"].has("%s:%s" % [c["dungeon"], c.get("difficulty", "normal")])
		"level":
			for k in GameState.data["characters"]:
				if int(GameState.data["characters"][k]["lv"]) >= int(c["value"]):
					return true
			return false
		"skill":
			return skill_lv(cls, c["skill"]) > 0
		"enhance":
			for it in inv():
				if int(it["enh"]) >= int(c["value"]):
					return true
			return false
		"equip_grade":
			var order := ["common", "rare", "epic"]
			for slot in SLOTS:
				var it := equipped(cls, slot)
				if not it.is_empty() and order.find(item_def(it["item"])["grade"]) >= order.find(c["grade"]):
					return true
			return false
	return false


static func mission_state(mid: String) -> String:
	if GameState.data["progress"]["missions"].get(mid, "") == "claimed":
		return "claimed"
	return "done" if mission_done(mid) else "open"


static func claim_mission(mid: String) -> String:
	if mission_state(mid) != "done":
		return "아직 완료하지 않았습니다"
	var r: Dictionary = DataDB.get_row("missions", mid)["reward"]
	for k in r:
		acc()[k] = int(acc().get(k, 0)) + int(r[k])
	GameState.data["progress"]["missions"][mid] = "claimed"
	return ""


static func claimable_count() -> int:
	var n := 0
	for mid in DataDB.tables["missions"]:
		if mission_state(mid) == "done":
			n += 1
	return n


static func reward_text(r: Dictionary) -> String:
	var names := { "gold": "골드", "pages": "페이지 조각", "potions": "포션", "revives": "부활 책갈피" }
	var parts: PackedStringArray = []
	for k in r:
		parts.append("%s %d" % [names.get(k, k), int(r[k])])
	return ", ".join(parts)


static func difficulty_unlocked(did: String, diff: String) -> bool:
	var dd: Dictionary = DataDB.get_row("dungeons", did).get("difficulties", {}).get(diff, {})
	if not dd.has("unlock"):
		return true
	return GameState.data["progress"]["cleared"].has("%s:%s" % [did, dd["unlock"]])
