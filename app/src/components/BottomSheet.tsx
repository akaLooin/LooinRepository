import { useEffect, useRef, useState } from "react";
import { Animated, BackHandler, Dimensions, Easing, Keyboard, Modal, Platform, Pressable, View } from "react-native";
import { usePortal } from "./Portal";
import { KeyboardSpacer } from "./KeyboardSpacer";
import { ScaledRoot, tokens, useDesignScale, useInsets, useTheme } from "../theme";
import { AppText } from "./AppText";
import { TextButton } from "./Button";
import { useSheetDrag } from "./useSheetDrag";
import { X } from "./icons";
import { DESIGN_TRIAL } from "../lib/variant";

/**
 * Sheet that slides up over a dimmed screen (S05, S05a, S06c, S07d, S22b).
 * Closes on backdrop tap, Android back, or dragging the top (grabber/title) down.
 */
export function BottomSheet({ visible, onClose, title, right, children, inline, onBack }: {
  visible: boolean; onClose: () => void; title?: string; right?: { label: string; onPress: () => void }; children: React.ReactNode; inline?: boolean;
  /** the phone's back button, when it should step back inside the sheet instead of closing it (default: close) */
  onBack?: () => void;
}) {
  const { c, skin } = useTheme();
  const insets = useInsets();
  // stay mounted while sliding out
  const [mounted, setMounted] = useState(visible);
  useEffect(() => { if (visible) setMounted(true); }, [visible]);
  const { translateY, scrimOpacity, handlers } = useSheetDrag(visible, onClose, () => setMounted(false));
  // The sheet rises above the keyboard (memo field), so what is typed stays in view (user).
  const s = useDesignScale();
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (Platform.OS === "web" || !mounted || DESIGN_TRIAL) return; // the main app's sheets follow KeyboardSpacer
    const move = (to: number, ms: number) =>
      Animated.timing(lift, { toValue: to, duration: ms, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    const show = Keyboard.addListener("keyboardDidShow", (e) => {
      const covered = Dimensions.get("screen").height - e.endCoordinates.screenY; // from the screen's bottom edge
      move(-Math.max(0, covered / s - insets.bottom), 180);
    });
    const hide = Keyboard.addListener("keyboardDidHide", () => move(0, 160));
    return () => { show.remove(); hide.remove(); };
  }, [mounted, s, insets.bottom, lift]);

  const top = (
    <View {...(inline ? {} : handlers)} accessibilityHint={inline ? undefined : "아래로 끌어 닫기"}>
      <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.grabber, marginBottom: title ? 0 : 12 }} />
      {title ? (
        <View style={{ height: 64, justifyContent: "center" }}>
          <AppText variant="sheetTitle" center accessibilityRole="header" numberOfLines={1} style={{ paddingHorizontal: 64 }}>{title}</AppText>
          {right ? <View style={{ position: "absolute", right: 0 }}><TextButton label={right.label} onPress={right.onPress} /></View> : null}
        </View>
      ) : null}
    </View>
  );
  // design app (not the original's edge-to-edge sheet with a grabber and centred title): a floating card with all
  // corners round, the title on the left and a round close button (or the action as a pill) on the right
  const designTop = (
    <View {...(inline ? {} : handlers)} accessibilityHint={inline ? undefined : "아래로 끌어 닫기"}
      style={{ flexDirection: "row", alignItems: "center", minHeight: title ? 52 : 20, marginBottom: title ? 6 : 0 }}>
      <AppText variant="sheetTitle" accessibilityRole="header" numberOfLines={1} style={{ flex: 1, textAlign: "left", fontWeight: "800" }}>{title ?? ""}</AppText>
      {right ? (
        <Pressable onPress={right.onPress} hitSlop={8} accessibilityRole="button" accessibilityLabel={right.label}
          style={{ height: 34, paddingHorizontal: 14, borderRadius: 17, backgroundColor: c.text, alignItems: "center", justifyContent: "center" }}>
          <AppText variant="body" weight={700} raw={c.bg}>{right.label}</AppText>
        </Pressable>
      ) : title ? (
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" accessibilityLabel="닫기"
          style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
          <X size={18} color={c.text} strokeWidth={2.6} />
        </Pressable>
      ) : null}
    </View>
  );
  const body = DESIGN_TRIAL
    ? { backgroundColor: c.surfaceRaised, borderRadius: skin.square ? 3 : 28, ...(skin.square ? { borderWidth: 2, borderColor: c.text } : {}), marginHorizontal: 8, marginBottom: 8 + insets.bottom, paddingTop: 14, paddingHorizontal: tokens.layout.gutter - 4, paddingBottom: 20 }
    : { backgroundColor: c.surfaceRaised, borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet, paddingTop: 12, paddingHorizontal: tokens.layout.gutter, paddingBottom: 24 + insets.bottom };
  const head = DESIGN_TRIAL ? designTop : top;
  if (inline) return <View style={body}>{head}{children}</View>; // for the design gallery
  // 메인 앱: drawn on top of the app in its own window (Portal), not as a separate Android window, so the keyboard
  // opens at once and stays open when moving from one field to the next (user, 2026-11-23). The sheet rides the
  // keyboard frame by frame (KeyboardSpacer).
  const overlay = DESIGN_TRIAL && (mounted || visible) ? (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.scrim, opacity: scrimOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="닫기" />
      </Animated.View>
      <Animated.View style={[body, { transform: [{ translateY }] }]}>
        {head}
        {children}
      </Animated.View>
      <KeyboardSpacer already={8 + insets.bottom} />
    </View>
  ) : null;
  usePortal(DESIGN_TRIAL && !inline ? overlay : null);
  useEffect(() => {
    if (!DESIGN_TRIAL || inline || !visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { (onBack ?? onClose)(); return true; });
    return () => sub.remove();
  }, [visible, inline, onBack, onClose]);
  if (DESIGN_TRIAL) return null;
  if (!mounted && !visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onBack ?? onClose} statusBarTranslucent>
      <ScaledRoot>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.scrim, opacity: scrimOpacity }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="닫기" />
          </Animated.View>
          <Animated.View style={[body, { transform: [{ translateY: Animated.add(translateY, lift) }] }]}>
            {head}
            {children}
          </Animated.View>
        </View>
      </ScaledRoot>
    </Modal>
  );
}
