class_name UiParts
extends RefCounted
## 화면 공통 부품: 아이템 칸, 아이콘 칸, 리본 제목, 진행 막대, 캐릭터 스프라이트, 비교 수치.

const GRADE_COL := { "common": Color("9aa7b8"), "rare": Color("4fb3ff"), "epic": Color("c77dff") }


static func item_icon(item_id: String) -> Texture2D:
	var d := Meta.item_def(item_id)
	return UiKit.tex("item_%s_%s" % [d.get("icon", d["slot"]), d["grade"]])


## 아이템 한 칸 (등급 색 테두리 + 아이콘 2배 + 강화 수치 + 착용 표시)
static func item_tile(it: Dictionary, cb: Callable, selected: bool = false, sz: float = 30.0) -> Button:
	var b := TileButton.new()
	b.custom_minimum_size = Vector2(sz, sz)
	b.focus_mode = Control.FOCUS_ALL
	b.flat = true
	if not it.is_empty():
		b.icon_tex = item_icon(it["item"])
		b.frame_col = GRADE_COL[Meta.item_def(it["item"])["grade"]]
		b.corner = ("+%d" % int(it["enh"])) if int(it.get("enh", 0)) > 0 else ""
		b.badge = "E" if it.has("uid") and Meta.equipped_by(it["uid"]) != "" else ""
	b.selected = selected
	b.pressed.connect(func(): Sfx.play("click", 0.0))
	b.pressed.connect(cb)
	return b


## 아이콘 한 칸 (재화·스킬·빈 슬롯)
static func icon_tile(tex: Texture2D, cb: Callable, selected: bool = false, sz: float = 30.0, frame: Color = Color("6b5a7a"), dim: bool = false) -> Button:
	var b := TileButton.new()
	b.custom_minimum_size = Vector2(sz, sz)
	b.focus_mode = Control.FOCUS_ALL
	b.flat = true
	b.icon_tex = tex
	b.frame_col = frame
	b.selected = selected
	b.dim = dim
	b.pressed.connect(func(): Sfx.play("click", 0.0))
	b.pressed.connect(cb)
	return b


static func ribbon_title(text: String) -> Control:
	var c := RibbonTitle.new()
	c.text = text
	c.custom_minimum_size = Vector2(0, 20)
	return c


static func bar(value: float, maxv: float, col: Color, w: float = 80.0, h: float = 6.0) -> Control:
	var b := MiniBar.new()
	b.ratio = clampf(value / maxf(maxv, 0.0001), 0.0, 1.0)
	b.col = col
	b.custom_minimum_size = Vector2(w, h)
	return b


## 캐릭터 스프라이트 한 프레임을 크게 (없으면 빈 칸)
static func char_sprite(class_id: String, scale: float = 2.0, row: int = 0, col: int = 0, silhouette: bool = false) -> Control:
	var t := TextureRect.new()
	var sp: Dictionary = DataDB.tables.get("sprites", {}).get(class_id, {})
	if sp.is_empty() or not ResourceLoader.exists(sp["sheet"]):
		t.custom_minimum_size = Vector2(48, 48) * scale
		return t
	var at := AtlasTexture.new()
	at.atlas = load(sp["sheet"])
	var fw := float(sp["frame"][0])
	var fh := float(sp["frame"][1])
	at.region = Rect2(col * fw, row * fh, fw, fh)
	t.texture = at
	t.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	t.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	t.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	t.custom_minimum_size = Vector2(fw, fh) * scale
	if silhouette:
		t.modulate = Color(0.05, 0.04, 0.09, 0.9)
	return t


## 능력치 비교 문자열: 새 장비가 지금 착용한 것보다 얼마나 나은지
static func compare_text(new_st: Dictionary, old_st: Dictionary) -> String:
	var parts: PackedStringArray = []
	for k in ["atk", "def", "hp", "crit"]:
		var dv := float(new_st.get(k, 0.0)) - float(old_st.get(k, 0.0))
		if absf(dv) < 0.0001:
			continue
		var name: String = Meta.STAT_NAMES[k]
		if k == "crit":
			parts.append("%s %s%d%%" % [name, "+" if dv > 0 else "", int(round(dv * 100.0))])
		else:
			parts.append("%s %s%d" % [name, "+" if dv > 0 else "", int(dv)])
	return "  ".join(parts) if not parts.is_empty() else "변화 없음"


static func compare_color(new_st: Dictionary, old_st: Dictionary) -> Color:
	var score := 0.0
	for k in ["atk", "def", "hp", "crit"]:
		var w := { "atk": 3.0, "def": 1.5, "hp": 0.2, "crit": 600.0 }[k] as float
		score += (float(new_st.get(k, 0.0)) - float(old_st.get(k, 0.0))) * w
	if score > 0.01:
		return Tk.EXP
	if score < -0.01:
		return Tk.DANGER
	return Tk.TEXT_DIM


## 가로로 줄 바꿈되는 칸 묶음
static func grid(cols: int, gap: int = 3) -> GridContainer:
	var g := GridContainer.new()
	g.columns = cols
	g.add_theme_constant_override("h_separation", gap)
	g.add_theme_constant_override("v_separation", gap)
	return g


static func hsep(px: int = 4) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, px)
	return c
