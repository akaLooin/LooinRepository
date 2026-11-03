import { Pressable, View } from "react-native";
import { tokens, useTheme } from "../theme";
import { Bell, Compass, House, Send, User } from "./icons";

export type Tab = "home" | "explore" | "alerts" | "send" | "me";
const TABS: { key: Tab; label: string; Icon: typeof House }[] = [
  { key: "home", label: "홈", Icon: House },
  { key: "explore", label: "둘러보기", Icon: Compass },
  { key: "alerts", label: "알림", Icon: Bell },
  { key: "send", label: "보내기", Icon: Send },
  { key: "me", label: "마이", Icon: User },
];

export function BottomNav({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const { c } = useTheme();
  return (
    <View style={{ height: tokens.layout.bottomNavHeight, flexDirection: "row", alignItems: "center", backgroundColor: c.bg }} accessibilityRole="tablist">
      {TABS.map(({ key, label, Icon }) => {
        const on = key === active;
        const col = on ? c.text : c.iconInactive;
        return (
          <Pressable key={key} onPress={() => onChange(key)} style={{ flex: 1, alignItems: "center", height: "100%", justifyContent: "center" }}
            accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={label}>
            <Icon size={tokens.size.navIcon} color={col} fill={col} strokeWidth={on ? 2.2 : 2} />
          </Pressable>
        );
      })}
    </View>
  );
}
