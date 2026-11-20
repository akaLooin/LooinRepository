import { Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { AppText } from "./AppText";
import { Bell, CalendarDays, Compass, House, Send, User, Users } from "./icons";

export type Tab = "home" | "explore" | "alerts" | "send" | "me" | "calendar" | "together";
type Item = { key: Tab; label: string; Icon: typeof House; filled?: boolean };
/** The design app's tabs (2026-11-21): 홈 · 달력 · 함께 · 나, with their names under the icons. */
export const DESIGN_TABS: Item[] = [
  { key: "home", label: "홈", Icon: House },
  { key: "calendar", label: "달력", Icon: CalendarDays },
  { key: "together", label: "함께", Icon: Users },
  { key: "me", label: "나", Icon: User },
];
const TABS: Item[] = [
  { key: "home", label: "홈", Icon: House, filled: true },
  { key: "explore", label: "둘러보기", Icon: Compass },
  { key: "alerts", label: "알림", Icon: Bell, filled: true },
  { key: "send", label: "보내기", Icon: Send, filled: true },
  { key: "me", label: "마이", Icon: User, filled: true },
];

/** `dots`: a small dot on a tab (보내기: unread messages). */
export function BottomNav({ active, onChange, dots, items = TABS }: { active: Tab; onChange: (t: Tab) => void; dots?: Partial<Record<Tab, boolean>>; items?: Item[] }) {
  const { c } = useTheme();
  const labelled = items !== TABS;
  return (
    <View style={{ height: tokens.layout.bottomNavHeight, flexDirection: "row", alignItems: "center", backgroundColor: c.bg }} accessibilityRole="tablist">
      {items.map(({ key, label, Icon, filled }) => {
        const on = key === active;
        const col = on ? c.text : c.iconInactive;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={{ flex: 1, alignItems: "center", height: "100%", justifyContent: "center" }}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={dots?.[key] ? `${label}, 새 메시지` : label}>
            <Icon size={labelled ? tokens.size.navIcon - 2 : tokens.size.navIcon} color={col} fill={filled ? col : "none"} strokeWidth={on ? 2.2 : 2} />
            {labelled ? <AppText variant="small" weight={on ? 700 : 500} raw={col} style={{ marginTop: 3 }}>{label}</AppText> : null}
            {dots?.[key] ? <View style={{ position: "absolute", top: "26%", left: "56%", width: 7, height: 7, borderRadius: 4, backgroundColor: c.sunday }} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
