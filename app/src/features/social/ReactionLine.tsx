import { View } from "react-native";
import { AppText, Sticker, stickerLabel } from "../../components";
import type { Reaction } from "../../data/social";

/** The reactions under a to-do: the emoji people gave, in order (original: the sticker sits under the title). */
export function ReactionLine({ list, size = 44 }: { list: Reaction[]; size?: number }) {
  if (!list.length) return null;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 4 }} accessibilityLabel={`반응 ${list.map((r) => (r.kind === "sticker" ? stickerLabel(r.value) : r.value)).join(" ")}`}>
      {list.map((r, i) => r.kind === "sticker" ? <Sticker key={i} id={r.value} size={size} /> : <AppText key={i} style={{ fontSize: size / 2, lineHeight: size * 0.64 }}>{r.value}</AppText>)}
    </View>
  );
}

