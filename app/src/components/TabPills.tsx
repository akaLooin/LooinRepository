import { Pressable, ScrollView } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";

/** A row of pill tabs (검색 filters, 알림 tabs). Scrolls sideways when it does not fit. */
export function TabPills<K extends string>({ items, value, onChange, dot }: { items: readonly (readonly [K, string])[]; value: K; onChange: (k: K) => void; dot?: Partial<Record<K, boolean>> }) {
  const { c } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: tokens.layout.gutter }} accessibilityRole="tablist">
      {items.map(([k, l]) => {
        const on = value === k;
        return (
          <Pressable key={k} onPress={() => onChange(k)} accessibilityRole="tab" aria-selected={on} accessibilityLabel={dot?.[k] ? `${l}, 새 알림` : l}
            style={{ height: 34, paddingHorizontal: 16, borderRadius: tokens.radius.pill, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: on ? c.text : c.surface }}>
            <AppText variant="body" weight={600} raw={on ? c.bg : c.text}>{l}</AppText>
            {dot?.[k] ? <AppText variant="small" raw={c.sunday}>●</AppText> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
