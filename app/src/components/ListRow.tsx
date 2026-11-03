import { Pressable, View } from "react-native";
import { tokens, useTheme, type ColorName } from "../theme";
import { AppText } from "./AppText";
import { Radio, Toggle } from "./controls";
import { ChevronRight } from "./icons";

type Base = { title: string; onPress?: () => void };

function Row({ onPress, children, height = tokens.size.listRowHeight, bg, divider, a11y }: { onPress?: () => void; children: React.ReactNode; height?: number; bg?: string; divider?: boolean; a11y?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? "button" : undefined} accessibilityLabel={a11y}
      style={({ pressed }) => ({ minHeight: height, flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: pressed ? c.surfaceRow : bg,
        borderBottomWidth: divider ? 1 : 0, borderBottomColor: c.divider })}>
      {children}
    </Pressable>
  );
}

/** Icon + label (S12). */
export function SettingsRow({ title, icon, onPress }: Base & { icon: React.ReactNode }) {
  return <Row onPress={onPress}>{icon}<AppText variant="bodyLg">{title}</AppText></Row>;
}

/** Label ... value › (S12d lower half). */
export function ValueRow({ title, value, onPress, divider = true }: Base & { value: string; divider?: boolean }) {
  return (
    <Row onPress={onPress} divider={divider} height={60} a11y={`${title}, ${value}`}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      <AppText variant="bodyLg" color="text">{value}</AppText>
      <ChevronRightMuted />
    </Row>
  );
}

function ChevronRightMuted() {
  const { c } = useTheme();
  return <ChevronRight size={20} color={c.textMuted} />;
}

/** Label ... [ON] (S12d upper half). */
export function ToggleRow({ title, value, onChange, divider = true }: { title: string; value: boolean; onChange: (v: boolean) => void; divider?: boolean }) {
  return (
    <Row divider={divider} height={60}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      <Toggle value={value} onChange={onChange} label={title} />
    </Row>
  );
}

/** Coloured circle icon + label, in the to-do sheet (S05). */
export function SheetMenuRow({ title, icon, color, onPress }: Base & { icon: React.ReactNode; color: ColorName }) {
  const { c } = useTheme();
  const d = 36;
  return (
    <Row onPress={onPress} height={66}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c[color], alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <AppText variant="bodyLg">{title}</AppText>
    </Row>
  );
}

/** Grouped radio list (S07c repeat, S21b type). */
export function RadioList<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ borderRadius: tokens.radius.lg, overflow: "hidden", gap: 1, backgroundColor: c.bg }} accessibilityRole="radiogroup">
      {options.map((o) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: o.value === value }}
          style={{ height: 52, backgroundColor: c.surfaceRow, flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 20 }}>
          <Radio selected={o.value === value} />
          <AppText variant="bodyLg">{o.label}</AppText>
        </Pressable>
      ))}
    </View>
  );
}

/** Routine row: status | name / period and rule › (S07). */
export function RoutineRow({ status, title, detail, onPress }: Base & { status: string; detail: string }) {
  return (
    <Row onPress={onPress} height={74} divider>
      <View style={{ flex: 1, gap: 4 }}>
        <AppText variant="bodyLg" weight={600}>
          <AppText variant="bodyLg" weight={600} color="info">{status}</AppText>
          <AppText variant="bodyLg" color="textMuted"> | </AppText>
          {title}
        </AppText>
        <AppText variant="small" color="textSecondary">{detail}</AppText>
      </View>
      <ChevronRightMuted />
    </Row>
  );
}

/** Rounded row with a right-hand value: D-day list, category list (S21, S06). */
export function PillRow({ title, right, rightColor = "text", left, onPress, titleColor }: Base & { right: string; rightColor?: ColorName; left?: React.ReactNode; titleColor?: string }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${title}, ${right}`}
      style={({ pressed }) => ({ height: 52, borderRadius: tokens.radius.pill, backgroundColor: pressed ? c.surfaceRow : c.surfaceInput, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10 })}>
      {left}
      <View style={{ flex: 1 }}><AppText variant="bodyLg" weight={titleColor ? 700 : 500} raw={titleColor} numberOfLines={1}>{title}</AppText></View>
      <AppText variant="bodyLg" weight={rightColor === "dday" ? 700 : 400} color={rightColor}>{right}</AppText>
    </Pressable>
  );
}
