import { ActivityIndicator, Pressable, View } from "react-native";
import { tokens, useTheme, type ColorName } from "../theme";
import { AppText } from "./AppText";
import { Pause, Play } from "./icons";

type Kind = "sheetPrimary" | "sheetBlock" | "danger" | "plain";

const look: Record<Kind, { bg: ColorName; fg: ColorName; h: number; r: number; w: number }> = {
  sheetPrimary: { bg: "surfaceStrong", fg: "text", h: 50, r: tokens.radius.pill, w: 700 },
  sheetBlock: { bg: "surfaceStrong", fg: "text", h: 48, r: tokens.radius.sm, w: 500 },
  danger: { bg: "surfaceInput", fg: "danger", h: 52, r: tokens.radius.sm, w: 500 },
  plain: { bg: "surfaceRow", fg: "text", h: 46, r: tokens.radius.sm, w: 500 },
};

export function Button({ kind, label, onPress, disabled, loading, flex, height }: { kind: Kind; label: string; onPress?: () => void; disabled?: boolean; loading?: boolean; flex?: boolean; height?: number }) {
  const { c } = useTheme();
  const l = look[kind];
  return (
    <Pressable onPress={onPress} disabled={disabled || loading} accessibilityRole="button" accessibilityState={{ disabled, busy: loading }}
      style={({ pressed }) => ({ flex: flex ? 1 : undefined, height: height ?? l.h, borderRadius: l.r, backgroundColor: pressed ? c.surfaceButton : c[l.bg],
        alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, opacity: disabled ? 0.4 : 1 })}>
      <AppText variant="bodyLg" weight={l.w} color={l.fg}>{label}</AppText>
      {loading ? <ActivityIndicator size="small" color={c[l.fg]} /> : null}
    </Pressable>
  );
}

/** Big tile with icon over label: 수정하기 / 삭제하기 (S05). */
export function TileButton({ label, icon, onPress }: { label: string; icon: React.ReactNode; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={({ pressed }) => ({ flex: 1, height: 85, borderRadius: tokens.radius.md, backgroundColor: pressed ? c.surfaceStrong : c.surfaceButton, alignItems: "center", justifyContent: "center", gap: 10 })}>
      {icon}
      <AppText variant="bodyLg">{label}</AppText>
    </Pressable>
  );
}

/** Header text action: 확인 / 완료. */
export function TextButton({ label, onPress, disabled, raw }: { label: string; onPress?: () => void; disabled?: boolean; raw?: string }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={12} accessibilityRole="button" style={{ opacity: disabled ? 0.4 : 1 }}>
      <AppText variant="bodyLg" weight={500} raw={raw}>{label}</AppText>
    </Pressable>
  );
}

/** Timer start (S08). */
export function PlayButton({ label = "시작하기", running, onPress }: { label?: string; running?: boolean; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      style={{ height: 64, borderRadius: tokens.radius.pill, backgroundColor: c.surfaceInput, flexDirection: "row", alignItems: "center", paddingLeft: 4, paddingRight: 32, gap: 20, alignSelf: "center" }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
        {running ? <Pause size={26} color={c.play} fill={c.play} /> : <Play size={26} color={c.play} fill={c.play} />}
      </View>
      <AppText variant="bodyLg" weight={700}>{label}</AppText>
    </Pressable>
  );
}
