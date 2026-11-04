#!/usr/bin/env python3
"""tokens.json -> DesignTokens.kt (Jetpack Compose). 표준 라이브러리만 사용.
    python3 replica/design/gen_compose_tokens.py replica/design/tokens.json \
        app/src/main/java/com/looin/filmcam/ui/theme/DesignTokens.kt
토큰을 바꾸면 다시 실행. 컴포넌트는 raw 색 대신 FilmColors.xxx 를 쓴다."""
import json, sys, re

def camel(s):
    p = re.split(r"[-_]", s)
    return p[0] + "".join(x.title() for x in p[1:])

def main(src, dst):
    t = json.load(open(src))
    L = ["// 자동 생성 파일: replica/design/gen_compose_tokens.py. 직접 수정하지 말 것.",
         "package com.looin.filmcam.ui.theme", "",
         "import androidx.compose.ui.graphics.Color",
         "import androidx.compose.ui.unit.dp",
         "",
         "object FilmColors {"]
    for k, v in t["color"].items():
        L.append(f"    val {camel(k)} = Color(0xFF{v.lstrip('#').upper()})")
    L += ["}", "", "object FilmSpace {"]
    for i, v in enumerate(t["space"]):
        L.append(f"    val s{i} = {v}.dp")
    L += ["}", "", "object FilmRadius {"]
    for k, v in t["radius"].items():
        L.append(f"    val {camel(k)} = {v}.dp")
    L += ["}", "", "object FilmSize {"]
    for k, v in t["size"].items():
        if isinstance(v, (int, float)):
            L.append(f"    val {camel(k)} = {v}.dp")
    L += ["}", "", "data class TypeToken(val size: Int, val line: Int, val weight: Int, val mono: Boolean, val tracking: Float)", "",
          "object FilmType {"]
    for k, v in t["type"].items():
        L.append(f"    val {camel(k)} = TypeToken({v['size']}, {v['line']}, {v['weight']}, {str(v.get('font')=='mono').lower()}, {v.get('tracking',0)}f)")
    L += ["}", "", "object FilmMotion {"]
    for k, v in t["motion"].items():
        if k.startswith("_") or not v.endswith("ms"): continue
        L.append(f"    const val {camel(k)}Ms = {v[:-2]}")
    L += ["}", ""]
    open(dst, "w").write("\n".join(L))
    print("wrote", dst)

main(*sys.argv[1:3])
