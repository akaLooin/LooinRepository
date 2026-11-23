import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useState } from "react";
import { Platform, Pressable, ScrollView, View } from "react-native";
import { AddPill, AppText, Bell, BottomSheet, Button, PillRow, Plus, ScreenHeader, TimeGrid, Trash2, useToast, X } from "../../components";
import { DESIGN_TRIAL } from "../../lib/variant";
import { ensurePermission } from "../../data/notifications";
import { NotificationCheck } from "./NotificationCheck";
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
      <ScreenHeader title={DESIGN_TRIAL ? "하루 알림" : "리마인더 관리"} onBack={() => goBack("/")} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 12, paddingBottom: 40 }}>
        {DESIGN_TRIAL ? (
          // 메인 앱 (user, 2026-11-23: not the original's heading + 추가하기 + rows): what it does and one button, then
          // the times as large chips
          <>
            <View style={{ padding: 16, gap: 10, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Bell size={20} color={c.text} />
                <AppText variant="bodyLg" weight={800}>하루 알림</AppText>
              </View>
              <AppText variant="small" color="textMuted">고른 시간마다 매일, 그날 아직 남은 할 일을 알려 줘요.</AppText>
              <Pressable onPress={() => setOpen(true)} accessibilityRole="button" accessibilityLabel="시간 추가"
                style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, height: 38, paddingHorizontal: 14, borderRadius: 19, backgroundColor: c.text }}>
                <Plus size={16} color={c.bg} strokeWidth={2.6} />
                <AppText variant="helper" weight={700} raw={c.bg}>시간 추가</AppText>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {reminders.map((r) => (
                <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 16, paddingRight: 8, height: 52, borderRadius: 26, backgroundColor: c.surface }}>
                  <AppText variant="bodyLg" weight={800} style={{ fontSize: 20 }}>{formatTime(asDate(r.timeOfDay), use24h)}</AppText>
                  <Pressable onPress={() => deleteReminder(r.id)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${r.timeOfDay} 알림 빼기`}
                    style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}>
                    <X size={15} color={c.text} />
                  </Pressable>
                </View>
              ))}
            </View>
            {reminders.length === 0 ? <AppText variant="body" color="textMuted">아직 시간이 없어요. 아침이나 자기 전 시간을 넣어 보세요.</AppText> : null}
          </>
        ) : (
        <>
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
        </>
        )}
        <NotificationCheck notice={notice} />
      </ScrollView>
      <BottomSheet visible={open} onClose={() => setOpen(false)} title={DESIGN_TRIAL ? "알림 받을 시간" : "리마인더 시간"}>
        <TimeGrid hour={time.h} minute={time.m} onChange={(h, m) => setTime({ h, m })} />
        <View style={{ marginTop: 20 }}><Button kind="sheetBlock" label="완료" onPress={add} /></View>
      </BottomSheet>
      {toast}
    </View>
  );
}
