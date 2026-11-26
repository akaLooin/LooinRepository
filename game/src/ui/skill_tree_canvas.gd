class_name SkillTreeCanvas
extends Control
## 스킬 트리 그림: 열 제목 + 선행 관계 연결선. 노드 버튼은 화면 코드가 자식으로 올린다.

var cls := ""
var nodes: Dictionary = {}
var columns: Array = []

const COL_W := 54.0
const ROW_H := 56.0
const TOP := 34.0


func node_pos(p: Array) -> Vector2:
	return Vector2(28.0 + float(p[0]) * COL_W, TOP + 6.0 + float(p[1]) * ROW_H)


func _draw() -> void:
	for i in range(columns.size()):
		var x := 28.0 + i * COL_W
		draw_rect(Rect2(x - 24, 2, 48, size.y - 4), Color(Tk.INK, 0.35))
		UiKit.text(self, Vector2(x, 15), columns[i], Tk.GOLD if i == 0 else Tk.PAPER_DIM, 11, true)
	for sid in nodes:
		var n: Dictionary = nodes[sid]
		for pre in n["pre"]:
			var a := node_pos(nodes[pre].get("pos", [0, 0]))
			var b := node_pos(n.get("pos", [0, 0]))
			var learned := Meta.skill_lv(cls, pre) > 0 and Meta.skill_lv(cls, sid) > 0
			var col := Tk.GOLD if learned else (Tk.PAPER_DIM if Meta.skill_lv(cls, pre) > 0 else Color("4a4258"))
			if absf(a.x - b.x) < 1.0:
				draw_line(a + Vector2(0, 17), b - Vector2(0, 17), col, 2.0)
			else:
				var mid := Vector2(a.x, b.y)
				draw_line(a + Vector2(0, 17), mid, col, 2.0)
				draw_line(mid, b - Vector2(17, 0), col, 2.0)
