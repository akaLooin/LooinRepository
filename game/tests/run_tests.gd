extends SceneTree
## 헤드리스 단위 테스트: godot --headless --path game -s res://tests/run_tests.gd

var fails := 0


func check(cond: bool, name: String) -> void:
	if cond:
		print("  ok   ", name)
	else:
		fails += 1
		print("  FAIL ", name)


func _init() -> void:
	print("[tests]")
	var rng := RandomNumberGenerator.new()
	rng.seed = 1
	# 데미지: 방어가 높아도 최소 1
	var r := DamageCalc.resolve(1.0, 999.0, 1.0, 0.0, false, rng)
	check(int(r["dmg"]) >= 1, "damage floor is 1")
	# 크리티컬 100% 이면 1.5배 근처
	var plain := DamageCalc.resolve(100.0, 0.0, 1.0, 0.0, false, rng)
	var critr := DamageCalc.resolve(100.0, 0.0, 1.0, 1.0, false, rng)
	check(critr["crit"] and int(critr["dmg"]) > int(plain["dmg"]) * 1.3, "crit multiplies")
	var back := DamageCalc.resolve(100.0, 0.0, 1.0, 0.0, true, rng)
	check(back["back"] and int(back["dmg"]) >= 113, "back attack multiplies")
	# 랭크
	check(RankCalc.rank_of(RankCalc.score(100.0, 240.0, 0, 50)) == "S", "fast no-hit run is S")
	check(RankCalc.rank_of(RankCalc.score(600.0, 240.0, 40, 3)) == "D", "slow messy run is D")
	check(RankCalc.rank_value("S") > RankCalc.rank_value("A"), "rank order")
	print("[tests] fails=%d" % fails)
	quit(1 if fails > 0 else 0)
