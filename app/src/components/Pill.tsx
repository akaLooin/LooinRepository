import { Image, Pressable, View, type ImageSourcePropType } from "react-native";
import { readableOn, tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Globe, Lock, Plus, Users } from "./icons";

const R = tokens.radius.pill;

export type Visibility = "public" | "followers" | "partial" | "private";

export function VisibilityIcon({ value, size = 18, color }: { value: Visibility; size?: number; color: string }) {
  if (value === "private") return <Lock size={size} color={color} fill={color} />;
  if (value === "public") return <Globe size={size} color={color} />;
  return <Users size={size} color={color} fill={color} />;
}

/** Person chip on top of home (S03). */
export function Chip({ label, avatar, selected, onPress }: { label: string; avatar?: ImageSourcePropType; selected?: boolean; onPress?: () => void }) {
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
      {avatar ? <Image source={avatar} style={{ width: a, height: a, borderRadius: a / 2 }} /> : <View style={{ width: a, height: a, borderRadius: a / 2, backgroundColor: c.surfaceStrong }} />}
      <AppText variant="bodyLg" weight={600} color={selected ? "onSelected" : "text"}>{label}</AppText>
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
  return (
    <View style={{ flexDirection: "row", alignSelf: "flex-start", alignItems: "center", height: h, borderRadius: R, backgroundColor: c.surface, paddingLeft: 14, paddingRight: 4, gap: 8 }}>
      <Pressable onPress={onPress} onLongPress={onLongPress} style={{ flexDirection: "row", alignItems: "center", gap: 8 }} accessibilityRole="button" accessibilityLabel={title}>
        <VisibilityIcon value={visibility} color={c.textMuted} />
        <AppText variant="category" raw={readableOn(color, c.surface)}>{title}</AppText>
      </Pressable>
      <Pressable onPress={onAdd} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${title}에 할 일 추가`}
        style={{ width: plus, height: plus, borderRadius: R, backgroundColor: c.bg, alignItems: "center", justifyContent: "center", marginLeft: 4 }}>
        <Plus size={20} color={c.text} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

/** Outlined pill button ("주"/"월"), round icon buttons (‹ ›) and the dropdown on the calendar header. */
export function PillButton({ label, onPress, children, round, a11y }: { label?: string; onPress?: () => void; children?: React.ReactNode; round?: boolean; a11y?: string }) {
  const { c } = useTheme();
  const h = tokens.size.pillButtonHeight;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({ height: h, minWidth: h, paddingHorizontal: round ? 0 : 16, borderRadius: R, borderWidth: 1, borderColor: c.surfaceStrong,
        backgroundColor: pressed ? c.surface : "transparent", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 })}>
      {children}
      {label ? <AppText variant="body" weight={500}>{label}</AppText> : null}
    </Pressable>
  );
}

/** "+ 추가하기" (S06, S21, S22). */
export function AddPill({ label = "추가하기", onPress }: { label?: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button"
      style={({ pressed }) => ({ height: 38, paddingHorizontal: 16, borderRadius: R, backgroundColor: pressed ? c.surfaceButton : c.surfaceStrong, flexDirection: "row", alignItems: "center", gap: 6 })}>
      <Plus size={18} color={c.text} strokeWidth={2.4} />
      <AppText variant="body" weight={600}>{label}</AppText>
    </Pressable>
  );
}
