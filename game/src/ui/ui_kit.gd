class_name UiKit
extends RefCounted
## 화면 공통 부품: 패널, 버튼, 라벨. 색·여백은 Tk 토큰만 사용.


const UI_DIR := "res://assets/ui/"
static var _tex_cache: Dictionary = {}


static func tex(name: String) -> Texture2D:
	if not _tex_cache.has(name):
		var path := UI_DIR + name + ".png"
		_tex_cache[name] = load(path) if ResourceLoader.exists(path) else null
	return _tex_cache[name]


static func icon(name: String) -> Texture2D:
	return tex("icon_" + name)


## 9-slice 텍스처 스타일. 텍스처가 없으면 단색 상자로 대체.
static func tbox(name: String, margin: int = 5, pad: int = 5, fallback_bg: Color = Tk.INK_SOFT, fallback_border: Color = Tk.PAPER_DIM) -> StyleBox:
	var t := tex(name)
	if t == null:
		return box(fallback_bg, fallback_border, pad)
	var sb := StyleBoxTexture.new()
	sb.texture = t
	sb.texture_margin_left = margin
	sb.texture_margin_right = margin
	sb.texture_margin_top = margin
	sb.texture_margin_bottom = margin
	sb.set_content_margin_all(pad)
	return sb


static func box(bg: Color, border: Color, pad: int = 6) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = border
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(Tk.UI_RADIUS)
	sb.set_content_margin_all(pad)
	return sb


static func panel(bg: Color = Tk.INK_SOFT) -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", tbox("panel_dark", 6, 8, bg))
	return p


static func paper_panel() -> PanelContainer:
	var p := PanelContainer.new()
	p.add_theme_stylebox_override("panel", tbox("panel_paper", 6, 8, Tk.PAPER, Tk.LEATHER))
	return p


static func button(text: String, cb: Callable, primary: bool = false, icon_name: String = "") -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	var k := "btn_ribbon" if primary else "btn_leather"
	b.add_theme_stylebox_override("normal", tbox(k, 4, 4))
	b.add_theme_stylebox_override("hover", tbox(k + "_hover", 4, 4))
	b.add_theme_stylebox_override("pressed", tbox(k + "_pressed", 4, 4))
	b.add_theme_stylebox_override("focus", tbox("btn_focus", 4, 4, Color(0, 0, 0, 0), Tk.GOLD))
	b.add_theme_stylebox_override("disabled", tbox("btn_disabled", 4, 4))
	b.add_theme_color_override("font_color", Tk.PAPER)
	b.add_theme_color_override("font_hover_color", Color("fff1b8"))
	b.add_theme_color_override("font_pressed_color", Tk.PAPER_DIM)
	b.add_theme_color_override("font_disabled_color", Tk.TEXT_DIM)
	b.add_theme_font_size_override("font_size", Tk.FONT_SIZE)
	if icon_name != "" and icon(icon_name):
		b.icon = icon(icon_name)
		b.expand_icon = false
	b.custom_minimum_size = Vector2(0, 18)
	b.pressed.connect(func(): Sfx.play("click", 0.0))
	b.pressed.connect(cb)
	return b


## 아이콘 + 아래 글자 버튼 (하단 메뉴바용)
static func icon_button(icon_name: String, text: String, cb: Callable, badge: int = 0) -> Control:
	var b := Button.new()
	b.flat = true
	b.focus_mode = Control.FOCUS_ALL
	b.custom_minimum_size = Vector2(40, 32)
	b.add_theme_stylebox_override("focus", tbox("btn_focus", 4, 2, Color(0, 0, 0, 0), Tk.GOLD))
	b.pressed.connect(func(): Sfx.play("click", 0.0))
	b.pressed.connect(cb)
	var ic := TextureRect.new()
	ic.texture = icon(icon_name)
	ic.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	ic.position = Vector2(12, 1)
	ic.size = Vector2(16, 16)
	ic.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(ic)
	var l := label(text, Tk.PAPER, 11)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.position = Vector2(0, 18)
	l.size = Vector2(40, 12)
	l.mouse_filter = Control.MOUSE_FILTER_IGNORE
	b.add_child(l)
	if badge > 0:
		var bd := label(str(badge), Tk.TEXT, 11)
		bd.position = Vector2(28, -1)
		bd.add_theme_color_override("font_outline_color", Tk.RIBBON)
		bd.add_theme_constant_override("outline_size", 4)
		bd.mouse_filter = Control.MOUSE_FILTER_IGNORE
		b.add_child(bd)
	return b


## 아이콘 + 숫자 (재화 표시)
static func currency(icon_name: String, value: int) -> HBoxContainer:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 2)
	var ic := TextureRect.new()
	ic.texture = icon(icon_name)
	ic.stretch_mode = TextureRect.STRETCH_KEEP_CENTERED
	ic.custom_minimum_size = Vector2(16, 16)
	h.add_child(ic)
	h.add_child(label(str(value), Tk.PAPER))
	return h


static func label(text: String, color: Color = Tk.TEXT, size: int = Tk.FONT_SIZE, outline: bool = false) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_size_override("font_size", size)
	if outline:
		l.add_theme_color_override("font_outline_color", Tk.INK)
		l.add_theme_constant_override("outline_size", 3)
	return l


## 텍스트 외곽선과 함께 그리기 (커스텀 _draw 용)
static func text(ci: CanvasItem, pos: Vector2, s: String, col: Color, size: int = 11, center: bool = false, outline: Color = Tk.INK) -> void:
	var f := ThemeDB.fallback_font
	var x := pos.x
	if center:
		x -= f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x / 2.0
	if outline.a > 0.0:
		for o in [Vector2(-1, 0), Vector2(1, 0), Vector2(0, -1), Vector2(0, 1)]:
			ci.draw_string(f, Vector2(x, pos.y) + o, s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, outline)
	ci.draw_string(f, Vector2(x, pos.y), s, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)


## 책장 배경 (메뉴 화면 공통)
static func draw_shelves(ci: CanvasItem, size: Vector2, tick: int) -> void:
	ci.draw_rect(Rect2(Vector2.ZERO, size), Tk.INK)
	var rows := int(size.y / 54.0) + 1
	var cols_palette := [Tk.LEATHER, Color("3f5f8a"), Color("5b7d4a"), Color("8a5a9c"), Tk.B_SPINE, Color("6b2f3a")]
	for r in range(rows):
		var y := 10.0 + r * 54.0
		var x := 4.0
		var i := r * 7
		while x < size.x:
			var bw := 6.0 + float((i * 37) % 7)
			var bh := 30.0 + float((i * 53) % 12)
			var c: Color = cols_palette[i % cols_palette.size()]
			ci.draw_rect(Rect2(x, y + 40.0 - bh, bw, bh), c.darkened(0.45))
			ci.draw_rect(Rect2(x + 1, y + 44.0 - bh, bw - 2, 2), Color(Tk.GOLD, 0.25))
			x += bw + 1.0
			i += 1
		ci.draw_rect(Rect2(0, y + 40, size.x, 4), Tk.LEATHER.darkened(0.5))
	# 떠다니는 글자 먼지
	for k in range(18):
		var fx := fmod(k * 97.0 + tick * 0.2 * (1 + k % 3), size.x)
		var fy := fmod(k * 61.0 - tick * 0.15 * (1 + k % 2) + 400.0, size.y)
		ci.draw_rect(Rect2(fx, fy, 1, 1), Color(Tk.GOLD, 0.5))
