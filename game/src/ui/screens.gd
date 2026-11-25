class_name Screens
extends RefCounted
## S01 타이틀, S03 열람실(마을), S04/S05 책 선택, S10/S11 결과·보상 카드, S12 캐릭터 정보, S19 옵션.


static func title(router: Node) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var box := s.make_center(200)
	var t := UiKit.label("테일즈토피아 RPG", Tk.GOLD, 22)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(t)
	var sub := UiKit.label("— 차원의 도서관 —", Tk.PAPER_DIM)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(sub)
	box.add_child(UiKit.button("책을 펼친다", func(): router.go("select"), true))
	box.add_child(UiKit.button("옵션", func(): router.go("options")))
	var v := UiKit.label("프로토타입 v0.3 · 임시 캐릭터", Tk.TEXT_DIM)
	v.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(v)
	return s


static func town(router: Node) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var box := s.make_center(300)
	var acc: Dictionary = GameState.data["account"]
	var cd := GameState.char_data()
	var st := GameState.stats()
	var cls: Dictionary = DataDB.get_row("classes", GameState.current_class)
	box.add_child(UiKit.label("열람실", Tk.GOLD, 11))
	box.add_child(UiKit.label("%s  Lv%d  (EXP %d/%d)  SP %d" % [cls["name"], cd["lv"], cd["exp"], GameState.exp_to_next(int(cd["lv"])), Meta.sp_left(GameState.current_class)]))
	box.add_child(UiKit.label("HP %d · 공격 %d · 방어 %d" % [st["hp"], st["atk"], st["def"]], Tk.TEXT_DIM))
	box.add_child(UiKit.label("골드 %d · 포션 %d · 부활 %d · 페이지 조각 %d" % [acc["gold"], acc["potions"], acc["revives"], acc["pages"]], Tk.TEXT_DIM))
	box.add_child(UiKit.button("책 고르기 (던전)", func(): router.go("books"), true))
	var grid := GridContainer.new()
	grid.columns = 4
	grid.add_theme_constant_override("h_separation", 4)
	grid.add_theme_constant_override("v_separation", 4)
	box.add_child(grid)
	var mcount := Meta.claimable_count()
	for e in [["캐릭터·가방", "equip"], ["스킬", "skills"], ["강화", "enhance"], ["상점", "shop"], ["펫", "pets"],
			["미션" + (" (%d)" % mcount if mcount > 0 else ""), "missions"], ["옵션", "options"]]:
		var target: String = e[1]
		var b := UiKit.button(e[0], func(): router.go(target))
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_child(b)
	box.add_child(UiKit.button("등장인물 바꾸기", func(): router.go("select")))
	# 스토리: 처음 들어왔을 때 / 1장 첫 클리어 후
	var dlg := DialogBox.show_once(s, "intro")
	if dlg == null and GameState.data["progress"]["cleared"].has("dgn_01:normal"):
		DialogBox.show_once(s, DataDB.get_row("dungeons", "dgn_01")["dialogs"]["after_first_clear"])
	return s


static func books(router: Node) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var box := s.make_center(260)
	box.add_child(UiKit.label("서가 — 펼칠 책을 고르세요", Tk.GOLD))
	for did in DataDB.tables["dungeons"]:
		var d: Dictionary = DataDB.tables["dungeons"][did]
		var best: Dictionary = GameState.data["progress"]["cleared"].get(did + ":normal", {})
		var info := "클리어" if not best.is_empty() else "미클리어"
		box.add_child(UiKit.label("「%s」 %s" % [d["book"], d["name"]]))
		box.add_child(UiKit.label("권장 Lv%d · %s" % [d["rec_lv"], info], Tk.TEXT_DIM))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		box.add_child(row)
		for diff_id in d.get("difficulties", { "normal": { "name": "보통" } }):
			var dd: Dictionary = d["difficulties"][diff_id]
			var open := Meta.difficulty_unlocked(did, diff_id)
			var rec: Dictionary = GameState.data["progress"]["cleared"].get("%s:%s" % [did, diff_id], {})
			var txt := "%s%s" % [dd["name"], (" · 최고 %s" % rec["best_rank"]) if not rec.is_empty() else ""]
			if not open:
				txt = "%s (보통 클리어 후)" % dd["name"]
			var b := UiKit.button(txt, func(): router.go("dungeon", { "dungeon": did, "difficulty": diff_id }), diff_id == "normal")
			b.disabled = not open
			b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			row.add_child(b)
	box.add_child(UiKit.button("열람실로", func(): router.go("town")))
	return s


