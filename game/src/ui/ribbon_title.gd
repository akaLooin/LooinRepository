class_name RibbonTitle
extends Control
## 리본 모양 제목 띠

var text := ""


func _draw() -> void:
	var w := size.x
	draw_rect(Rect2(0, 3, 6, size.y - 6), Tk.RIBBON.darkened(0.35))
	draw_rect(Rect2(w - 6, 3, 6, size.y - 6), Tk.RIBBON.darkened(0.35))
	draw_rect(Rect2(4, 0, w - 8, size.y - 2), Tk.RIBBON)
	draw_rect(Rect2(4, 0, w - 8, 2), Color("f07a86"))
	draw_rect(Rect2(4, size.y - 4, w - 8, 2), Tk.RIBBON.darkened(0.2))
	UiKit.text(self, Vector2(w / 2.0, size.y - 6), text, Tk.PAPER, 12, true)
