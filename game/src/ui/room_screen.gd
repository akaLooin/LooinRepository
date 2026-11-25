class_name RoomScreen
extends RefCounted
## 대기실: 던전에 들어가기 전 준비 화면. 파티 4자리(지금은 혼자, 나머지는 온라인 업데이트 때 열림),
## 인물 교체·장비·스킬 바로가기, 난이도, 출발. 결과 화면에서도 여기로 돌아와 바로 다시 출발할 수 있다.


static func build(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var did: String = args["dungeon"]
	var diff: String = args.get("difficulty", "normal")
	var d: Dictionary = DataDB.get_row("dungeons", did)
	var me := { "screen": "room", "args": { "dungeon": did, "difficulty": diff } }
	var cols := s.make_split("대기실 — %s" % d["name"], "", func(): router.go("map", { "sel": did, "difficulty": diff }), 200)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]

	# 왼쪽: 파티
	left.add_child(UiKit.label("파티 (1/4)", Tk.GOLD))
	var cls := GameState.current_class
	var cd := GameState.char_data(cls)
	var st := GameState.stats(cls)
	left.add_child(UiKit.label("1. %s  Lv%d  ★방장" % [DataDB.get_row("classes", cls)["name"], cd["lv"]]))
	left.add_child(UiKit.label("   HP %d · 공격 %d · 방어 %d" % [st["hp"], st["atk"], st["def"]], Tk.TEXT_DIM))
	var pet: String = cd.get("pet", "")
	left.add_child(UiKit.label("   펫: %s" % (DataDB.get_row("pets", pet)["name"] if pet != "" else "없음"), Tk.TEXT_DIM))
	for i in range(2, 5):
		var empty := UiKit.button("%d. 빈 자리 — 온라인 업데이트 예정" % i, func(): pass)
		empty.disabled = true
		left.add_child(empty)
	var prep := HBoxContainer.new()
	prep.add_theme_constant_override("separation", 3)
	left.add_child(prep)
	for e in [["인물 교체", "select"], ["장비", "equip"], ["스킬", "skills"], ["상점", "shop"]]:
		var target: String = e[1]
		var b := UiKit.button(e[0], func():
			router.return_to = me
			router.go(target))
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		prep.add_child(b)

	# 오른쪽: 던전 정보·난이도·출발
	right.add_child(UiKit.label("「%s」 %s" % [d["book"], d["name"]], Tk.GOLD))
	var rec := int(d["rec_lv"])
	var low := int(cd["lv"]) < rec
	right.add_child(UiKit.label("권장 Lv%d · 지금 Lv%d%s" % [rec, cd["lv"], "  — 레벨이 낮아요!" if low else ""], Tk.DANGER if low else Tk.EXP))
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 3)
	right.add_child(row)
	for diff_id in d.get("difficulties", {}):
		var dd: Dictionary = d["difficulties"][diff_id]
		var open := Meta.difficulty_unlocked(did, diff_id)
		var b := UiKit.button(dd["name"] if open else "%s (잠김)" % dd["name"], func(): router.go("room", { "dungeon": did, "difficulty": diff_id }), diff_id == diff)
		b.disabled = not open
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(b)
	var recd: Dictionary = GameState.data["progress"]["cleared"].get("%s:%s" % [did, diff], {})
	right.add_child(UiKit.label("최고 기록: %s" % ("%s 랭크 · %.0f초" % [recd["best_rank"], recd["best_time"]] if not recd.is_empty() else "없음"), Tk.TEXT_DIM))
	var acc: Dictionary = GameState.data["account"]
	var items := HBoxContainer.new()
	items.add_theme_constant_override("separation", 8)
	right.add_child(items)
	items.add_child(UiKit.label("가져갈 물건:", Tk.TEXT_DIM))
	items.add_child(UiKit.currency("potion", int(acc["potions"])))
	items.add_child(UiKit.currency("revive", int(acc["revives"])))
	if int(acc["potions"]) == 0:
		right.add_child(UiKit.label("포션이 없어요. 상점에 들렀다 가세요.", Tk.DANGER))
	var go := UiKit.button("출발!", func(): router.go("loading", { "dungeon": did, "difficulty": diff }), true, "map")
	go.custom_minimum_size = Vector2(0, 28)
	go.disabled = not Meta.difficulty_unlocked(did, diff)
	right.add_child(go)
	return s
