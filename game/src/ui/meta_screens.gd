class_name MetaScreens
extends RefCounted
## 성장 화면: S02 등장인물, S12/S13 캐릭터·가방, S14 스킬, S15 강화, S16 상점, S17 펫, S18 미션.
## 모든 화면은 상태가 바뀌면 router.go(같은 화면, args) 로 다시 그린다.


static func _msg(box: Container, args: Dictionary) -> void:
	if args.get("msg", "") != "":
		var ok: bool = args.get("ok", true)
		box.add_child(UiKit.label(args["msg"], Tk.EXP if ok else Tk.DANGER, 12, true, true))


static func _wrap(l: Label, w: float) -> Label:
	l.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	l.custom_minimum_size = Vector2(w, 0)
	return l


# ───────────────────────── S02 등장인물 선택 ─────────────────────────

const SLOT_PREVIEW := [
	["근접 입문형", "cls_silver", "판타지아"],
	["원거리 기동형", "", ""],
	["마법 광역형", "", ""],
	["쌍검 암살형", "", ""],
]


static func select(router: Node) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var root := VBoxContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_theme_constant_override("separation", 6)
	root.alignment = BoxContainer.ALIGNMENT_CENTER
	s.add_child(root)
	var t := UiParts.ribbon_title("등장인물 — 함께 책 속으로 들어갈 인물을 고르세요")
	t.custom_minimum_size = Vector2(320, 22)
	t.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	root.add_child(t)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 8)
	root.add_child(row)
	for slot in SLOT_PREVIEW:
		var cls: String = slot[1]
		var card := PanelContainer.new()
		var cur := cls == GameState.current_class
		card.add_theme_stylebox_override("panel", UiKit.tbox("panel_paper" if cur else "panel_dark", 6, 6))
		card.custom_minimum_size = Vector2(104, 170)
		row.add_child(card)
		var v := VBoxContainer.new()
		v.add_theme_constant_override("separation", 2)
		v.alignment = BoxContainer.ALIGNMENT_CENTER
		card.add_child(v)
		var ink := Tk.INK if cur else Tk.PAPER
		var role := UiKit.label(slot[0], Tk.LEATHER if cur else Tk.GOLD, 11, false, true)
		role.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(role)
		if cls != "":
			var spr := UiParts.char_sprite(cls, 2.0)
			spr.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			v.add_child(spr)
			var cd := GameState.char_data(cls)
			var nm := UiKit.label(String(DataDB.get_row("classes", cls)["name"]), ink, 13, false, true)
			nm.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			v.add_child(nm)
			var lv := UiKit.label("Lv%d · 「%s」" % [int(cd["lv"]), slot[2]], Tk.LEATHER if cur else Tk.TEXT_DIM, 11)
			lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			v.add_child(lv)
			v.add_child(UiKit.button("이 인물로" if not cur else "선택됨 ✓", func():
				GameState.current_class = cls
				GameState.save_game()
				router.go("town"), true))
		else:
			var spr := UiParts.char_sprite("cls_silver", 2.0, 0, 0, true)
			spr.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
			v.add_child(spr)
			var q := UiKit.label("???", Tk.TEXT_DIM, 13, false, true)
			q.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			v.add_child(q)
			var soon := UiKit.label("합류 예정", Tk.TEXT_DIM, 11)
			soon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			v.add_child(soon)
	var back := UiKit.button("시작 화면으로", func(): router.go("title"), false, "back")
	back.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	root.add_child(back)
	return s


# ───────────────────────── S12/S13 캐릭터 · 가방 ─────────────────────────

