#!/usr/bin/env python3
"""tokens.json -> game/src/ui/tokens.css (CSS 사용자 속성). 토큰을 고친 뒤 다시 실행한다.

    python3 replica/design/build_tokens.py
"""
import json
import pathlib

root = pathlib.Path(__file__).resolve().parents[2]
t = json.loads((root / "replica/design/tokens.json").read_text())
REF = 15  # type.base 가 1em 이 되도록: 모든 길이를 em 으로 바꿔 화면 크기에 비례시킨다


def em(px):
    return "0" if px == 0 else f"{px / REF:.4g}em"


out = ["/* 자동 생성: replica/design/build_tokens.py — 직접 고치지 말 것 */"]
for w, f in (("normal", "Galmuri11"), ("bold", "Galmuri11-Bold")):
    out.append(f'@font-face {{ font-family: "Galmuri11"; font-weight: {w}; src: url("../../node_modules/galmuri/dist/{f}.woff2") format("woff2"); font-display: block; }}')
out.append(":root {")
out.append("  /* 기준 단위: 화면 높이에 비례. 모든 크기가 이 값을 따른다. */")
out.append("  --u: clamp(13px, 3.7vh, 28px);")
for k, v in t["color"].items():
    out.append(f"  --c-{k}: {v};")
out.append(f"  --font: {t['font']['sans']};")
for k, v in t["type"].items():
    out.append(f"  --fs-{k}: {em(v['size'])}; --lh-{k}: {v['line'] / v['size']:.3g}; --fw-{k}: {v['weight']};")
for i, v in enumerate(t["space"]):
    out.append(f"  --sp-{i}: {em(v)};")
for k, v in t["radius"].items():
    out.append(f"  --r-{k}: {em(v) if v < 900 else '999px'};")
for k, v in t["shadow"].items():
    out.append(f"  --sh-{k}: {v};")
for k, v in t["motion"].items():
    out.append(f"  --m-{k}: {v};")
L = t["layout"]
out.append(f"  --bar-h: max({L['touch-min'] + 8}px, {L['bar-height'] * 100:g}vh);")
out.append(f"  --touch: {L['touch-min']}px;")
out.append(f"  --slot: max({L['slot-size']}px, {em(L['slot-size'])});")
out.append(f"  --win-w: {L['window-max-width'] * 100:g}vw; --win-h: {L['window-max-height'] * 100:g}vh;")
out.append("}")
dst = root / "game/src/ui/tokens.css"
dst.write_text("\n".join(out) + "\n")
print("wrote", dst.relative_to(root))
