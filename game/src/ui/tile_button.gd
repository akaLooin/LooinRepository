class_name TileButton
extends Button
## 아이템·아이콘 칸: 어두운 바탕 + 색 테두리 + 아이콘 2배 + 모서리 글자.

var icon_tex: Texture2D
var frame_col := Color("6b5a7a")
var corner := ""
var badge := ""
var selected := false
var dim := false
var pips := -1          # 0 이상이면 아래에 레벨 점 표시
var pips_max := 0


func _draw() -> void:
	var r := Rect2(Vector2.ZERO, size)
	var hover := is_hovered() or has_focus()
	draw_rect(r, Tk.INK)
	draw_rect(r.grow(-1), Color("2a2346") if not selected else Color("3f3566"))
	draw_rect(r.grow(-1), frame_col if not dim else frame_col.darkened(0.5), false, 1.0)
	if selected or hover:
		draw_rect(r.grow(-2), Tk.GOLD, false, 1.0)
	if icon_tex:
		# 폰 화면 배율(4배)에서 정수 픽셀이 되도록 0.25 단위로 맞춘다
		var s := floorf(minf(size.x, size.y) * 0.72 / 16.0 * 4.0) / 4.0
		s = maxf(1.0, s)
		var isz := Vector2(16, 16) * s
		draw_texture_rect(icon_tex, Rect2((size - isz) / 2.0 - Vector2(0, 1 if pips >= 0 else 0), isz), false, Color(1, 1, 1, 0.35) if dim else Color.WHITE)
	if corner != "":
		UiKit.text(self, Vector2(size.x - 2 - UiKit.font_bold.get_string_size(corner, HORIZONTAL_ALIGNMENT_LEFT, -1, 9).x, size.y - 3), corner, Tk.GOLD, 9, false)
	if badge != "":
		draw_rect(Rect2(1, 1, 9, 9), Tk.RIBBON)
		UiKit.text(self, Vector2(2.5, 9), badge, Tk.TEXT, 8, false, Color(0, 0, 0, 0))
	if pips >= 0 and pips_max > 0:
		var w := 4.0
		var total := pips_max * (w + 1.0) - 1.0
		for i in range(pips_max):
			draw_rect(Rect2(size.x / 2.0 - total / 2.0 + i * (w + 1.0), size.y - 4, w, 2), Tk.GOLD if i < pips else Color("4a4258"))