static func equip(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var cls := GameState.current_class
	var cd := GameState.char_data(cls)
	var filt: String = args.get("slot", "")
	var sel: String = args.get("sel", "")
	var re := func(extra: Dictionary): router.go("equip", extra)
	var cols := s.make_split("캐릭터 · 가방", "", func(): router.go("town"), 196)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	var st := GameState.stats()

	# 왼쪽: 장비 인형 (가운데 캐릭터, 양옆에 부위 칸)
	var name_l := UiKit.label("%s  Lv%d" % [DataDB.get_row("classes", cls)["name"], cd["lv"]], Tk.GOLD, 13, true, true)
	left.add_child(name_l)
	var doll := HBoxContainer.new()
	doll.add_theme_constant_override("separation", 4)
	doll.alignment = BoxContainer.ALIGNMENT_CENTER
	left.add_child(doll)
	var lcol := VBoxContainer.new()
	var rcol := VBoxContainer.new()
	for c in [lcol, rcol]:
		c.add_theme_constant_override("separation", 4)
		c.alignment = BoxContainer.ALIGNMENT_CENTER
	doll.add_child(lcol)
	var pic := UiParts.char_sprite(cls, 2.5)
	doll.add_child(pic)
	doll.add_child(rcol)
	for i in range(Meta.SLOTS.size()):
		var slot: String = Meta.SLOTS[i]
		var it := Meta.equipped(cls, slot)
		var tile: Button
		if it.is_empty():
			tile = UiParts.icon_tile(UiKit.tex("item_%s_common" % slot), func(): re.call({ "slot": slot }), filt == slot, 32.0, Color("4a4258"), true)
		else:
			var uid: String = it["uid"]
			tile = UiParts.item_tile(it, func(): re.call({ "slot": slot, "sel": uid }), filt == slot or sel == uid, 32.0)
		tile.tooltip_text = Meta.SLOT_NAMES[slot]
		(lcol if i < 3 else rcol).add_child(tile)
	# 능력치 표
	var stg := UiParts.grid(2, 2)
	left.add_child(stg)
	for pair in [["HP", str(st["hp"])], ["공격", str(st["atk"])], ["방어", str(st["def"])], ["치명", "%d%%" % int(st["crit"] * 100)]]:
		var l := UiKit.label("%s  %s" % pair, Tk.PAPER, 12)
		l.custom_minimum_size = Vector2(88, 0)
		stg.add_child(l)
	_msg(left, args)

	# 오른쪽: 필터 탭 + 가방 칸 + 선택 아이템 카드
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 2)
	right.add_child(tabs)
	for e in [["전체", ""], ["무기", "weapon"], ["머리", "helm"], ["상의", "top"], ["하의", "bottom"], ["장갑", "glove"], ["신발", "shoe"]]:
		var key: String = e[1]
		var tb := UiKit.button(e[0], func(): re.call({ "slot": key }), filt == key)
		tb.custom_minimum_size = Vector2(0, 16)
		tabs.add_child(tb)
	var g := UiParts.grid(7, 3)
	right.add_child(g)
	var count := 0
	for it in Meta.inv():
		var d := Meta.item_def(it["item"])
		if filt != "" and d["slot"] != filt:
			continue
		count += 1
		var uid: String = it["uid"]
		g.add_child(UiParts.item_tile(it, func(): re.call({ "slot": filt, "sel": uid }), uid == sel, 30.0))
	for i in range(maxi(0, 14 - count)):
		g.add_child(UiParts.icon_tile(null, func(): pass, false, 30.0, Color("3a3348"), true))
	var it_sel := Meta.find(sel)
	if not it_sel.is_empty():
		var card := UiKit.paper_panel()
		right.add_child(card)
		var cv := VBoxContainer.new()
		cv.add_theme_constant_override("separation", 1)
		card.add_child(cv)
		var d := Meta.item_def(it_sel["item"])
		var head := HBoxContainer.new()
		head.add_theme_constant_override("separation", 6)
		cv.add_child(head)
		head.add_child(UiParts.item_tile(it_sel, func(): pass, false, 34.0))
		var hv := VBoxContainer.new()
		hv.add_theme_constant_override("separation", 0)
		head.add_child(hv)
		hv.add_child(UiKit.label(Meta.item_label(it_sel), UiParts.GRADE_COL[d["grade"]].darkened(0.35), 13, false, true))
		hv.add_child(UiKit.label("%s · 착용 Lv%d · 판매 %dG" % [Meta.SLOT_NAMES[d["slot"]], d["lv"], Meta.sell_price(it_sel)], Color("5a4a3a"), 11))
		var ist := Meta.item_stats(it_sel)
		cv.add_child(UiKit.label(Meta.stat_text(ist), Tk.INK, 12))
		var owner := Meta.equipped_by(sel)
		if owner == "":
			var cur := Meta.equipped(cls, d["slot"])
			var old_st := Meta.item_stats(cur) if not cur.is_empty() else {}
			cv.add_child(UiKit.label("착용 시: " + UiParts.compare_text(ist, old_st), UiParts.compare_color(ist, old_st).darkened(0.35), 12, false, true))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 3)
		cv.add_child(row)
		if owner == cls:
			row.add_child(UiKit.button("해제", func():
				Meta.unequip(cls, d["slot"])
				GameState.save_game()
				re.call({ "slot": filt, "sel": sel })))
		else:
			row.add_child(UiKit.button("장착", func():
				var why := Meta.equip(cls, sel)
				GameState.save_game()
				Sfx.play("coin" if why == "" else "hurt", 0.0)
				re.call({ "slot": filt, "sel": sel, "msg": why if why != "" else "장착했습니다", "ok": why == "" }), true))
			row.add_child(UiKit.button("판매", func():
				var why := Meta.sell(sel)
				GameState.save_game()
				Sfx.play("coin", 0.0)
				re.call({ "slot": filt, "msg": why if why != "" else "판매했습니다", "ok": why == "" })))
		row.add_child(UiKit.button("강화하러", func(): router.go("enhance", { "sel": sel })))
	elif count == 0:
		right.add_child(UiKit.label("이 부위의 장비가 없어요. 던전에서 얻거나 매점에서 사세요.", Tk.TEXT_DIM))
	else:
		right.add_child(UiKit.label("칸을 누르면 자세히 볼 수 있어요. E = 착용 중", Tk.TEXT_DIM, 11))
	return s


