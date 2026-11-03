import { Pressable, View } from "react-native";
import { AppText, Clover, Plus } from "../../components";
import { tokens, useTheme } from "../../theme";

/** A manual-add routine that is due today but not added yet: grey, with + on the right. Tap adds it. */
export function PendingRoutineRow({ title, onAdd }: { title: string; onAdd: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onAdd} accessibilityRole="button" accessibilityLabel={`${title} 오늘 할 일에 추가`}
      style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, opacity: pressed ? 0.6 : 1 })}>
      <Clover size={tokens.size.cloverTodo} state={{ kind: "empty" }} />
      <View style={{ flex: 1 }}><AppText variant="bodyLg" color="textMuted">{title}</AppText></View>
      <Plus size={24} color={c.textMuted} />
    </Pressable>
  );
}
