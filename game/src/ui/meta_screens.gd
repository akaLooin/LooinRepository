class_name MetaScreens
extends RefCounted
## 성장 화면: S02 캐릭터 선택, S12/S13 캐릭터·가방, S14 스킬, S15 강화, S16 상점, S17 펫.
## 모든 화면은 상태가 바뀌면 router.go(같은 화면, args) 로 다시 그린다.


static func _small_btn(text: String, cb: Callable, primary: bool = false) -> Button:
	var b := UiKit.button(text, cb, primary)
	b.custom_minimum_size = Vector2(0, 16)
	b.alignment = HORIZONTAL_ALIGNMENT_LEFT
	b.clip_text = true
	return b


static func _msg(box: Container, args: Dictionary) -> void:
	if args.get("msg", "") != "":
		var ok: bool = args.get("ok", true)
		box.add_child(UiKit.label(args["msg"], Tk.EXP if ok else Tk.DANGER))


# ---------- S02 캐릭터 선택 ----------

const SLOT_PREVIEW := [
	["근접 입문형", "cls_tbd_01"],
	["원거리 기동형", ""],
	["마법 광역형", ""],
	["쌍검 암살형", ""],
]


static func select(router: Node) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var box := s.make_center(300)
	box.add_child(UiKit.label("등장인물 선택 — 테일즈토피아 인물들이 순서대로 합류합니다", Tk.GOLD))
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 6)
	grid.add_theme_constant_override("v_separation", 6)
	box.add_child(grid)
	for slot in SLOT_PREVIEW:
		var cls: String = slot[1]
		var text := ""
		if cls != "":
			var cd := GameState.char_data(cls)
			text = "%s\n%s  Lv%d" % [slot[0], DataDB.get_row("classes", cls)["name"], int(cd["lv"])]
		else:
			text = "%s\n(합류 예정)" % slot[0]
		var b := UiKit.button(text, func():
			GameState.current_class = cls
			GameState.save_game()
			router.go("town"), cls == GameState.current_class)
		b.custom_minimum_size = Vector2(146, 40)
		b.disabled = cls == ""
		grid.add_child(b)
	box.add_child(UiKit.button("타이틀로", func(): router.go("title")))
	return s


# ---------- S12/S13 캐릭터 · 가방 ----------

static func equip(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var cls := GameState.current_class
	var cd := GameState.char_data(cls)
	var acc: Dictionary = GameState.data["account"]
	var filt: String = args.get("slot", "")
	var sel: String = args.get("sel", "")
	var re := func(extra: Dictionary): router.go("equip", extra)
	var cols := s.make_split("캐릭터 · 가방", "골드 %d · 페이지 %d" % [acc["gold"], acc["pages"]], func(): router.go("town"))
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	var st := GameState.stats()
	left.add_child(UiKit.label("%s  Lv%d" % [DataDB.get_row("classes", cls)["name"], cd["lv"]]))
	left.add_child(UiKit.label("HP %d · 공격 %d · 방어 %d · 치명 %d%%" % [st["hp"], st["atk"], st["def"], int(st["crit"] * 100)], Tk.TEXT_DIM))
	for slot in Meta.SLOTS:
		var it := Meta.equipped(cls, slot)
		var txt := "%s: %s" % [Meta.SLOT_NAMES[slot], Meta.item_label(it) if not it.is_empty() else "— 비어 있음"]
		var b := _small_btn(txt, func(): re.call({ "slot": slot }), filt == slot)
		if not it.is_empty():
			b.add_theme_color_override("font_color", Meta.grade_color(it["item"]))
		left.add_child(b)
	left.add_child(_small_btn("전체 보기", func(): re.call({})))
	_msg(left, args)

	# 오른쪽: 선택된 아이템 상세 + 목록
	if sel != "":
		var it := Meta.find(sel)
		if not it.is_empty():
			var d := Meta.item_def(it["item"])
			right.add_child(UiKit.label(Meta.item_label(it), Meta.grade_color(it["item"])))
			right.add_child(UiKit.label("%s · 착용 Lv%d · %s" % [Meta.SLOT_NAMES[d["slot"]], d["lv"], Meta.stat_text(Meta.item_stats(it))], Tk.TEXT_DIM))
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 4)
			right.add_child(row)
			var owner := Meta.equipped_by(sel)
			if owner == cls:
				row.add_child(UiKit.button("해제", func():
					Meta.unequip(cls, d["slot"])
					GameState.save_game()
					re.call({ "slot": filt, "sel": sel })))
			else:
				row.add_child(UiKit.button("장착", func():
					var why := Meta.equip(cls, sel)
					GameState.save_game()
					re.call({ "slot": filt, "sel": sel, "msg": why if why != "" else "장착했습니다", "ok": why == "" }), true))
				row.add_child(UiKit.button("판매 %dG" % Meta.sell_price(it), func():
					var why := Meta.sell(sel)
					GameState.save_game()
					re.call({ "slot": filt, "msg": why if why != "" else "판매했습니다", "ok": why == "" })))
			row.add_child(UiKit.button("강화하기", func(): router.go("enhance", { "sel": sel })))
	var count := 0
	for it in Meta.inv():
		var d := Meta.item_def(it["item"])
		if filt != "" and d["slot"] != filt:
			continue
		count += 1
		var mark := " (착용)" if Meta.equipped_by(it["uid"]) != "" else ""
		var uid: String = it["uid"]
		var b := _small_btn("%s%s" % [Meta.item_label(it), mark], func(): re.call({ "slot": filt, "sel": uid }), uid == sel)
		b.add_theme_color_override("font_color", Meta.grade_color(it["item"]))
		right.add_child(b)
	if count == 0:
		right.add_child(UiKit.label("이 부위의 장비가 없습니다. 던전에서 얻거나 상점에서 사세요.", Tk.TEXT_DIM))
	return s