# ───────────────────────── S14 스킬 트리 ─────────────────────────

static func skills(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var cls := GameState.current_class
	var tree_id: String = DataDB.get_row("classes", cls)["skill_tree"]
	var tree: Dictionary = DataDB.get_row("skill_tree", tree_id)
	var nodes: Dictionary = tree["nodes"]
	var tab: String = args.get("tab", "mp")
	var sel: String = args.get("sel", "")
	if sel == "" or nodes.get(sel, {}).get("tab", "") != tab:
		for sid in nodes:
			if nodes[sid]["tab"] == tab:
				sel = sid
				break
	var go := func(extra: Dictionary):
		var a2 := { "tab": tab, "sel": sel }
		a2.merge(extra, true)
		router.go("skills", a2)
	var cols := s.make_split("스킬 트리", "", func(): router.go("town"), 236)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	# 탭
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 2)
	left.add_child(tabs)
	for tb in tree["tabs"]:
		var key: String = tb[0]
		var learned := 0
		for sid in nodes:
			if nodes[sid]["tab"] == key and Meta.skill_lv(cls, sid) > 0:
				learned += 1
		var b := UiKit.button("%s %d" % [tb[1], learned], func(): router.go("skills", { "tab": key }), key == tab)
		b.custom_minimum_size = Vector2(0, 18)
		b.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		tabs.add_child(b)
	# 트리 그림
	var canvas := SkillTreeCanvas.new()
	canvas.cls = cls
	canvas.tab = tab
	canvas.nodes = nodes
	canvas.columns = tree.get("tab_cols", {}).get(tab, [])
	canvas.custom_minimum_size = Vector2(220, 196)
	left.add_child(canvas)
	var lo := Meta.loadout(cls)
	for sid in nodes:
		var n: Dictionary = nodes[sid]
		if n["tab"] != tab:
			continue
		var lv := Meta.skill_lv(cls, sid)
		var frame: Color = Tk.MP if n["kind"] == "active" else (Tk.RIBBON if n["kind"] == "combo" else Tk.GOLD)
		var tile := UiParts.icon_tile(UiKit.tex("skill_" + sid), func(): go.call({ "sel": sid }), sid == sel, 36.0,
			frame, lv == 0 and Meta.can_learn(cls, sid) != "")
		tile.pips = lv
		tile.pips_max = int(n["max"])
		if n["kind"] == "active" and lo.has(sid):
			tile.badge = "E"
		tile.position = canvas.node_pos(n["pos"]) - Vector2(18, 18)
		canvas.add_child(tile)

	# 오른쪽 위: SP + 필살기 장착 칸
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 4)
	right.add_child(top)
	top.add_child(UiKit.label("남은 SP", Tk.TEXT_DIM))
	top.add_child(UiKit.label("%d" % Meta.sp_left(cls), Tk.GOLD, 16, true, true))
	top.add_child(UiKit.label("/ %d" % Meta.sp_total(cls), Tk.TEXT_DIM))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	top.add_child(sp)
	top.add_child(UiKit.label("장착", Tk.TEXT_DIM, 11))
	for i in range(3):
		var sid: String = lo[i]
		var t := UiParts.icon_tile(UiKit.tex("skill_" + sid), func(): router.go("skills", { "tab": "mp", "sel": sid }), false, 26.0,
			Color("b8323f"), Meta.skill_lv(cls, sid) == 0)
		t.corner = str(i + 1)
		top.add_child(t)
	# 선택한 노드 카드
	var n: Dictionary = nodes.get(sel, {})
	if not n.is_empty():
		var card := UiKit.paper_panel()
		right.add_child(card)
		var cv := VBoxContainer.new()
		cv.add_theme_constant_override("separation", 2)
		card.add_child(cv)
		var head := HBoxContainer.new()
		head.add_theme_constant_override("separation", 6)
		cv.add_child(head)
		var lv := Meta.skill_lv(cls, sel)
		var frame: Color = Tk.MP if n["kind"] == "active" else (Tk.RIBBON if n["kind"] == "combo" else Tk.GOLD)
		head.add_child(UiParts.icon_tile(UiKit.tex("skill_" + sel), func(): pass, false, 38.0, frame))
		var hv := VBoxContainer.new()
		hv.add_theme_constant_override("separation", 0)
		head.add_child(hv)
		hv.add_child(UiKit.label(n["name"], Tk.INK, 15, false, true))
		var kind_txt := ""
		match n["kind"]:
			"active":
				kind_txt = "필살기 · MP %d칸" % int(DataDB.get_row("skills", sel)["mp_cost"])
			"combo":
				kind_txt = "검술 동작"
			_:
				kind_txt = "패시브"
		hv.add_child(UiKit.label("%s · Lv %d / %d · SP %d" % [kind_txt, lv, n["max"], int(n.get("cost", 1))], Tk.LEATHER, 11))
		cv.add_child(_wrap(UiKit.label(n["desc"], Tk.INK, 12), 210))
		if n["kind"] == "active" and int(n["max"]) > 1:
			cv.add_child(UiKit.label("레벨당 피해 +12%%  (지금 +%d%%)" % (12 * maxi(0, lv - 1)), Color("5a4a3a"), 11))
		var why := Meta.can_learn(cls, sel)
		var pre_names: PackedStringArray = []
		for x in n["pre"]:
			pre_names.append(nodes[x]["name"])
		var req := "Lv%d" % int(n["req_lv"])
		if not pre_names.is_empty():
			req += " · " + ", ".join(pre_names)
		cv.add_child(UiKit.label("조건: %s — %s" % [req, "배울 수 있어요" if why == "" else why], Color("3f6a3a") if why == "" else Tk.RIBBON.darkened(0.2), 11))
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 4)
		cv.add_child(row)
		var b := UiKit.button("배우기" if lv == 0 else "레벨 올리기", func():
			var w := Meta.learn(cls, sel)
			GameState.save_game()
			Sfx.play("skill" if w == "" else "hurt", 0.0)
			go.call({ "msg": w if w != "" else "%s Lv%d" % [n["name"], Meta.skill_lv(cls, sel)], "ok": w == "" }), true)
		b.disabled = why != ""
		row.add_child(b)
		if n["kind"] == "active":
			var tier := int(DataDB.get_row("skills", sel)["tier"])
			var on: bool = lo[tier - 1] == sel
			var eb := UiKit.button("장착됨 (MP %d칸)" % tier if on else "MP %d칸에 장착" % tier, func():
				var w := Meta.equip_skill(cls, sel)
				GameState.save_game()
				Sfx.play("coin" if w == "" else "hurt", 0.0)
				go.call({ "msg": w if w != "" else "MP %d칸에 「%s」 장착" % [tier, n["name"]], "ok": w == "" }))
			eb.disabled = on or lv == 0
			row.add_child(eb)
	_msg(right, args)
	var bottom := HBoxContainer.new()
	bottom.add_theme_constant_override("separation", 4)
	right.add_child(bottom)
	bottom.add_child(UiKit.button("스킬 초기화 (무료)", func():
		Meta.reset_skills(cls)
		GameState.save_game()
		router.go("skills", { "tab": tab, "msg": "SP를 모두 돌려받았어요" })))
	bottom.add_child(UiKit.label("배운 노드 %d / %d" % [(GameState.char_data(cls)["skills"] as Dictionary).size(), nodes.size()], Tk.TEXT_DIM, 11))
	return s


