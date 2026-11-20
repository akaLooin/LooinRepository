import { useInsets } from "../../theme";
import { router, Slot, usePathname } from "expo-router";
import { View } from "react-native";
import { BottomNav, DESIGN_TABS, type Tab } from "../../components";
import { DESIGN_TRIAL } from "../../lib/variant";
import { useTheme } from "../../theme";
import { useUnreadConversations } from "../../data/chat";

const PATHS: Record<Tab, string> = { home: "/", explore: "/explore", alerts: "/alerts", send: "/send", me: "/me", calendar: "/calendar", together: "/together" };

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useInsets();
  const path = usePathname();
  const unread = useUnreadConversations();
  const active = path === "/inbox" ? "home" : (Object.keys(PATHS) as Tab[]).find((k) => PATHS[k] === path) ?? "home";
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}><Slot /></View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: c.bg }}>
        {DESIGN_TRIAL ? (
          // design app (2026-11-21): 오늘 · 달력 · 함께 · 나; 대화 and 알림 open from 함께
          <BottomNav items={DESIGN_TABS} active={["/explore", "/alerts", "/send"].includes(path) ? "together" : active} dots={{ together: unread > 0 }}
            onChange={(t) => path !== PATHS[t] && router.replace(PATHS[t] as never)} />
        ) : (
          <BottomNav active={active} dots={{ send: unread > 0 }} onChange={(t) => path !== PATHS[t] && router.replace(PATHS[t] as never)} />
        )}
      </View>
    </View>
  );
}
