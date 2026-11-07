import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, View, type ScrollViewInstance } from "react-native";
import { AppText, BottomSheet, Clock, Sticker, STICKER_IDS, stickerLabel } from "../../components";
import { tokens, useTheme } from "../../theme";
import { EMOJI_GROUPS } from "./emoji";

const RECENT_KEY = "todomate:recent-reactions";
const isStickerId = (v: string) => v.startsWith("clover.");
let recent: string[] = [];
AsyncStorage.getItem(RECENT_KEY).then((v) => { try { if (v) recent = JSON.parse(v); } catch { /* keep empty */ } }).catch(() => {});

/**
 * Picks a reaction for a friend's to-do (original: the heart at the right end opens a panel of stickers and emoji,
 * with the groups as icons along the bottom). The stickers are our own (클로버 친구들, user's wish); the emoji are the
 * phone's. Picking the one already given takes it back.
 */
export function ReactionSheet({ visible, current, onPick, onClose }: {
  visible: boolean; current?: string; onPick: (value: string, kind: "emoji" | "sticker") => void; onClose: () => void;
}) {
  const { c } = useTheme();
  const [group, setGroup] = useState(recent.length ? "recent" : "sticker");
  const scroll = useRef<ScrollViewInstance>(null);
  useEffect(() => { if (visible) setGroup(recent.length ? "recent" : "sticker"); }, [visible]);
  const items = group === "recent" ? recent : group === "sticker" ? STICKER_IDS : EMOJI_GROUPS.find((g) => g.key === group)?.items ?? [];
  const pick = (e: string) => {
    recent = [e, ...recent.filter((x) => x !== e)].slice(0, 20);
    AsyncStorage.setItem(RECENT_KEY, JSON.stringify(recent)).catch(() => {});
    onPick(e, isStickerId(e) ? "sticker" : "emoji");
  };
  const tabs = [...(recent.length ? [{ key: "recent", label: "최근", icon: "" }] : []), { key: "sticker", label: "스티커", icon: "" }, ...EMOJI_GROUPS];
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <ScrollView ref={scroll} style={{ height: 300 }} contentContainerStyle={{ flexDirection: "row", flexWrap: "wrap", paddingBottom: 8 }}>
        {items.map((e) => {
          const st = isStickerId(e);
          const name = st ? stickerLabel(e) : e;
          return (
            <Pressable key={e} onPress={() => pick(e)} accessibilityRole="button" accessibilityLabel={e === current ? `${name} 반응 지우기` : `${name} 반응`}
              accessibilityState={{ selected: e === current }}
              style={{ width: st ? "25%" : "20%", aspectRatio: st ? 1 : 1.15, alignItems: "center", justifyContent: "center", borderRadius: tokens.radius.md, backgroundColor: e === current ? c.surfaceButton : "transparent" }}>
              {st ? <Sticker id={e} size={64} /> : <AppText style={{ fontSize: 34, lineHeight: 44 }}>{e}</AppText>}
            </Pressable>
          );
        })}
      </ScrollView>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingTop: 8 }}>
        {tabs.map((g) => (
          <Pressable key={g.key} onPress={() => { setGroup(g.key); scroll.current?.scrollTo({ y: 0, animated: false }); }} accessibilityRole="tab"
            accessibilityLabel={g.label} accessibilityState={{ selected: g.key === group }}
            style={{ width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: g.key === group ? c.surfaceButton : "transparent" }}>
            {g.key === "recent" ? <Clock size={20} color={c.textMuted} /> : g.key === "sticker" ? <Sticker id="clover.best" size={30} /> : <AppText style={{ fontSize: 22, lineHeight: 28 }}>{g.icon}</AppText>}
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
