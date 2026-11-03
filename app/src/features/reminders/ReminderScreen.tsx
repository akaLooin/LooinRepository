import { useInsets } from "../../theme";
import { router } from "expo-router";
import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { AddPill, AppText, BottomSheet, Button, PillRow, ScreenHeader, TimeGrid, Trash2, useToast } from "../../components";
import { ensurePermission } from "../../data/notifications";
import { formatTime, usePrefs } from "../../data/prefs";
import { addReminder, deleteReminder, selectReminders, useDB } from "../../data/store";
import { tokens, useTheme } from "../../theme";

const asDate = (hhmm: string) => { const [h, m] = hhmm.split(":").map(Number); const d = new Date(); d.setHours(h, m, 0, 0); return d; };

/** S22: times of day when the phone reminds you of today's to-dos. */
export function ReminderScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const reminders = useDB(selectReminders);
  const { use24h } = usePrefs();
  const [open, setOpen] = useState(false);
  const [time, setTime] = useState({ h: 9, m: 0 });
  const [toast, notice] = useToast();

  const add = async () => {
    setOpen(false);
    const hhmm = `${String(time.h).padStart(2, "0")}:${String(time.m).padStart(2, "0")}`;
    if (!addReminder(hhmm)) return notice("이미 있는 시간이에요");
    if (Platform.OS === "web") return notice("알림은 폰 앱에서만 울려요");
    if (!(await ensurePermission())) notice("알림 권한이 꺼져 있어요. 폰 설정에서 켜 주세요");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="리마인더 관리" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted">정한 시간마다 매일, 그날 남은 할 일을 알려 줘요.</AppText>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <AppText variant="bodyLg" weight={700}>리마인더</AppText>
          <AddPill onPress={() => setOpen(true)} />
        </View>
        {reminders.length === 0 ? <AppText variant="body" color="textMuted" style={{ paddingVertical: 20 }}>아직 리마인더가 없어요. 아침이나 저녁 시간을 추가해 보세요.</AppText> : null}
        {reminders.map((r) => (
          <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ flex: 1 }}><PillRow title={`매일 ${formatTime(asDate(r.timeOfDay), use24h)}`} right="" /></View>
            <Pressable onPress={() => deleteReminder(r.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${r.timeOfDay} 리마인더 삭제`}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}>
              <Trash2 size={20} color={c.textMuted} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title="리마인더 시간">
        <TimeGrid hour={time.h} minute={time.m} onChange={(h, m) => setTime({ h, m })} />
        <View style={{ marginTop: 20 }}><Button kind="sheetBlock" label="완료" onPress={add} /></View>
      </BottomSheet>
      {toast}
    </View>
  );
}