# ---------- S14 스킬 트리 ----------

static func skills(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var cls := GameState.current_class
	var nodes := Meta.tree(cls)
	var cols := s.make_split("스킬 트리", "SP %d / %d" % [Meta.sp_left(cls), Meta.sp_total(cls)], func(): router.go("town"), 150)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	left.add_child(UiKit.label("레벨마다 SP 1을 얻습니다.", Tk.TEXT_DIM))
	left.add_child(UiKit.label("필살기는 배워야 쓸 수 있고,\n레벨을 올리면 피해가 커집니다.", Tk.TEXT_DIM))
	left.add_child(UiKit.button("스킬 초기화 (무료)", func():
		Meta.reset_skills(cls)
		GameState.save_game()
		router.go("skills", { "msg": "초기화했습니다" })))
	_msg(left, args)
	for kind in ["active", "passive"]:
		right.add_child(UiKit.label("필살기" if kind == "active" else "패시브", Tk.GOLD))
		for sid in nodes:
			var n: Dictionary = nodes[sid]
			if n["kind"] != kind:
				continue
			var lv := Meta.skill_lv(cls, sid)
			var why := Meta.can_learn(cls, sid)
			var row := HBoxContainer.new()
			row.add_theme_constant_override("separation", 4)
			right.add_child(row)
			var info := UiKit.label("%s  %d/%d — %s" % [n["name"], lv, n["max"], n["desc"]], Tk.TEXT if lv > 0 else Tk.TEXT_DIM)
			info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
			row.add_child(info)
			var b := UiKit.button("+1" if why == "" else why, func():
				var w := Meta.learn(cls, sid)
				GameState.save_game()
				router.go("skills", { "msg": w if w != "" else "%s 레벨 업" % n["name"], "ok": w == "" }), why == "")
			b.custom_minimum_size = Vector2(70, 16)
			b.disabled = why != ""
			row.add_child(b)
	return s


# ---------- S15 강화 ----------

static func enhance(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var acc: Dictionary = GameState.data["account"]
	var sel: String = args.get("sel", "")
	var cols := s.make_split("강화 — 제본실", "골드 %d · 페이지 조각 %d" % [acc["gold"], acc["pages"]], func(): router.go("town"))
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	var it := Meta.find(sel)
	if it.is_empty():
		left.add_child(UiKit.label("오른쪽에서 강화할 장비를 고르세요.", Tk.TEXT_DIM))
		left.add_child(UiKit.label("강화 1단계마다 능력치 +%d%%.\n실패해도 강화 수치는 떨어지지 않고\n재료만 소모됩니다." % int(Meta.ENH_BONUS * 100), Tk.TEXT_DIM))
	else:
		left.add_child(UiKit.label(Meta.item_label(it), Meta.grade_color(it["item"])))
		left.add_child(UiKit.label(Meta.stat_text(Meta.item_stats(it)), Tk.TEXT_DIM))
		if int(it["enh"]) >= Meta.ENH_MAX:
			left.add_child(UiKit.label("최대 강화(+%d)입니다." % Meta.ENH_MAX, Tk.GOLD))
		else:
			var c := Meta.enhance_cost(it)
			var nxt := it.duplicate()
			nxt["enh"] = int(it["enh"]) + 1
			left.add_child(UiKit.label("+%d → +%d : %s" % [it["enh"], nxt["enh"], Meta.stat_text(Meta.item_stats(nxt))]))
			left.add_child(UiKit.label("성공 확률 %d%% · 골드 %d · 페이지 %d" % [int(float(c["rate"]) * 100), c["gold"], c["pages"]], Tk.TEXT_DIM))
			left.add_child(UiKit.button("강화한다", func():
				var rng := RandomNumberGenerator.new()
				rng.randomize()
				var r := Meta.try_enhance(sel, rng)
				GameState.save_game()
				var msg := { "success": "성공! 장비가 단단해졌다", "fail": "실패… 재료만 사라졌다" }.get(r, r) as String
				router.go("enhance", { "sel": sel, "msg": msg, "ok": r == "success" }), true))
	_msg(left, args)
	for i in Meta.inv():
		var uid: String = i["uid"]
		var b := _small_btn(Meta.item_label(i), func(): router.go("enhance", { "sel": uid }), uid == sel)
		b.add_theme_color_override("font_color", Meta.grade_color(i["item"]))
		right.add_child(b)
	return s


# ---------- S16 상점 ----------

static func shop(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var acc: Dictionary = GameState.data["account"]
	var cols := s.make_split("상점 — 열람실 매점", "골드 %d" % acc["gold"], func(): router.go("town"), 150)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	left.add_child(UiKit.label("포션 %d · 부활 책갈피 %d\n페이지 조각 %d" % [acc["potions"], acc["revives"], acc["pages"]], Tk.TEXT_DIM))
	left.add_child(UiKit.label("장비 판매는\n캐릭터·가방 화면에서 합니다.", Tk.TEXT_DIM))
	_msg(left, args)
	for e in Meta.SHOP:
		var entry: Dictionary = e
		var price := Meta.shop_price(entry)
		var b := _small_btn("%s — %dG" % [Meta.shop_name(entry), price], func():
			var why := Meta.buy(entry)
			GameState.save_game()
			router.go("shop", { "msg": why if why != "" else "%s 구매" % Meta.shop_name(entry), "ok": why == "" }))
		b.disabled = int(acc["gold"]) < price
		right.add_child(b)
	return s


# ---------- S17 펫 ----------

static func pets(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var cls := GameState.current_class
	var cur: String = GameState.char_data(cls)["pet"]
	var cols := s.make_split("펫", "", func(): router.go("town"), 150)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	left.add_child(UiKit.label("데리고 다닐 펫을 고르세요.\n펫은 전투 중 자동으로 공격하고\n능력치 보너스를 줍니다.", Tk.TEXT_DIM))
	_msg(left, args)
	var owned: Array = GameState.data["account"]["pets"]
	if owned.is_empty():
		right.add_child(UiKit.label("아직 펫이 없습니다.\n「얼룩진 동화책」 1장을 처음 클리어하면 만날 수 있어요.", Tk.TEXT_DIM))
	for pid in owned:
		var p: Dictionary = DataDB.get_row("pets", pid)
		right.add_child(UiKit.label(p["name"] + ("  (동행 중)" if pid == cur else ""), Tk.GOLD if pid == cur else Tk.TEXT))
		right.add_child(UiKit.label(p["desc"], Tk.TEXT_DIM))
		var b := UiKit.button("동행 해제" if pid == cur else "동행시키기", func():
			Meta.equip_pet(cls, "" if pid == cur else pid)
			GameState.save_game()
			router.go("pets"), pid != cur)
		right.add_child(b)
	return s


# ---------- S18 미션 ----------

static func missions(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var acc: Dictionary = GameState.data["account"]
	var cols := s.make_split("미션 — 열람 일지", "골드 %d · 페이지 %d" % [acc["gold"], acc["pages"]], func(): router.go("town"), 130)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	left.add_child(UiKit.label("목표를 이루면\n보상을 받을 수 있어요.", Tk.TEXT_DIM))
	left.add_child(UiKit.label("받을 수 있는 보상: %d" % Meta.claimable_count(), Tk.GOLD))
	_msg(left, args)
	for mid in DataDB.tables["missions"]:
		var m: Dictionary = DataDB.tables["missions"][mid]
		var st := Meta.mission_state(mid)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		right.add_child(row)
		var info := UiKit.label("%s — %s\n보상: %s" % [m["name"], m["desc"], Meta.reward_text(m["reward"])],
			Tk.TEXT if st != "claimed" else Tk.TEXT_DIM)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(info)
		var label: String = { "open": "진행 중", "done": "받기", "claimed": "완료" }[st]
		var b := UiKit.button(label, func():
			var why := Meta.claim_mission(mid)
			GameState.save_game()
			router.go("missions", { "msg": why if why != "" else "%s 보상을 받았습니다" % m["name"], "ok": why == "" }), st == "done")
		b.custom_minimum_size = Vector2(54, 16)
		b.disabled = st != "done"
		row.add_child(b)
	return s
