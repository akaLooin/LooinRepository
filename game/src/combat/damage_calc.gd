class_name DamageCalc
extends RefCounted
## 데미지 공식 (순수 함수). 크리티컬 x1.5, 백어택 x1.2.

const CRIT_MUL := 1.5
const BACK_MUL := 1.2


static func resolve(atk: float, def: float, mul: float, crit_rate: float, is_back: bool, rng: RandomNumberGenerator) -> Dictionary:
	var base := maxf(1.0, atk * mul - def * 0.5)
	base *= rng.randf_range(0.95, 1.05)
	var crit := rng.randf() < crit_rate
	if crit:
		base *= CRIT_MUL
	if is_back:
		base *= BACK_MUL
	return { "dmg": int(round(base)), "crit": crit, "back": is_back }
