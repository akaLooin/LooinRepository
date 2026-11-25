class_name RankCalc
extends RefCounted
## 던전 결과 랭크: 클리어 시간, 피격 횟수, 최대 콤보로 점수를 매긴다.

const RANKS := ["D", "C", "B", "A", "S"]


static func score(time_sec: float, par_sec: float, hits_taken: int, max_combo: int) -> int:
	var s := 100.0
	s -= maxf(0.0, time_sec - par_sec) * 0.25
	s -= hits_taken * 2.0
	s += minf(30.0, max_combo * 0.6)
	return int(clampf(s, 0.0, 130.0))


static func rank_of(score_v: int) -> String:
	if score_v >= 110:
		return "S"
	if score_v >= 90:
		return "A"
	if score_v >= 70:
		return "B"
	if score_v >= 50:
		return "C"
	return "D"


static func rank_value(r: String) -> int:
	return RANKS.find(r)
