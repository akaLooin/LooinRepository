import { router } from "expo-router";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { PopupMenu } from "../../components";
import { tokens, useTheme } from "../../theme";

/** Three uneven bars, our own drawing of a menu button. */
export function MenuButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  const bar = (w: number) => <View style={{ width: w, height: 3, borderRadius: 2, backgroundColor: c.text }} />;
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel="관리 메뉴" style={{ gap: 5, alignItems: "flex-start", padding: 4 }}>
      {bar(24)}{bar(24)}{bar(17)}
    </Pressable>
  );
}

/** S06m: popup anchored top-right over a dimmed screen. */
export function HomeMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const go = (href: string) => () => {
    onClose();
    router.push(href as never);
  };
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={{ flex: 1, backgroundColor: tokens.scrim }} onPress={onClose} accessibilityLabel="메뉴 닫기">
        <View style={{ position: "absolute", top: insets.top + 8, right: tokens.layout.gutter - 4 }}>
          <PopupMenu
            items={[
              { label: "카테고리 관리", onPress: go("/categories") },
              { label: "루틴 관리", onPress: go("/routines") },
              { label: "디데이 관리", onPress: go("/ddays") },
              { label: "리마인더 관리", onPress: go("/reminders") },
            ]}
          />
        </View>
      </Pressable>
    </Modal>
  );
}
