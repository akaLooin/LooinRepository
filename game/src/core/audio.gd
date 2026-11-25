extends Node
## 효과음·배경음 재생. 효과음은 플레이어 풀을 돌려 쓰고, 배경음은 페이드로 바꾼다.

const SFX_DIR := "res://assets/audio/"
const POOL := 10

var _players: Array[AudioStreamPlayer] = []
var _next := 0
var _cache: Dictionary = {}
var _bgm: AudioStreamPlayer
var _bgm_name := ""
var _last_play: Dictionary = {}


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in range(POOL):
		var p := AudioStreamPlayer.new()
		add_child(p)
		_players.append(p)
	_bgm = AudioStreamPlayer.new()
	add_child(_bgm)


func _stream(name: String) -> AudioStream:
	if not _cache.has(name):
		var path := SFX_DIR + name + ".ogg"
		_cache[name] = load(path) if ResourceLoader.exists(path) else null
	return _cache[name]


func _vol(kind: String) -> float:
	var v := float(GameState.data.get("settings", {}).get(kind, 1.0))
	return -80.0 if v <= 0.01 else linear_to_db(v)


## 같은 소리가 한 틱에 여러 번 겹치면 하나만 낸다.
func play(name: String, pitch_jitter: float = 0.06) -> void:
	if GameState.autoplay and DisplayServer.get_name() == "headless":
		return
	var now := Engine.get_physics_frames()
	if _last_play.get(name, -1) == now:
		return
	_last_play[name] = now
	var s := _stream(name)
	if s == null:
		return
	var p := _players[_next]
	_next = (_next + 1) % POOL
	p.stream = s
	p.volume_db = _vol("sfx")
	p.pitch_scale = 1.0 + randf_range(-pitch_jitter, pitch_jitter)
	p.play()


func bgm(name: String) -> void:
	if name == _bgm_name:
		_bgm.volume_db = _vol("bgm")
		return
	_bgm_name = name
	var s := _stream(name)
	if s == null:
		_bgm.stop()
		return
	if s is AudioStreamOggVorbis:
		(s as AudioStreamOggVorbis).loop = true
	_bgm.stream = s
	_bgm.volume_db = _vol("bgm")
	_bgm.play()


func refresh_volume() -> void:
	_bgm.volume_db = _vol("bgm")
