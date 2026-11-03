import { Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function Cell({ label, selected, onPress, a11y }: { label: string; selected: boolean; onPress: () => void; a11y: string }) {
  const { c } = useTheme();
  const d = tokens.size.timeCell;
  return (
    <Pressable onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: selected }} accessibilityLabel={a11y}
      style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: selected ? c.selectedBg : c.surfaceRow, alignItems: "center", justifyContent: "center" }}>
      <AppText variant="bodyLg" weight={600} color={selected ? "onSelected" : "text"}>{label}</AppText>
    </Pressable>
  );
}

/** Always six columns, as in the reference. */
function Grid({ children }: { children: React.ReactNode[] }) {
  const rows: React.ReactNode[][] = [];
  for (let i = 0; i < children.length; i += 6) rows.push(children.slice(i, i + 6));
  return (
    <View style={{ gap: 8 }}>
      {rows.map((r, i) => <View key={i} style={{ flexDirection: "row", justifyContent: "space-between" }}>{r}</View>)}
    </View>
  );
}

/** Hour 0-23 and minute in 5-minute steps, as round buttons (S07d, S22b). */
export function TimeGrid({ hour, minute, onChange }: { hour: number; minute: number; onChange: (h: number, m: number) => void }) {
  return (
    <View style={{ gap: 12 }}>
      <AppText variant="helper" weight={600}>시</AppText>
      <Grid>{HOURS.map((h) => <Cell key={h} label={String(h)} selected={h === hour} onPress={() => onChange(h, minute)} a11y={`${h}시`} />)}</Grid>
      <AppText variant="helper" weight={600} style={{ marginTop: 8 }}>분</AppText>
      <Grid>{MINUTES.map((m) => <Cell key={m} label={String(m).padStart(2, "0")} selected={m === minute} onPress={() => onChange(hour, m)} a11y={`${m}분`} />)}</Grid>
    </View>
  );
}
