import { useInsets } from "../../theme";
import { router, Slot, usePathname } from "expo-router";
import { Activity, useEffect, useState } from "react";
import { View } from "react-native";
import { CalendarTab } from "../../features/today/CalendarTab";
import { HomeDash } from "../../features/today/HomeDash";
import { ProfileTab } from "../../features/today/ProfileTab";
import { TogetherScreen } from "../../features/today/TogetherScreen";
import { onTabSwitch } from "../../lib/tabSwitch";
import { BottomNav, DESIGN_TABS, type Tab } from "../../components";
import { DESIGN_TRIAL } from "../../lib/variant";
import { useTheme } from "../../theme";
import { useUnreadConversations } from "../../data/chat";

const PATHS: Record<Tab, string> = { home: "/", explore: "/explore", alerts: "/alerts", send: "/send", me: "/me", calendar: "/calendar", together: "/together" };

// design app: the four tabs stay alive once opened (React Activity), so switching only shows another one instead of
// building the screen again (user, 2026-11-21: tab changes were slow). A hidden tab keeps its state, skips updates
// until shown, and its effects (focus effects too) run again when it comes back.
const HOSTED = { home: HomeDash, calendar: CalendarTab, together: TogetherScreen, me: ProfileTab } as const;
type Hosted = keyof typeof HOSTED;
const hostedOf = (path: string): Hosted | null => (Object.keys(HOSTED) as Hosted[]).find((k) => PATHS[k] === path) ?? null;

function DesignTabs() {
  const { c } = useTheme();
  const insets = useInsets();
  const path = usePathname();
  const unread = useUnreadConversations();
  const fromPath = hostedOf(path);
  // the tab shows at once on a tap; the address follows
  const [shown, setShown] = useState<Hosted | null>(fromPath);
  useEffect(() => { setShown(fromPath); }, [fromPath]); // a new route (e.g. back from 알림) decides again
  // other screens ask for a tab here (lib/tabSwitch), so the route and this layout stay as they are
  useEffect(() => { onTabSwitch((t) => setShown(t)); return () => onTabSwitch(null); }, []);
  const [opened, setOpened] = useState<Set<Hosted>>(() => new Set(fromPath ? [fromPath] : []));
  const open = (t: Hosted) => setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
  useEffect(() => { if (shown) open(shown); }, [shown]);
  const active = shown ?? (["/explore", "/alerts", "/send"].includes(path) ? "together" : "home");
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}>
        {(Object.keys(HOSTED) as Hosted[]).map((k) => {
          if (!opened.has(k) && shown !== k) return null;
          const Screen = HOSTED[k];
          return (
            <Activity key={k} mode={shown === k ? "visible" : "hidden"}>
              <View style={{ flex: 1, display: shown === k ? "flex" : "none" }}><Screen /></View>
            </Activity>
          );
        })}
        {/* other screens under the tabs (보관함, 대화, 알림 …) still come from the router */}
        {shown ? null : <Slot />}
      </View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: c.bg }}>
        <BottomNav items={DESIGN_TABS} active={active} dots={{ together: unread > 0 }}
          onChange={(t) => {
            // between the four tabs only the shown one changes; from a screen under them (대화, 알림 …) the route goes back
            if (fromPath && t in HOSTED) setShown(t as Hosted);
            else if (path !== PATHS[t]) router.replace(PATHS[t] as never);
          }} />
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return DESIGN_TRIAL ? <DesignTabs /> : <UsualTabs />;
}

function UsualTabs() {
  const { c } = useTheme();
  const insets = useInsets();
  const path = usePathname();
  const unread = useUnreadConversations();
  const active = path === "/inbox" ? "home" : (Object.keys(PATHS) as Tab[]).find((k) => PATHS[k] === path) ?? "home";
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}><Slot /></View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: c.bg }}>
        <BottomNav active={active} dots={{ send: unread > 0 }} onChange={(t) => path !== PATHS[t] && router.replace(PATHS[t] as never)} />
      </View>
    </View>
  );
}
