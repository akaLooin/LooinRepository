extends Node
## 정적 게임 데이터 로더. res://data/*.json 을 읽고 id 참조 무결성을 검사한다.

const FILES := ["classes", "attacks", "skills", "monsters", "dungeons", "items", "skill_tree", "pets", "dialogs", "missions", "sprites"]

var tables: Dictionary = {}
var errors: PackedStringArray = []


func _ready() -> void:
	load_all()


func load_all() -> void:
	tables.clear()
	errors.clear()
	for name in FILES:
		var path := "res://data/%s.json" % name
		var f := FileAccess.open(path, FileAccess.READ)
		if f == null:
			errors.append("missing " + path)
			tables[name] = {}
			continue
		var parsed = JSON.parse_string(f.get_as_text())
		if typeof(parsed) != TYPE_DICTIONARY:
			errors.append("bad json " + path)
			parsed = {}
		tables[name] = parsed
	_validate()
	for e in errors:
		push_error("DataDB: " + e)


func get_row(table: String, id: String) -> Dictionary:
	var t: Dictionary = tables.get(table, {})
	if not t.has(id):
		push_error("DataDB: no %s.%s" % [table, id])
		return {}
	return t[id]


func _need(table: String, id: String, ctx: String) -> void:
	if not tables.get(table, {}).has(id):
		errors.append("%s -> missing %s.%s" % [ctx, table, id])


func _validate() -> void:
	for cid in tables["classes"]:
		var c: Dictionary = tables["classes"][cid]
		for a in c["combo"]:
			_need("attacks", a, cid)
		_need("attacks", c["dash_attack"], cid)
		_need("attacks", c["air_attack"], cid)
		for s in c["skills"]:
			_need("skills", s, cid)
		_need("skill_tree", c["skill_tree"], cid)
	for tid in tables["skill_tree"]:
		var nodes: Dictionary = tables["skill_tree"][tid]["nodes"]
		for nid in nodes:
			if nodes[nid]["kind"] == "active":
				_need("skills", nid, tid)
			for p in nodes[nid]["pre"]:
				if not nodes.has(p):
					errors.append("%s.%s -> missing prereq %s" % [tid, nid, p])
	for sid in tables["skills"]:
		_need("attacks", tables["skills"][sid]["attack"], sid)
	for did in tables["dungeons"]:
		var d: Dictionary = tables["dungeons"][did]
		var stages: Dictionary = d["stages"]
		for row in d.get("drops", {}).get("table", []):
			_need("items", row[0], did)
		for k in d.get("dialogs", {}):
			_need("dialogs", d["dialogs"][k], did)
		if d.has("first_clear_pet"):
			_need("pets", d["first_clear_pet"], did)
		if not stages.has(d["first_stage"]):
			errors.append(did + " first_stage missing")
		for st_id in stages:
			var st: Dictionary = stages[st_id]
			for wave in st["waves"]:
				for sp in wave:
					_need("monsters", sp[0], st_id)
			for n in st["next"]:
				if not stages.has(n[0]):
					errors.append("%s -> missing stage %s" % [st_id, n[0]])
