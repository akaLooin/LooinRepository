import { useInsets } from "../../theme";
import { router, Slot, usePathname } from "expo-router";
import { View } from "react-native";
import { BottomNav, type Tab } from "../../components";
import { useTheme } from "../../theme";

const PATHS: Record<Tab, string> = { home: "/", explore: "/explore", alerts: "/alerts", send: "/send", me: "/me" };

export default function TabsLayout() {
  const { c } = useTheme();
  const insets = useInsets();
  const path = usePathname();
  const active = path === "/inbox" ? "home" : (Object.keys(PATHS) as Tab[]).find((k) => PATHS[k] === path) ?? "home";
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}><Slot /></View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: c.bg }}>
        <BottomNav active={active} onChange={(t) => path !== PATHS[t] && router.replace(PATHS[t] as never)} />
      </View>
    </View>
  );
}
