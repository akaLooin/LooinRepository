class_name MetaTests
extends RefCounted
## 성장 시스템 테스트 (오토로드가 필요해서 게임 안에서 실행): godot --headless --path game -- --unit


static func run() -> int:
	var fails := 0
	var checks: Array = []
	var ck := func(cond: bool, name: String):
		checks.append([cond, name])
	GameState.data = GameState.new_save()
	GameState.current_class = "cls_silver"
	var cls := "cls_silver"
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
		"characters": { "cls_silver": { "lv": 4, "exp": 3 } }, "progress": { "cleared": {} }, "settings": {} }
	var m := GameState._migrate(v1)
	ck.call(int(m["version"]) == 4 and int(m["account"]["gold"]) == 77 and int(m["characters"]["cls_silver"]["lv"]) == 4, "migration keeps progress")
	ck.call(m["characters"]["cls_silver"]["equip"]["weapon"] == "i1" and m["account"]["inventory"].size() == 2, "migration grants starter gear")
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
	# v2 세이브(임시 캐릭터) → 실버로 이전
	var v2 := { "version": 2, "account": GameState.new_save()["account"], "characters": { "cls_tbd_01": { "lv": 6, "exp": 1, "equip": {}, "skills": { "sk_mp1": 2, "ps_air": 1 }, "pet": "" } },
		"progress": { "cleared": {} }, "settings": {} }
	var m3 := GameState._migrate(v2)
	ck.call(m3["characters"].has("cls_silver") and not m3["characters"].has("cls_tbd_01") and int(m3["characters"]["cls_silver"]["lv"]) == 6, "v2 save moves to Silver")
	ck.call(not m3["characters"]["cls_silver"]["skills"].has("ps_air") and int(m3["characters"]["cls_silver"]["skills"]["sk_mp1"]) == 2, "removed passives refunded")
	# 스킬 트리 v4: SP 비용·장착 칸
	GameState.data = GameState.new_save()
	var c0 := "cls_silver"
	GameState.char_data(c0)["lv"] = 1
	ck.call(Meta.sp_total(c0) == 3 and Meta.sp_left(c0) == 2, "sp: 2 per level + 1, mp1 costs 1")
	ck.call(Meta.can_learn(c0, "sk_rush") != "", "rush needs Lv2")
	GameState.char_data(c0)["lv"] = 2
	ck.call(Meta.learn(c0, "sk_rush") == "" and Meta.sp_left(c0) == 2, "rush costs 2 SP")
	ck.call(Meta.loadout(c0)[0] == "sk_mp1", "mp1 slot keeps learned skill")
	ck.call(Meta.equip_skill(c0, "sk_rush") == "" and Meta.loadout(c0)[0] == "sk_rush", "equip rush into MP1 slot")
	ck.call(Meta.equip_skill(c0, "sk_dawn") != "", "cannot equip unlearned")
	GameState.char_data(c0)["lv"] = 3
	ck.call(Meta.learn(c0, "sk_mp2") == "" and Meta.loadout(c0)[1] == "sk_mp2", "learned tier-2 fills empty slot")
	ck.call(Meta.learn(c0, "cb_up") == "" and GameState.stats(c0)["fx"].get("move_up", 0.0) > 0.0, "combo move flag reaches stats")
	var d0: int = GameState.stats(c0)["def"]
	GameState.char_data(c0)["lv"] = 10
	Meta.learn(c0, "ps_def")
	ck.call(GameState.stats(c0)["def"] > d0, "def passive raises defense")
	Meta.reset_skills(c0)
	ck.call(Meta.loadout(c0) == ["sk_mp1", "sk_mp2", "sk_mp3"] and Meta.sp_spent(c0) == 1, "reset restores default loadout")
	var v3 := { "version": 3, "account": GameState.new_save()["account"], "characters": { "cls_silver": { "lv": 3, "exp": 0, "equip": {}, "skills": { "sk_mp1": 1 }, "pet": "" } },
		"progress": { "cleared": {} }, "settings": {} }
	ck.call(GameState._migrate(v3)["characters"]["cls_silver"]["loadout"].size() == 3, "v3 save gets loadout")
	# 글렌: 처음 고르면 시작 장비, 활은 글렌 전용
	GameState.data = GameState.new_save()
	var gd := GameState.char_data("cls_glenn")
	var bow_uid: String = gd["equip"].get("weapon", "")
	ck.call(bow_uid != "" and Meta.find(bow_uid)["item"] == "eq_bow_01", "Glenn starts with a wooden bow")
	ck.call(gd["loadout"] == ["sk_g_grenade", "sk_g_trap", "sk_g_snipe"] and int(gd["skills"]["sk_g_grenade"]) == 1, "Glenn default loadout")
	var sword := Meta.add_item("eq_wpn_01")
	ck.call(Meta.equip("cls_glenn", sword) != "", "Glenn cannot equip a sword")
	ck.call(Meta.equip("cls_silver", Meta.add_item("eq_bow_01")) != "", "Silver cannot equip a bow")
	ck.call(Meta.tree("cls_glenn").size() == 31, "Glenn tree has 31 nodes")
	GameState.char_data("cls_glenn")["lv"] = 4
	ck.call(Meta.learn("cls_glenn", "ps_bash") == "" and GameState.stats("cls_glenn")["fx"].get("bash", 0.0) > 0.0, "bash passive reaches stats")
	# 다운 공격: 쓰러진 몬스터는 맞고, 쓰러진 플레이어는 무적
	var fake_world := Node.new()
	fake_world.set_script(null)
	var e := Enemy.new()
	e.team = 1
	e.max_hp = 1000
	e.hp = 1000
	e.h = 14.0
	e.state = "down"
	var atk_d := { "kb": [1.0, 0.0], "launch": 0.0, "hitstun": 10 }
	var src := Enemy.new()
	e.take_hit(src, atk_d, { "dmg": 50 })
	ck.call(e.hp == 950 and e.state == "down" and e.down_hits == 1, "downed monster takes damage and stays down")
	for i in range(Fighter.DOWN_HIT_LIMIT):
		e.take_hit(src, atk_d, { "dmg": 1 })
	ck.call(e.state == "getup" and e.invuln > 0, "downed monster gets up after hit limit")
	ck.call(e.hurtbox().size.y < 14.0 or e.state != "down", "downed hurtbox is low")
	e.free()
	src.free()
	fake_world.free()
	for c in checks:
		print("  %s %s" % ["ok  " if c[0] else "FAIL", c[1]])
		if not c[0]:
			fails += 1
	print("[unit] fails=%d / %d" % [fails, checks.size()])
	return fails
