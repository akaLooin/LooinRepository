import { DESIGN_TRIAL } from "../lib/variant";
import { Pressable, View } from "react-native";
import { readableOn, tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { StoredImage } from "./StoredImage";
import { Globe, Lock, Plus, Users } from "./icons";

const R = tokens.radius.pill;

export type Visibility = "public" | "followers" | "partial" | "private";

export function VisibilityIcon({ value, size = 18, color }: { value: Visibility; size?: number; color: string }) {
  if (value === "private") return <Lock size={size} color={color} fill={color} />;
  if (value === "public") return <Globe size={size} color={color} />;
  return <Users size={size} color={color} fill={color} />;
}

/** Person chip on top of home (S03). */
export function Chip({ label, avatar, selected, onPress }: { label: string; avatar?: string; selected?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  const h = tokens.size.chipHeight;
  const a = tokens.size.avatarChip;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{ height: h, borderRadius: R, backgroundColor: selected ? c.selectedBg : c.surface, flexDirection: "row", alignItems: "center", paddingLeft: 4, paddingRight: 20, gap: 10 }}
    >
      {avatar ? <StoredImage uri={avatar} label="프로필 사진" style={{ width: a, height: a, borderRadius: a / 2 }} /> : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong }} />}
      <AppText variant="bodyLg" weight={600} color={selected ? "onSelected" : "text"} numberOfLines={1} style={{ maxWidth: 96 }}>{label}</AppText>
    </Pressable>
  );
}

export function IconChip({ children, onPress, label }: { children: React.ReactNode; onPress?: () => void; label: string }) {
  const { c } = useTheme();
  const h = tokens.size.chipHeight;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ width: h, height: h, borderRadius: R, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
      {children}
    </Pressable>
  );
}

/** Category header pill: [visibility icon] name [+]. Name uses the user's colour (S03). */
export function CategoryPill({ title, color, visibility, onAdd, onPress, onLongPress }: { title: string; color: string; visibility: Visibility; onAdd?: () => void; onPress?: () => void; onLongPress?: () => void }) {
  const { c } = useTheme();
  const h = tokens.size.categoryPillHeight;
  const plus = 34;
  // design app: a full-width group title (colour bar, name in its colour, visibility, round +), not the original's pill
  if (DESIGN_TRIAL) {
    const col = readableOn(color, c.bg);
    return (
      <View style={{ flexDirection: "row", alignItems: "center", height: 40, gap: 10 }}>
        <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }} accessibilityRole="button" accessibilityLabel={title} accessibilityHint={onLongPress ? "길게 누르면 카테고리 편집" : undefined}>
          <View style={{ width: 4, height: 18, borderRadius: 2, backgroundColor: col }} />
          <AppText variant="bodyLg" weight={800} raw={col} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</AppText>
          <VisibilityIcon value={visibility} size={14} color={c.textMuted} />
        </Pressable>
        {onAdd ? <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${title}에 할 일 추가`}
          style={{ width: 30, height: 30, borderRadius: 15, borderWidth: 1, borderColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
          <Plus size={16} color={c.text} strokeWidth={2.6} />
        </Pressable> : null}
      </View>
    );
  }
  return (
    <View style={{ flexDirection: "row", alignSelf: "flex-start", maxWidth: "100%", alignItems: "center", height: h, borderRadius: R, backgroundColor: c.surface, paddingLeft: 14, paddingRight: 4, gap: 8 }}>
      <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }} accessibilityRole="button" accessibilityLabel={title} accessibilityHint={onLongPress ? "길게 누르면 카테고리 편집" : undefined}>
        <VisibilityIcon value={visibility} color={c.textMuted} />
        <AppText variant="category" raw={readableOn(color, c.surface)} numberOfLines={1} style={{ flexShrink: 1 }}>{title}</AppText>
      </Pressable>
      {onAdd ? <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${title}에 할 일 추가`}
        style={{ width: plus, height: plus, borderRadius: R, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
        <Plus size={20} color={c.text} strokeWidth={2.4} />
      </Pressable> : null}
    </View>
  );
}

/** Outlined pill button ("주"/"월"), round icon buttons (‹ ›) and the dropdown on the calendar header. */
export function PillButton({ label, onPress, children, round, a11y, pad = 16, gap = 6 }: { label?: string; onPress?: () => void; children?: React.ReactNode; round?: boolean; a11y?: string; pad?: number; gap?: number }) {
  const { c } = useTheme();
  const h = tokens.size.pillButtonHeight;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({ height: h, minWidth: h, paddingHorizontal: round ? 0 : pad, borderRadius: R, borderWidth: 1, borderColor: c.surfaceStrong,
        backgroundColor: pressed ? c.surface : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap })}>
      {children}
      {label ? <AppText variant="body" weight={500}>{label}</AppText> : null}
    </Pressable>
  );
}

/** "+ 추가하기" (S06, S21, S22). */
export function AddPill({ label = "추가하기", onPress }: { label?: string; onPress?: () => void }) {
  const { c } = useTheme();
  // design app: a round + button in the text colour instead of the original's grey "+ 추가하기" pill
  if (DESIGN_TRIAL) return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ width: 36, height: 36, borderRadius: 18, backgroundColor: c.text, opacity: pressed ? 0.7 : 1, alignItems: "center", justifyContent: "center" })}>
      <Plus size={20} color={c.bg} strokeWidth={2.6} />
    </Pressable>
  );
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ height: 38, paddingHorizontal: 16, borderRadius: R, backgroundColor: pressed ? c.surfaceButton : c.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 6 })}>
      <Plus size={18} color={c.text} strokeWidth={2.4} />
      <AppText variant="body" weight={600}>{label}</AppText>
    </Pressable>
  );
}
