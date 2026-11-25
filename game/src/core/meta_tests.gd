class_name MetaTests
extends RefCounted
## 성장 시스템 테스트 (오토로드가 필요해서 게임 안에서 실행): godot --headless --path game -- --unit


static func run() -> int:
	var fails := 0
	var checks: Array = []
	var ck := func(cond: bool, name: String):
		checks.append([cond, name])
	GameState.data = GameState.new_save()
	GameState.current_class = "cls_tbd_01"
	var cls := "cls_tbd_01"
	var base_atk: int = GameState.stats()["atk"]
	ck.call(Meta.equipped(cls, "weapon")["item"] == "eq_wpn_01", "starter weapon equipped")
	# 레벨 제한
	var uid := Meta.add_item("eq_wpn_02")
	ck.call(Meta.equip(cls, uid) != "", "level requirement blocks equip")
	GameState.char_data(cls)["lv"] = 3
	ck.call(Meta.equip(cls, uid) == "", "equip after level up")
	ck.call(GameState.stats()["atk"] > base_atk, "better weapon raises atk")
	# 판매: 착용 중이면 불가, 아니면 골드 증가
	ck.call(Meta.sell(uid) != "", "cannot sell equipped")
	var g0 := int(GameState.data["account"]["gold"])
	ck.call(Meta.sell("i1") == "" and int(GameState.data["account"]["gold"]) > g0, "sell spare item")
	# 강화: 100% 확률 단계는 성공, 재료 소모, 능력치 증가
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	GameState.data["account"]["gold"] = 10000
	GameState.data["account"]["pages"] = 50
	var before: int = GameState.stats()["atk"]
	ck.call(Meta.try_enhance(uid, rng) == "success", "first enhance always succeeds")
	ck.call(int(Meta.find(uid)["enh"]) == 1 and GameState.stats()["atk"] > before, "enhance raises stats")
	for i in range(30):
		Meta.try_enhance(uid, rng)
	ck.call(int(Meta.find(uid)["enh"]) == Meta.ENH_MAX, "enhance caps at max")
	ck.call(Meta.try_enhance(uid, rng) != "success", "no enhance past max")
	# 스킬: 선행·레벨·SP 조건
	ck.call(Meta.can_learn(cls, "sk_mp3") != "", "mp3 locked early")
	ck.call(Meta.learn(cls, "sk_mp2") == "", "learn mp2 at lv3")
	GameState.char_data(cls)["lv"] = 5
	ck.call(Meta.learn(cls, "sk_mp3") == "", "learn mp3 at lv5")
	ck.call(GameState.stats()["skills"].get("sk_mp3", 0) == 1, "stats exposes learned skills")
	while Meta.sp_left(cls) > 0:
		if Meta.learn(cls, "ps_atk") != "":
			break
	ck.call(Meta.sp_left(cls) >= 0, "sp never negative")
	Meta.reset_skills(cls)
	ck.call(Meta.sp_spent(cls) == 1, "reset keeps only mp1")
	# 상점
	GameState.data["account"]["gold"] = 40
	ck.call(Meta.buy(Meta.SHOP[0]) != "", "cannot buy without gold")
	GameState.data["account"]["gold"] = 500
	var p0 := int(GameState.data["account"]["potions"])
	ck.call(Meta.buy(Meta.SHOP[0]) == "" and int(GameState.data["account"]["potions"]) == p0 + 1, "buy potion")
	# 보상: 같은 run_id 두 번 반영 금지, 드롭·펫 지급
	var res := { "run_id": "t1", "dungeon": "dgn_01", "cleared": true, "time": 100.0, "rank": "A", "exp": 10, "gold": 10,
		"drops": ["eq_hel_02"], "pet": "pet_bookworm" }
	var n0 := Meta.inv().size()
	var r1 := GameState.apply_rewards(res)
	var r2 := GameState.apply_rewards(res)
	ck.call(r1["applied"] and not r2["applied"], "rewards idempotent by run id")
	ck.call(Meta.inv().size() == n0 + 1, "drop added once")
	ck.call(GameState.data["account"]["pets"].has("pet_bookworm") and GameState.char_data(cls)["pet"] == "pet_bookworm", "first clear pet joins")
	# 세이브 마이그레이션 v1 -> v2
	var v1 := { "version": 1, "account": { "gold": 77, "potions": 1, "revives": 0, "pages": 2, "applied_runs": [] },
		"characters": { "cls_tbd_01": { "lv": 4, "exp": 3 } }, "progress": { "cleared": {} }, "settings": {} }
	var m := GameState._migrate(v1)
	ck.call(int(m["version"]) == 2 and int(m["account"]["gold"]) == 77 and int(m["characters"]["cls_tbd_01"]["lv"]) == 4, "migration keeps progress")
	ck.call(m["characters"]["cls_tbd_01"]["equip"]["weapon"] == "i1" and m["account"]["inventory"].size() == 2, "migration grants starter gear")
	# 드롭 굴림
	var cnt := 0
	rng.seed = 9
	for i in range(200):
		cnt += Meta.roll_drops(DataDB.get_row("dungeons", "dgn_01")["drops"], rng).size()
	ck.call(cnt > 100 and cnt < 400, "drop rate sane (%d per 200 runs)" % cnt)
	# 미션: 조건 달성 → 받기 1회만, 보상 지급
	GameState.data = GameState.new_save()
	ck.call(Meta.mission_state("msn_02") == "open", "level mission open at lv1")
	GameState.char_data(cls)["lv"] = 3
	ck.call(Meta.mission_state("msn_02") == "done", "level mission done at lv3")
	var pot := int(GameState.data["account"]["potions"])
	ck.call(Meta.claim_mission("msn_02") == "" and int(GameState.data["account"]["potions"]) == pot + 2, "claim gives reward")
	ck.call(Meta.claim_mission("msn_02") != "", "cannot claim twice")
	# 어려움은 보통 클리어 후 열림
	ck.call(not Meta.difficulty_unlocked("dgn_01", "hard"), "hard locked before normal clear")
	GameState.apply_rewards({ "run_id": "t2", "dungeon": "dgn_01", "difficulty": "normal", "cleared": true, "time": 99.0, "rank": "B", "exp": 1, "gold": 1 })
	ck.call(Meta.difficulty_unlocked("dgn_01", "hard") and Meta.mission_state("msn_01") == "done", "normal clear unlocks hard + mission")
	GameState.apply_rewards({ "run_id": "t3", "dungeon": "dgn_01", "difficulty": "hard", "cleared": true, "time": 99.0, "rank": "C", "exp": 1, "gold": 1 })
	ck.call(Meta.mission_state("msn_06") == "done", "hard clear recorded separately")
	for c in checks:
		print("  %s %s" % ["ok  " if c[0] else "FAIL", c[1]])
		if not c[0]:
			fails += 1
	print("[unit] fails=%d / %d" % [fails, checks.size()])
	return fails
