import { useEffect, useState } from "react";
import { Animated, Modal, Pressable, View } from "react-native";
import { ScaledRoot, tokens, useInsets, useTheme } from "../theme";
import { AppText } from "./AppText";
import { TextButton } from "./Button";
import { useSheetDrag } from "./useSheetDrag";

/**
 * Sheet that slides up over a dimmed screen (S05, S05a, S06c, S07d, S22b).
 * Closes on backdrop tap, Android back, or dragging the top (grabber/title) down.
 */
export function BottomSheet({ visible, onClose, title, right, children, inline }: {
  visible: boolean; onClose: () => void; title?: string; right?: { label: string; onPress: () => void }; children: React.ReactNode; inline?: boolean;
}) {
  const { c } = useTheme();
  const insets = useInsets();
  // stay mounted while sliding out
  const [mounted, setMounted] = useState(visible);
  useEffect(() => { if (visible) setMounted(true); }, [visible]);
  const { translateY, scrimOpacity, handlers } = useSheetDrag(visible, onClose, () => setMounted(false));

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
  const body = { backgroundColor: c.surfaceRaised, borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet, paddingTop: 12, paddingHorizontal: tokens.layout.gutter, paddingBottom: 24 + insets.bottom };
  if (inline) return <View style={body}>{top}{children}</View>; // for the design gallery
  if (!mounted && !visible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <ScaledRoot>
        <View style={{ flex: 1, justifyContent: "flex-end" }}>
          <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.scrim, opacity: scrimOpacity }}>
            <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="닫기" />
          </Animated.View>
          <Animated.View style={[body, { transform: [{ translateY }] }]}>
            {top}
            {children}
          </Animated.View>
        </View>
      </ScaledRoot>
    </Modal>
  );
}
