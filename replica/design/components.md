# Components (built in app/src/main/java/com/looin/studio/ui)

Chip            category / ratio / speed / quality. selected = text-on-bg inverted. clickable, Role.Button, `selected` semantics.
PresetTile      68dp thumbnail rendered by the real GL chain, name below; selected = 2dp accent border; active-in-stack = accent dot; favourite = heart.
EditSlider      label · slider · value. One undo step per drag (state captured on first move, committed on release).
Tool tab bar    필터 / 효과 / 조정 / 자르기 / (트림 for video). Selected = accent text.
Icon button     48dp touch target; disabled = border colour.
CompareButton   press-and-hold shows the original; content description "길게 눌러 원본 보기".
ActionCard      home: big gradient card + accent circle icon.
ExportSheet     ModalBottomSheet: quality chips → primary/secondary wide buttons → progress → done (열기 / 공유).
Icons           Material Symbols (Apache 2.0) via material-icons-extended. Logo: the owner's own Looin mark.