# ───────────────────────── S15 강화 — 제본실 ─────────────────────────

static func enhance(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var sel: String = args.get("sel", "")
	var cols := s.make_split("강화 — 제본실", "", func(): router.go("town"), 220)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	var forge := ForgeView.new()
	forge.clip_contents = true
	forge.custom_minimum_size = Vector2(204, 96)
	left.add_child(forge)
	var it := Meta.find(sel)
	forge.item = it
	forge.result = args.get("result", "")
	if it.is_empty():
		left.add_child(_wrap(UiKit.label("오른쪽 가방에서 강화할 장비를 고르세요.\n강화 1단계마다 능력치 +%d%%. 실패해도 강화 수치는 떨어지지 않아요." % int(Meta.ENH_BONUS * 100), Tk.TEXT_DIM, 11), 200))
	else:
		left.add_child(UiKit.label(Meta.item_label(it), UiParts.GRADE_COL[Meta.item_def(it["item"])["grade"]], 13, true, true))
		if int(it["enh"]) >= Meta.ENH_MAX:
			left.add_child(UiKit.label("최대 강화(+%d)에 도달했어요!" % Meta.ENH_MAX, Tk.GOLD, 12, true))
		else:
			var c := Meta.enhance_cost(it)
			var nxt := it.duplicate()
			nxt["enh"] = int(it["enh"]) + 1
			left.add_child(UiKit.label("+%d → +%d   %s" % [it["enh"], nxt["enh"], UiParts.compare_text(Meta.item_stats(nxt), Meta.item_stats(it))], Tk.EXP, 12))
			var rate_row := HBoxContainer.new()
			rate_row.add_theme_constant_override("separation", 4)
			left.add_child(rate_row)
			rate_row.add_child(UiKit.label("성공 %d%%" % int(float(c["rate"]) * 100), Tk.PAPER, 12))
			rate_row.add_child(UiParts.bar(float(c["rate"]), 1.0, Tk.EXP if float(c["rate"]) >= 0.7 else Tk.GOLD, 110, 8))
			var cost := HBoxContainer.new()
			cost.add_theme_constant_override("separation", 8)
			left.add_child(cost)
			var acc: Dictionary = GameState.data["account"]
			var g := UiKit.currency("gold", int(c["gold"]))
			var p := UiKit.currency("page", int(c["pages"]))
			if int(acc["gold"]) < int(c["gold"]):
				(g.get_child(1) as Label).add_theme_color_override("font_color", Tk.DANGER)
			if int(acc["pages"]) < int(c["pages"]):
				(p.get_child(1) as Label).add_theme_color_override("font_color", Tk.DANGER)
			cost.add_child(UiKit.label("필요", Tk.TEXT_DIM, 11))
			cost.add_child(g)
			cost.add_child(p)
			var b := UiKit.button("두드린다!", func():
				if forge.busy:
					return
				var rng := RandomNumberGenerator.new()
				rng.randomize()
				var r := Meta.try_enhance(sel, rng)
				GameState.save_game()
				if r != "success" and r != "fail":
					router.go("enhance", { "sel": sel, "msg": r, "ok": false })
					return
				forge.play(r, func(): router.go("enhance", { "sel": sel, "result": r,
					"msg": "성공! +%d 이 되었어요" % int(Meta.find(sel)["enh"]) if r == "success" else "실패… 재료만 사라졌어요", "ok": r == "success" })), true)
			b.custom_minimum_size = Vector2(0, 24)
			left.add_child(b)
	_msg(left, args)
	right.add_child(UiKit.label("가방", Tk.GOLD, 12, true, true))
	var grid := UiParts.grid(6, 3)
	right.add_child(grid)
	for i in Meta.inv():
		var uid: String = i["uid"]
		grid.add_child(UiParts.item_tile(i, func(): router.go("enhance", { "sel": uid }), uid == sel, 30.0))
	return s


# ───────────────────────── S16 상점 — 열람실 매점 ─────────────────────────

const SHOP_LINES := [
	"어서 오게, 단장! 오늘도 좋은 물건이 들어왔지.",
	"포션은 넉넉히 챙겨 가게. 책 속은 늘 위험하니까.",
	"쓰지 않는 장비는 내가 사 주지. 값은 후하게 쳐줌세.",
	"페이지 조각은 제본대에서 쓸모가 많다네.",
]


static func shop(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var tab: String = args.get("tab", "buy")
	var sel := int(args.get("sel", -1))
	var sel_uid: String = args.get("uid", "")
	var cols := s.make_split("열람실 매점", "", func(): router.go("town"), 150)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	# 왼쪽: 매점 주인 (오리지널 NPC: 두더지 제본사 「모루」)
	var keeper := Shopkeeper.new()
	keeper.custom_minimum_size = Vector2(134, 80)
	left.add_child(keeper)
	var bubble := UiKit.paper_panel()
	left.add_child(bubble)
	bubble.add_child(_wrap(UiKit.label(args.get("msg", SHOP_LINES[randi() % SHOP_LINES.size()]), Tk.INK, 11), 124))
	var acc: Dictionary = GameState.data["account"]
	var have := HBoxContainer.new()
	have.add_theme_constant_override("separation", 6)
	left.add_child(have)
	have.add_child(UiKit.currency("potion", int(acc["potions"])))
	have.add_child(UiKit.currency("revive", int(acc["revives"])))
	# 오른쪽: 탭 + 칸
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 3)
	right.add_child(tabs)
	tabs.add_child(UiKit.button("사기", func(): router.go("shop", { "tab": "buy" }), tab == "buy"))
	tabs.add_child(UiKit.button("팔기", func(): router.go("shop", { "tab": "sell" }), tab == "sell"))
	var g := UiParts.grid(6, 3)
	right.add_child(g)
	if tab == "buy":
		for i in range(Meta.SHOP.size()):
			var e: Dictionary = Meta.SHOP[i]
			var idx := i
			var tile: Button
			if e["kind"] == "item":
				tile = UiParts.item_tile({ "item": e["item"], "enh": 0 }, func(): router.go("shop", { "tab": "buy", "sel": idx }), i == sel, 32.0)
			else:
				tile = UiParts.icon_tile(UiKit.icon(e["kind"]), func(): router.go("shop", { "tab": "buy", "sel": idx }), i == sel, 32.0, Tk.GOLD)
			tile.corner = "%dG" % Meta.shop_price(e)
			g.add_child(tile)
		if sel >= 0:
			var e: Dictionary = Meta.SHOP[sel]
			var card := UiKit.paper_panel()
			right.add_child(card)
			var cv := VBoxContainer.new()
			card.add_child(cv)
			cv.add_child(UiKit.label(Meta.shop_name(e), Tk.INK, 13, false, true))
			if e["kind"] == "item":
				var ist := Meta.item_stats({ "item": e["item"], "enh": 0 })
				var cur := Meta.equipped(GameState.current_class, Meta.item_def(e["item"])["slot"])
				cv.add_child(UiKit.label(Meta.stat_text(ist), Tk.INK, 12))
				cv.add_child(UiKit.label("착용 시: " + UiParts.compare_text(ist, Meta.item_stats(cur) if not cur.is_empty() else {}), Color("5a4a3a"), 11))
			else:
				cv.add_child(UiKit.label({ "potion": "전투 중 HP 30% 회복", "revive": "쓰러졌을 때 그 자리에서 부활", "page": "강화 재료" }.get(e["kind"], ""), Color("5a4a3a"), 12))
			var price := Meta.shop_price(e)
			var b := UiKit.button("%dG에 사기" % price, func():
				var why := Meta.buy(e)
				GameState.save_game()
				Sfx.play("coin" if why == "" else "hurt", 0.0)
				router.go("shop", { "tab": "buy", "sel": sel, "msg": "고맙네! 잘 쓰게." if why == "" else "음… " + why }), true)
			b.disabled = int(acc["gold"]) < price
			cv.add_child(b)
	else:
		var n := 0
		for it in Meta.inv():
			if Meta.equipped_by(it["uid"]) != "":
				continue
			n += 1
			var uid: String = it["uid"]
			var tile := UiParts.item_tile(it, func(): router.go("shop", { "tab": "sell", "uid": uid }), uid == sel_uid, 32.0)
			tile.corner = "%dG" % Meta.sell_price(it)
			g.add_child(tile)
		if n == 0:
			right.add_child(UiKit.label("팔 수 있는 장비가 없어요 (착용 중인 장비는 팔 수 없어요).", Tk.TEXT_DIM, 11))
		var it_sel := Meta.find(sel_uid)
		if not it_sel.is_empty():
			var b := UiKit.button("%s — %dG에 팔기" % [Meta.item_label(it_sel), Meta.sell_price(it_sel)], func():
				var why := Meta.sell(sel_uid)
				GameState.save_game()
				Sfx.play("coin", 0.0)
				router.go("shop", { "tab": "sell", "msg": "좋은 물건이군, 잘 받았네!" if why == "" else why }), true)
			right.add_child(b)
	return s


# ───────────────────────── S17 펫 ─────────────────────────

static func pets(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var cls := GameState.current_class
	var cur: String = GameState.char_data(cls)["pet"]
	var owned: Array = GameState.data["account"]["pets"]
	var sel: String = args.get("sel", cur if cur != "" else (owned[0] if not owned.is_empty() else ""))
	var cols := s.make_split("펫 — 동행 바구니", "", func(): router.go("town"), 200)
	var left: VBoxContainer = cols[0]
	var right: VBoxContainer = cols[1]
	var view := PetView.new()
	view.clip_contents = true
	view.pet_id = sel
	view.custom_minimum_size = Vector2(184, 110)
	left.add_child(view)
	if sel != "":
		var p: Dictionary = DataDB.get_row("pets", sel)
		left.add_child(UiKit.label(p["name"] + ("  · 동행 중" if sel == cur else ""), Tk.GOLD, 14, true, true))
		left.add_child(_wrap(UiKit.label(p["desc"], Tk.PAPER, 12), 184))
		left.add_child(UiKit.label("자동 공격: %.1f초마다 종잇조각 (공격력의 %d%%)" % [float(p["interval"]) / 60.0, int(float(p["mul"]) * 100)], Tk.TEXT_DIM, 11))
		left.add_child(UiKit.button("동행 해제" if sel == cur else "동행시키기", func():
			Meta.equip_pet(cls, "" if sel == cur else sel)
			GameState.save_game()
			Sfx.play("coin", 0.0)
			router.go("pets", { "sel": sel }), sel != cur))
	else:
		left.add_child(_wrap(UiKit.label("아직 함께하는 펫이 없어요.\n「얼룩진 동화책」 1장을 처음 정화하면 만날 수 있어요.", Tk.TEXT_DIM, 12), 184))
	_msg(left, args)
	right.add_child(UiKit.label("모은 펫 %d / 4" % owned.size(), Tk.GOLD, 12, true, true))
	var g := UiParts.grid(4, 4)
	right.add_child(g)
	for pid in DataDB.tables["pets"]:
		var has: bool = owned.has(pid)
		var t := UiParts.icon_tile(UiKit.icon("pet"), func(): router.go("pets", { "sel": pid }), pid == sel, 40.0, Tk.EXP if has else Color("4a4258"), not has)
		if pid == cur:
			t.badge = "E"
		g.add_child(t)
	for i in range(maxi(0, 4 - DataDB.tables["pets"].size())):
		var t := UiParts.icon_tile(UiKit.icon("lock"), func(): pass, false, 40.0, Color("3a3348"), true)
		g.add_child(t)
	right.add_child(UiKit.label("다른 책에서 새 펫을 만날 수 있어요.", Tk.TEXT_DIM, 11))
	return s


# ───────────────────────── S18 미션 — 열람 일지 ─────────────────────────

static func missions(router: Node, args: Dictionary) -> MenuScreen:
	var s := MenuScreen.new()
	s.router = router
	var root := MarginContainer.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "right", "top", "bottom"]:
		root.add_theme_constant_override("margin_" + side, 6)
	s.add_child(root)
	var col := VBoxContainer.new()
	col.add_theme_constant_override("separation", 4)
	root.add_child(col)
	var head := HBoxContainer.new()
	col.add_child(head)
	head.add_child(UiKit.button("", func(): router.go("town"), false, "back"))
	var rt := UiParts.ribbon_title("열람 일지 — 미션")
	rt.custom_minimum_size = Vector2(150, 20)
	head.add_child(rt)
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	head.add_child(UiKit.label("받을 보상 %d개" % Meta.claimable_count(), Tk.GOLD, 12, true, true))
	var page := UiKit.paper_panel()
	page.size_flags_vertical = Control.SIZE_EXPAND_FILL
	col.add_child(page)
	var scroll := ScrollContainer.new()
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	page.add_child(scroll)
	var list := VBoxContainer.new()
	list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	list.add_theme_constant_override("separation", 4)
	scroll.add_child(list)
	_msg(list, args)
	# 받을 수 있는 것 → 진행 중 → 완료 순
	var ids: Array = DataDB.tables["missions"].keys()
	var order := { "done": 0, "open": 1, "claimed": 2 }
	ids.sort_custom(func(a, b): return order[Meta.mission_state(a)] < order[Meta.mission_state(b)])
	for mid in ids:
		var m: Dictionary = DataDB.tables["missions"][mid]
		var st := Meta.mission_state(mid)
		var row := HBoxContainer.new()
		row.add_theme_constant_override("separation", 6)
		list.add_child(row)
		var stamp := MissionStamp.new()
		stamp.state = st
		stamp.custom_minimum_size = Vector2(22, 22)
		row.add_child(stamp)
		var info := VBoxContainer.new()
		info.add_theme_constant_override("separation", 0)
		info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		row.add_child(info)
		info.add_child(UiKit.label(m["name"], Tk.INK if st != "claimed" else Color("8a7a6a"), 13, false, true))
		var sub := HBoxContainer.new()
		sub.add_theme_constant_override("separation", 6)
		info.add_child(sub)
		sub.add_child(UiKit.label(m["desc"], Color("5a4a3a"), 11))
		var pr := Meta.mission_progress(mid)
		sub.add_child(UiParts.bar(float(pr[0]), float(pr[1]), Color("3f6a3a"), 60, 6))
		sub.add_child(UiKit.label("%d/%d" % pr, Color("5a4a3a"), 10))
		var rw := HBoxContainer.new()
		rw.add_theme_constant_override("separation", 4)
		row.add_child(rw)
		var r: Dictionary = m["reward"]
		for k in r:
			var cur := UiKit.currency({ "gold": "gold", "pages": "page", "potions": "potion", "revives": "revive" }.get(k, "star"), int(r[k]))
			(cur.get_child(1) as Label).add_theme_color_override("font_color", Tk.INK)
			rw.add_child(cur)
		var b := UiKit.button({ "open": "진행 중", "done": "받기!", "claimed": "완료" }[st], func():
			var why := Meta.claim_mission(mid)
			GameState.save_game()
			Sfx.play("fanfare" if why == "" else "hurt", 0.0)
			router.go("missions", { "msg": why if why != "" else "「%s」 보상을 받았어요" % m["name"], "ok": why == "" }), st == "done")
		b.custom_minimum_size = Vector2(52, 20)
		b.disabled = st != "done"
		row.add_child(b)
	return s