static func options(router: Node, args: Dictionary = {}) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var box := s.make_center(260)
	var st: Dictionary = GameState.data["settings"]
	box.add_child(UiKit.label("옵션", Tk.GOLD))
	var modes := { "auto": "자동", "on": "항상 표시", "off": "숨김" }
	var order := ["auto", "on", "off"]
	box.add_child(UiKit.button("터치 버튼: %s" % modes[st.get("show_touch", "auto")], func():
		var i := order.find(st.get("show_touch", "auto"))
		st["show_touch"] = order[(i + 1) % order.size()]
		GameState.save_game()
		router.go("options")))
	box.add_child(UiKit.button("터치 버튼 위치·크기 편집", func(): router.go("layout")))
	box.add_child(UiKit.button("필살기: %s" % ("공격 길게 눌러 충전 (원작식)" if st.get("charge_attack", false) else "필살기 버튼 1·2·3"), func():
		st["charge_attack"] = not st.get("charge_attack", false)
		GameState.save_game()
		router.go("options")))
	box.add_child(UiKit.button("판정 상자 표시: %s" % ("켜짐" if st.get("show_hitboxes", false) else "꺼짐"), func():
		st["show_hitboxes"] = not st.get("show_hitboxes", false)
		GameState.save_game()
		router.go("options")))
	box.add_child(UiKit.button("세이브 초기화", func():
		GameState.reset_save()
		router.go("options", { "msg": "세이브를 초기화했습니다" })))
	if args.get("msg", "") != "":
		box.add_child(UiKit.label(args["msg"], Tk.EXP))
	box.add_child(UiKit.button("돌아가기", func(): router.go("town")))
	return s


static func result(router: Node, r: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var receipt := GameState.apply_rewards(r)
	var box := s.make_center(280)
	var head := UiKit.label("책을 덮었다" if not r["cleared"] else "장 정화 완료!", Tk.GOLD, 11)
	box.add_child(head)
	if r["cleared"]:
		var rank := UiKit.label("랭크 %s" % r["rank"], Tk.RIBBON if r["rank"] in ["S", "A"] else Tk.TEXT, 22)
		box.add_child(rank)
	box.add_child(UiKit.label("시간 %.1f초 · 최대 콤보 %d · 피격 %d회 · 점수 %d" % [r["time"], r["max_combo"], r["hits_taken"], r["score"]], Tk.TEXT_DIM))
	box.add_child(UiKit.label("EXP +%d · 골드 +%d" % [r["exp"], r["gold"]]))
	if receipt["level_ups"] > 0:
		box.add_child(UiKit.label("레벨 업! → Lv%d" % int(GameState.char_data()["lv"]), Tk.EXP))
	if not r.get("drops", []).is_empty():
		var names: PackedStringArray = []
		for item_id in r["drops"]:
			names.append(Meta.item_label({ "item": item_id, "enh": 0 }))
		box.add_child(UiKit.label("획득 장비: " + ", ".join(names), Tk.MP))
	if receipt.get("new_pet", "") != "":
		box.add_child(UiKit.label("새 동료! 「%s」가 따라오기 시작했다" % DataDB.get_row("pets", receipt["new_pet"])["name"], Tk.EXP))
	box.add_child(UiKit.label("지나온 페이지: " + " → ".join(PackedStringArray(r["path"])).replace("stg_", ""), Tk.TEXT_DIM))
	if r["cleared"]:
		box.add_child(UiKit.label("보상 카드를 한 장 뒤집으세요", Tk.GOLD))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		box.add_child(row)
		var pool := [
			{ "kind": "gold", "amount": 150, "label": "골드\n150" },
			{ "kind": "potion", "amount": 2, "label": "포션\n×2" },
			{ "kind": "revive", "amount": 1, "label": "부활\n책갈피" },
			{ "kind": "page", "amount": 3, "label": "페이지\n조각×3" },
		]
		pool.shuffle()
		var cards: Array = []
		for i in range(4):
			var c := UiKit.button("?", func(): pass)
			c.custom_minimum_size = Vector2(50, 34)
			cards.append(c)
			row.add_child(c)
		for i in range(4):
			var idx := i
			cards[i].pressed.connect(func():
				if cards[0].get_meta("done", false):
					return
				cards[0].set_meta("done", true)
				GameState.grant_card(pool[idx])
				for j in range(4):
					cards[j].text = pool[j]["label"]
					cards[j].disabled = j != idx
				cards[idx].add_theme_color_override("font_color", Tk.GOLD))
	box.add_child(UiKit.button("열람실로 돌아가기", func(): router.go("town"), true))
	return s
