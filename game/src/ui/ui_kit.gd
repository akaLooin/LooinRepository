class_name UiKit
extends RefCounted
## 화면 공통 부품: 패널, 버튼, 라벨. 색·여백은 Tk 토큰만 사용.


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
	p.add_theme_stylebox_override("panel", box(bg, Tk.PAPER_DIM, 8))
	return p


static func button(text: String, cb: Callable, primary: bool = false) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_ALL
	var base := Tk.RIBBON if primary else Tk.INK_SOFT
	b.add_theme_stylebox_override("normal", box(base, Tk.PAPER_DIM, 3))
	b.add_theme_stylebox_override("hover", box(base.lightened(0.15), Tk.PAPER, 3))
	b.add_theme_stylebox_override("pressed", box(base.darkened(0.2), Tk.PAPER, 3))
	b.add_theme_stylebox_override("focus", box(Color(0, 0, 0, 0), Tk.GOLD, 3))
	b.add_theme_stylebox_override("disabled", box(Tk.INK, Tk.INK_SOFT, 3))
	b.add_theme_color_override("font_color", Tk.TEXT)
	b.add_theme_color_override("font_disabled_color", Tk.TEXT_DIM)
	b.add_theme_font_size_override("font_size", Tk.FONT_SIZE)
	b.custom_minimum_size = Vector2(0, 18)
	b.pressed.connect(func(): Sfx.play("click", 0.0))
	b.pressed.connect(cb)
	return b


static func label(text: String, color: Color = Tk.TEXT, size: int = Tk.FONT_SIZE) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_color_override("font_color", color)
	l.add_theme_font_size_override("font_size", size)
	return l


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
