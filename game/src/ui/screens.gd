class_name Screens
extends RefCounted
## S01 타이틀, S03 열람실(마을), S04/S05 책 선택, S10/S11 결과·보상 카드, S12 캐릭터 정보, S19 옵션.


static func options(router: Node, args: Dictionary = {}) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var st: Dictionary = GameState.data["settings"]
	var cols := s.make_split("옵션", "", func(): router.go("town"), 220)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	# 소리
	left.add_child(UiKit.label("소리", Tk.GOLD, 13, true, true))
	for kind in [["bgm", "배경음"], ["sfx", "효과음"]]:
		var k: String = kind[0]
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		left.add_child(row)
		var l := UiKit.label(kind[1], Tk.PAPER, 12)
		l.custom_minimum_size = Vector2(50, 0)
		row.add_child(l)
		var sl := HSlider.new()
		sl.min_value = 0.0
		sl.max_value = 1.0
		sl.step = 0.05
		sl.value = float(st.get(k, 1.0))
		sl.custom_minimum_size = Vector2(110, 16)
		sl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		row.add_child(sl)
		var pct := UiKit.label("%d%%" % int(sl.value * 100), Tk.TEXT_DIM, 11)
		row.add_child(pct)
		sl.value_changed.connect(func(v: float):
			st[k] = v
			pct.text = "%d%%" % int(v * 100)
			Sfx.refresh_volume()
			if k == "sfx":
				Sfx.play("click", 0.0))
		sl.drag_ended.connect(func(_c): GameState.save_game())
	left.add_child(UiParts.hsep(6))
	left.add_child(UiKit.label("조작", Tk.GOLD, 13, true, true))
	var modes := { "auto": "자동", "on": "항상 표시", "off": "숨김" }
	var order := ["auto", "on", "off"]
	left.add_child(UiKit.button("터치 버튼: %s" % modes[st.get("show_touch", "auto")], func():
		var i := order.find(st.get("show_touch", "auto"))
		st["show_touch"] = order[(i + 1) % order.size()]
		GameState.save_game()
		router.go("options")))
	left.add_child(UiKit.button("터치 버튼 위치·크기 편집", func(): router.go("layout")))
	left.add_child(UiKit.button("필살기: %s" % ("공격 길게 눌러 충전" if st.get("charge_attack", false) else "필살기 버튼 1·2·3"), func():
		st["charge_attack"] = not st.get("charge_attack", false)
		GameState.save_game()
		router.go("options")))
	# 기타
	right.add_child(UiKit.label("기타", Tk.GOLD, 13, true, true))
	right.add_child(UiKit.button("판정 상자 표시: %s" % ("켜짐" if st.get("show_hitboxes", false) else "꺼짐"), func():
		st["show_hitboxes"] = not st.get("show_hitboxes", false)
		GameState.save_game()
		router.go("options")))
	if args.get("confirm_reset", false):
		right.add_child(UiKit.label("정말 모든 진행을 지울까요?", Tk.DANGER, 12, true, true))
		var r := HBoxContainer.new()
		r.add_theme_constant_override("separation", 4)
		right.add_child(r)
		r.add_child(UiKit.button("지운다", func():
			GameState.reset_save()
			router.go("options", { "msg": "세이브를 초기화했습니다" }), true))
		r.add_child(UiKit.button("취소", func(): router.go("options")))
	else:
		right.add_child(UiKit.button("세이브 초기화", func(): router.go("options", { "confirm_reset": true })))
	if args.get("msg", "") != "":
		right.add_child(UiKit.label(args["msg"], Tk.EXP, 12, true))
	right.add_child(UiParts.hsep(10))
	right.add_child(UiKit.label("테일즈토피아 RPG 데모 v0.8", Tk.TEXT_DIM, 11))
	right.add_child(UiKit.label("글꼴: 프리텐다드 · 갈무리 (SIL OFL)", Tk.TEXT_DIM, 11))
	right.add_child(UiKit.label("엔진: Godot (MIT)", Tk.TEXT_DIM, 11))
	return s


