import { DESIGN_TRIAL } from "../lib/variant";
import { Pressable, View } from "react-native";
import { tokens, useTheme, type ColorName } from "../theme";
import { AppText } from "./AppText";
import { Radio, Toggle } from "./controls";
import { NeonText } from "./Highlight";
import { Check, ChevronRight } from "./icons";
import { useRipple } from "./press";

type Base = { title: string; onPress?: () => void };

function Row({ onPress, onLongPress, delayLongPress, children, height = tokens.size.listRowHeight, bg, divider, a11y }: {
  onPress?: () => void; onLongPress?: () => void; delayLongPress?: number; children: React.ReactNode; height?: number; bg?: string; divider?: boolean; a11y?: string;
}) {
  const { c } = useTheme();
  // rows sit inside the page's side margin; the ripple spreads past it to both screen edges
  const r = useRipple(c.pressRipple, tokens.layout.gutter);
  const base = { minHeight: height, flexDirection: "row" as const, alignItems: "center" as const, gap: 14, borderBottomWidth: divider ? 1 : 0, borderBottomColor: c.divider };
  // A row with no action of its own is a plain container, so controls inside it (a Toggle) stay enabled for screen readers.
  if (!onPress) return <View style={[base, { backgroundColor: bg }]}>{children}</View>;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} accessibilityRole="button" accessibilityLabel={a11y} onPressIn={r.onPressIn} onPressOut={r.onPressOut} style={[base, { backgroundColor: bg }]}>
      {r.layer}
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
  // design app: each setting is its own rounded tile with the value as a chip (not the original's divided list)
  if (DESIGN_TRIAL) return (
    <Tile onPress={onPress} a11y={`${title}, ${value}`}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      <ValueChip value={value} />
    </Tile>
  );
  return (
    <Row onPress={onPress} divider={divider} height={54} a11y={`${title}, ${value}`}>
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
  if (DESIGN_TRIAL) return (
    <Tile>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      <Toggle value={value} onChange={onChange} label={title} />
    </Tile>
  );
  return (
    <Row divider={divider} height={54}>
      <AppText variant="bodyLg" style={{ flex: 1 }}>{title}</AppText>
      <Toggle value={value} onChange={onChange} label={title} />
    </Row>
  );
}

