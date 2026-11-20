import { useInsets } from "../../theme";
import { router } from "expo-router";
import { Modal, Pressable, View } from "react-native";
import { AppText, Bell, BottomSheet, CalendarRange, List, Palette, PopupMenu, Sparkles } from "../../components";
import { DESIGN_TRIAL } from "../../lib/variant";
import { ScaledRoot, tokens, useTheme } from "../../theme";

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
  const insets = useInsets();
  const go = (href: string) => () => {
    onClose();
    router.push(href as never);
  };
  // design app: a sheet of icon tiles (관리) instead of the original's corner popup of pill buttons
  if (DESIGN_TRIAL) return <ManageSheet open={open} onClose={onClose} go={go} />;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <ScaledRoot>
      <Pressable style={{ flex: 1, backgroundColor: tokens.scrim }} onPress={onClose} accessibilityLabel="메뉴 닫기">
        <View style={{ position: "absolute", top: insets.top + 8, right: tokens.layout.gutter - 4 }}>
          <PopupMenu
            items={[
              { label: "할 일 캘린더", onPress: go("/todo-calendar") },
              { label: "카테고리 관리", onPress: go("/categories") },
              { label: "루틴 관리", onPress: go("/routines") },
              { label: "디데이 관리", onPress: go("/ddays") },
              { label: "리마인더 관리", onPress: go("/reminders") },
            ]}
          />
        </View>
      </Pressable>
      </ScaledRoot>
    </Modal>
  );
}

function ManageSheet({ open, onClose, go }: { open: boolean; onClose: () => void; go: (href: string) => () => void }) {
  const { c } = useTheme();
  const tiles: [string, string, typeof List, string][] = [
    ["카테고리", "이름 · 색 · 공개 범위", Palette, "/categories"],
    ["루틴", "반복하는 할 일", List, "/routines"],
    ["디데이", "다가오는 날 세기", Sparkles, "/ddays"],
    ["리마인더", "매일 알림 시간", Bell, "/reminders"],
    ["할 일 캘린더", "한 달 할 일 한눈에", CalendarRange, "/todo-calendar"],
  ];
  return (
    <BottomSheet visible={open} onClose={onClose} title="관리">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {tiles.map(([label, sub, Icon, href]) => (
          <Pressable key={href} onPress={go(href)} accessibilityRole="button" accessibilityLabel={`${label} 관리`}
            style={({ pressed }) => ({ width: "48%", flexGrow: 1, padding: 14, gap: 10, borderRadius: tokens.radius.lg, backgroundColor: pressed ? c.surfaceRow : c.surface })}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}><Icon size={19} color={c.text} /></View>
            <View>
              <AppText variant="body" weight={700}>{label}</AppText>
              <AppText variant="small" color="textMuted" numberOfLines={1}>{sub}</AppText>
            </View>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  );
}