static func result(router: Node, r: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var receipt := GameState.apply_rewards(r)
	Sfx.play("fanfare" if r["cleared"] else "page", 0.0)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	s.add_child(center)
	var page := UiKit.paper_panel()
	center.add_child(page)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 10)
	page.add_child(row)
	# 왼쪽: 랭크 도장
	var stamp := RankStamp.new()
	stamp.rank = r["rank"] if r["cleared"] else "-"
	stamp.custom_minimum_size = Vector2(84, 84)
	row.add_child(stamp)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 3)
	box.custom_minimum_size = Vector2(250, 0)
	row.add_child(box)
	var d: Dictionary = DataDB.get_row("dungeons", r["dungeon"])
	box.add_child(UiKit.label("「%s」 %s%s" % [d["book"], d["name"], "  (어려움)" if r.get("difficulty", "normal") == "hard" else ""], Tk.LEATHER))
	box.add_child(UiKit.label("장 정화 완료!" if r["cleared"] else "책을 덮었다……", Tk.INK, 11))
	box.add_child(UiKit.label("시간 %.1f초 · 최대 콤보 %d · 피격 %d회" % [r["time"], r["max_combo"], r["hits_taken"]], Color("5a4a3a")))
	var rw := HBoxContainer.new()
	rw.add_theme_constant_override("separation", 8)
	box.add_child(rw)
	rw.add_child(UiKit.label("EXP +%d" % r["exp"], Color("3f6a3a")))
	var gold_row := UiKit.currency("gold", int(r["gold"]))
	(gold_row.get_child(1) as Label).add_theme_color_override("font_color", Tk.INK)
	rw.add_child(gold_row)
	if receipt["level_ups"] > 0:
		box.add_child(UiKit.label("레벨 업! → Lv%d  (SP +%d)" % [int(GameState.char_data()["lv"]), receipt["level_ups"]], Tk.RIBBON))
	if not r.get("drops", []).is_empty():
		var names: PackedStringArray = []
		for item_id in r["drops"]:
			names.append(Meta.item_label({ "item": item_id, "enh": 0 }))
		var dl := UiKit.label("획득 장비: " + ", ".join(names), Color("2f4f8a"))
		dl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		box.add_child(dl)
	if receipt.get("new_pet", "") != "":
		box.add_child(UiKit.label("새 동료! 「%s」가 따라오기 시작했다" % DataDB.get_row("pets", receipt["new_pet"])["name"], Color("3f6a3a")))
	if r["cleared"]:
		box.add_child(UiKit.label("보상 카드를 한 장 뒤집으세요", Tk.LEATHER))
		var cards_row := HBoxContainer.new()
		cards_row.add_theme_constant_override("separation", 5)
		box.add_child(cards_row)
		var pool := [
			{ "kind": "gold", "amount": 150, "label": "골드\n150", "icon": "gold" },
			{ "kind": "potion", "amount": 2, "label": "포션\n×2", "icon": "potion" },
			{ "kind": "revive", "amount": 1, "label": "부활\n책갈피", "icon": "revive" },
			{ "kind": "page", "amount": 3, "label": "페이지\n×3", "icon": "page" },
		]
		pool.shuffle()
		var cards: Array = []
		for i in range(4):
			var c := UiKit.button("?", func(): pass)
			c.custom_minimum_size = Vector2(52, 36)
			cards.append(c)
			cards_row.add_child(c)
		for i in range(4):
			var idx := i
			cards[i].pressed.connect(func():
				if cards[0].get_meta("done", false):
					return
				cards[0].set_meta("done", true)
				GameState.grant_card(pool[idx])
				Sfx.play("coin", 0.0)
				for j in range(4):
					cards[j].text = pool[j]["label"]
					cards[j].disabled = j != idx
				cards[idx].add_theme_color_override("font_color", Tk.GOLD))
	var btns := HBoxContainer.new()
	btns.add_theme_constant_override("separation", 4)
	box.add_child(btns)
	btns.add_child(UiKit.button("다시 펼치기", func(): router.go("loading", { "dungeon": r["dungeon"], "difficulty": r.get("difficulty", "normal") })))
	btns.add_child(UiKit.button("대기실로", func(): router.go("room", { "dungeon": r["dungeon"], "difficulty": r.get("difficulty", "normal") }), true))
	btns.add_child(UiKit.button("열람실로", func(): router.go("town")))
	return s