/** Coloured circle icon + label, in the to-do sheet (S05). */
export function SheetMenuRow({ title, icon, color, onPress, half, sub }: Base & { icon: React.ReactNode; color: ColorName;
  /** two to a line (the to-do menu, user's screenshot 2026-11-19); `sub` is a small second line (the alarm time) */
  half?: boolean; sub?: string }) {
  const { c } = useTheme();
  const d = 32;
  // design app: four to a line, a rounded-square icon over a short label (not the original's circle + text rows)
  if (half && DESIGN_TRIAL) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={sub ? `${title} ${sub}` : title}
        style={({ pressed }) => ({ width: "25%", alignItems: "center", gap: 6, paddingVertical: 10, borderRadius: tokens.radius.md, backgroundColor: pressed ? c.surfaceButton : "transparent" })}>
        {/* one soft tile colour for every action, red-tinted only for deleting (not the original's colour per action) */}
        <View style={{ width: 46, height: 46, borderRadius: 15, backgroundColor: color === "menuDelete" ? c.danger + "26" : c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>{icon}</View>
        <AppText variant="small" weight={600} center numberOfLines={1}>{title}</AppText>
        {sub ? <AppText variant="small" color="textMuted" center numberOfLines={1} style={{ marginTop: -4 }}>{sub}</AppText> : null}
      </Pressable>
    );
  }
  if (half) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={sub ? `${title} ${sub}` : title}
        style={({ pressed }) => ({ width: "50%", height: 62, flexDirection: "row", alignItems: "center", gap: 12, paddingRight: 8, borderRadius: tokens.radius.md, backgroundColor: pressed ? c.surfaceButton : "transparent" })}>
        <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c[color], alignItems: "center", justifyContent: "center" }}>{icon}</View>
        <View style={{ flex: 1 }}>
          <AppText variant="bodyLg" numberOfLines={1}>{title}</AppText>
          {sub ? <AppText variant="small" color="textMuted" numberOfLines={1}>{sub}</AppText> : null}
        </View>
      </Pressable>
    );
  }
  return (
    <Row onPress={onPress} height={59}>
      <View style={{ width: d, height: d, borderRadius: d / 2, backgroundColor: c[color], alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <AppText variant="bodyLg">{title}</AppText>
    </Row>
  );
}

/** Grouped radio list (S07c repeat, S21b type). */
export function RadioList<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  const { c } = useTheme();
  // design app: the choice is marked by a check on the right and a bolder label (no left radio circles)
  if (DESIGN_TRIAL) return (
    <View style={{ borderRadius: tokens.radius.lg, overflow: "hidden", backgroundColor: c.surface }} accessibilityRole="radiogroup">
      {options.map((o, i) => (
        <Pressable key={o.value} onPress={() => onChange(o.value)} accessibilityRole="radio" accessibilityState={{ checked: o.value === value }}
          style={{ height: 52, flexDirection: "row", alignItems: "center", paddingHorizontal: 18, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
          <AppText variant="bodyLg" weight={o.value === value ? 700 : 400} color={o.value === value ? "text" : "textSecondary"} style={{ flex: 1 }}>{o.label}</AppText>
          {o.value === value ? <Check size={20} color={c.text} strokeWidth={2.6} /> : null}
        </Pressable>
      ))}
    </View>
  );
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
export function RoutineRow({ status, title, detail, onPress, onLongPress, delayLongPress }: Base & { status: string; detail: string; onLongPress?: () => void; delayLongPress?: number }) {
  // design app: a card with the title first and the status as a small chip beside the rule (not "상태 | 이름")
  if (DESIGN_TRIAL) return <RoutineCard {...{ status, title, detail, onPress, onLongPress, delayLongPress }} />;
  return (
    <Row onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} height={68} divider>
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
export function PillRow({ title, right, rightColor = "text", left, onPress, titleColor, onLongPress, delayLongPress, rightNeon }: Base & {
  right: string; rightColor?: ColorName; left?: React.ReactNode; titleColor?: string; onLongPress?: () => void; delayLongPress?: number;
  /** the right text glows like neon (a D-day on its day) */
  rightNeon?: boolean;
}) {
  const { c } = useTheme();
  // design app: a card row (not the original's pill) with the value and a chevron on the right
  if (DESIGN_TRIAL) return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} accessibilityRole="button" accessibilityLabel={`${title}, ${right}`}
      style={({ pressed }) => ({ minHeight: 56, borderRadius: tokens.radius.md, backgroundColor: pressed ? c.surfaceRow : c.surface, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 })}>
      {titleColor ? <View style={{ width: 4, height: 22, borderRadius: 2, backgroundColor: titleColor }} /> : null}
      <View style={{ flex: 1 }}><AppText variant="bodyLg" weight={600} numberOfLines={1}>{title}</AppText></View>
      {left}
      {rightNeon ? <NeonText variant="body" color={rightColor}>{right}</NeonText>
        : <AppText variant="body" weight={rightColor === "dday" ? 700 : 500} color={rightColor === "text" ? "textMuted" : rightColor}>{right}</AppText>}
      <ChevronRight size={18} color={c.textMuted} />
    </Pressable>
  );
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} accessibilityRole="button" accessibilityLabel={`${title}, ${right}`}
      style={({ pressed }) => ({ height: 48, borderRadius: tokens.radius.pill, backgroundColor: pressed ? c.surfaceRow : c.surfaceInput, flexDirection: "row", alignItems: "center", paddingHorizontal: 20, gap: 10 })}>
      {left}
      <View style={{ flex: 1 }}><AppText variant="bodyLg" weight={titleColor ? 700 : 500} raw={titleColor} numberOfLines={1}>{title}</AppText></View>
      {rightNeon ? <NeonText variant="bodyLg" color={rightColor}>{right}</NeonText>
        : <AppText variant="bodyLg" weight={rightColor === "dday" ? 700 : 400} color={rightColor}>{right}</AppText>}
    </Pressable>
  );
}

function RoutineCard({ status, title, detail, onPress, onLongPress, delayLongPress }: Base & { status: string; detail: string; onLongPress?: () => void; delayLongPress?: number }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} delayLongPress={delayLongPress} accessibilityRole="button" accessibilityLabel={`${title}, ${status}, ${detail}`}
      style={({ pressed }) => ({ minHeight: 64, marginBottom: 8, borderRadius: tokens.radius.md, backgroundColor: pressed ? c.surfaceRow : c.surface, paddingHorizontal: 16, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12 })}>
      <View style={{ flex: 1, gap: 5 }}>
        <AppText variant="bodyLg" weight={600} numberOfLines={1}>{title}</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ paddingHorizontal: 7, paddingVertical: 1, borderRadius: 6, backgroundColor: c.info + "26" }}><AppText variant="small" weight={700} color="info">{status}</AppText></View>
          <AppText variant="small" color="textSecondary" numberOfLines={1} style={{ flex: 1 }}>{detail}</AppText>
        </View>
      </View>
      <ChevronRightMuted />
    </Pressable>
  );
}

function Tile({ onPress, a11y, children }: { onPress?: () => void; a11y?: string; children: React.ReactNode }) {
  const { c } = useTheme();
  const style = { minHeight: 56, marginBottom: 6, paddingHorizontal: 16, borderRadius: tokens.radius.md, backgroundColor: c.surface, flexDirection: "row" as const, alignItems: "center" as const, gap: 12 };
  if (!onPress) return <View style={style}>{children}</View>;
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y} style={({ pressed }) => [style, { backgroundColor: pressed ? c.surfaceRow : c.surface }]}>{children}</Pressable>;
}

function ValueChip({ value }: { value: string }) {
  const { c } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2, paddingLeft: 10, paddingRight: 6, height: 30, borderRadius: 15, backgroundColor: c.surfaceStrong }}>
      <AppText variant="body" weight={600}>{value}</AppText>
      <ChevronRight size={16} color={c.textMuted} />
    </View>
  );
}
