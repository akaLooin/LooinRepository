import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, Crown, ScreenHeader, StoredImage } from "../../components";
import { crewDetail, type CrewDetail } from "../../data/crews";
import type { Person } from "../../data/social";
import { today } from "../../lib/dates";
import { goBack } from "../../lib/nav";
import { tokens, useInsets, useTheme } from "../../theme";
import { PersonSheet } from "../social/PersonSheet";
import { RipplePressable } from "../../components";

/** 멤버 보기 (original: title 크루, "참여 n", then the members; the leader has the crown). */
export function CrewMembersScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [crew, setCrew] = useState<CrewDetail | null>(null);
  const [open, setOpen] = useState<Person | null>(null);
  useEffect(() => { if (id) crewDetail(id, today()).then(setCrew).catch(() => {}); }, [id]);
  const G = tokens.layout.gutter;
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="크루" onBack={() => goBack(`/crew/${id}`)} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted" style={{ paddingHorizontal: G, marginBottom: 6 }}>{`참여 ${crew?.memberList.length ?? 0}`}</AppText>
        {crew?.memberList.map((m) => (
          <RipplePressable key={m.person.id} onPress={() => setOpen(m.person)} accessibilityRole="button" accessibilityLabel={`${m.person.nickname}${m.isOwner ? ", 크루장" : ""}`}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: G, paddingVertical: 10 }}>
            <View>
              {m.person.avatarUri ? <StoredImage uri={m.person.avatarUri} label="" style={{ width: 40, height: 40, borderRadius: 20 }} /> : <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: c.surfaceStrong }} />}
              {m.isOwner ? (
                <View style={{ position: "absolute", right: -2, bottom: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: c.crown, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: c.bg }}>
                  <Crown size={8} color={c.onIcon} fill={c.onIcon} />
                </View>
              ) : null}
            </View>
            <AppText variant="bodyLg" style={{ flex: 1 }} numberOfLines={1}>{m.person.nickname}</AppText>
          </RipplePressable>
        ))}
      </ScrollView>
      <PersonSheet person={open} onClose={() => setOpen(null)} />
    </View>
  );
}
