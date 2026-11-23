import { useInsets } from "../../theme";
import { router, Slot, usePathname, useSegments } from "expo-router";
import { Activity, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { CalendarTab } from "../../features/today/CalendarTab";
import { HomeDash } from "../../features/today/HomeDash";
import { ProfileTab } from "../../features/today/ProfileTab";
import { TogetherScreen } from "../../features/today/TogetherScreen";
import { onTabSwitch } from "../../lib/tabSwitch";
import { setResumeTab, takeResumeTab } from "../../lib/resume";
import { useFeature, useT } from "../../lib/appConfig";
import type { TextKey } from "../../lib/remoteCatalog";
import { BottomNav, DESIGN_TABS, SkinDecor, type Tab } from "../../components";
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
  // Only addresses inside the tabs decide the tab. Opening a screen above them (the timeline, a diary …) changes the
  // address too; following it reset the tab to 홈 on the way back (user, 2026-11-23), so the last in-tab answer stays.
  const segments = useSegments();
  const inTabs = segments[0] === "(tabs)";
  const lastInTabs = useRef<Hosted | null>(hostedOf(path));
  if (inTabs) lastInTabs.current = hostedOf(path);
  const fromPath = lastInTabs.current;
  // the tab shows at once on a tap; the address follows
  const [shown, setShown] = useState<Hosted | null>(fromPath);
  useEffect(() => { setShown(fromPath); }, [fromPath]); // a new route (e.g. back from 알림) decides again
  // other screens ask for a tab here (lib/tabSwitch), so the route and this layout stay as they are
  useEffect(() => { onTabSwitch((t) => setShown(t)); return () => onTabSwitch(null); }, []);
  const [opened, setOpened] = useState<Set<Hosted>>(() => new Set(fromPath ? [fromPath] : []));
  const open = (t: Hosted) => setOpened((o) => (o.has(t) ? o : new Set(o).add(t)));
  useEffect(() => { if (shown) open(shown); setResumeTab(shown); }, [shown]);
  // restarted a moment after being left (an update put in, or Android closed it): back to the tab that was open.
  // The tabs wait for this answer (a few milliseconds) so 홈 does not flash first.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let done = false;
    const finish = () => { if (!done) { done = true; setReady(true); } };
    takeResumeTab().then((t) => { if (!done && t && path === "/" && t in HOSTED) setShown(t as Hosted); finish(); });
    const timer = setTimeout(finish, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const active = shown ?? (["/explore", "/alerts", "/send"].includes(path) ? "together" : "home");
  // names and the 커뮤니티 tab come from the admin app (texts, features)
  const t = useT();
  const showTogether = useFeature("tab.together");
  const tabItems = DESIGN_TABS.filter((x) => showTogether || x.key !== "together").map((x) => ({ ...x, label: t(`tab.${x.key}` as TextKey) }));
  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <View style={{ flex: 1 }}>
        {ready ? (Object.keys(HOSTED) as Hosted[]).map((k) => {
          if (!opened.has(k) && shown !== k) return null;
          const Screen = HOSTED[k];
          return (
            <Activity key={k} mode={shown === k ? "visible" : "hidden"}>
              <View style={{ flex: 1, display: shown === k ? "flex" : "none" }}><Screen /></View>
            </Activity>
          );
        }) : null}
        {/* other screens under the tabs (보관함, 대화, 알림 …) still come from the router */}
        {shown ? null : <Slot />}
        {/* a skin's decoration (황혼의 재즈: twinkling stars) over the tab screens */}
        <SkinDecor />
      </View>
      <View style={{ paddingBottom: insets.bottom, backgroundColor: c.bg }}>
        <BottomNav items={tabItems} active={active} dots={{ together: unread > 0 }}
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
