import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, AppState, Pressable, ScrollView, View } from "react-native";
import { AppText, Check, ConfirmDialog, ScreenHeader, Toggle, useFrame, useToast } from "../../components";
import { goBack } from "../../lib/nav";
import {
  connectGoogle, disconnectGoogle, googleCalendars, googleStatus, pickCalendar, syncGoogle, GoogleError,
  type GoogleCalendar, type GoogleStatus,
} from "../../lib/googleCalendar";
import { onColor, tokens, useInsets, useTheme } from "../../theme";

const when = (iso?: string | null) => {
  if (!iso) return "아직 안 맞췄어요";
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}에 맞췄어요`;
};

/**
 * 구글 캘린더 (메인 앱, user 2026-11-23): connect a Google account, pick which of its calendars to sync (each becomes
 * a 일정 카테고리 of its name and colour), and where new events go. Changes go both ways.
 */
export function GoogleCalendarScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const frame = useFrame();
  const [toast, notice] = useToast();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [cals, setCals] = useState<GoogleCalendar[]>([]);
  const [busy, setBusy] = useState<null | "connect" | "sync" | "off">(null);
  const [asking, setAsking] = useState(false);
  const load = useCallback(async () => {
    const s = await googleStatus();
    setStatus(s);
    setCals(s.connected ? await googleCalendars() : []);
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  // back from the browser after agreeing on Google's page
  useEffect(() => { const sub = AppState.addEventListener("change", (st) => { if (st === "active") load(); }); return () => sub.remove(); }, [load]);
  const run = async (what: "connect" | "sync" | "off", f: () => Promise<unknown>, done?: string) => {
    setBusy(what);
    try { await f(); if (done) notice(done); } catch (e) { notice(e instanceof GoogleError ? e.message : "잠시 뒤에 다시 해 주세요"); } finally { setBusy(null); load(); }
  };
  const card = { borderRadius: tokens.radius.lg, backgroundColor: c.surface, overflow: "hidden" as const, ...frame };
  const button = (label: string, onPress: () => void, kind: "main" | "plain" | "danger", key: typeof busy) => (
    <Pressable onPress={onPress} disabled={!!busy} accessibilityRole="button" accessibilityLabel={label}
      style={{ height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 12,
        backgroundColor: kind === "main" ? c.accent : "transparent", borderWidth: kind === "main" ? 0 : 1, borderColor: kind === "danger" ? c.danger : c.divider, opacity: busy && busy !== key ? 0.5 : 1 }}>
      {busy === key ? <ActivityIndicator color={kind === "main" ? onColor(c.accent) : c.text} /> : null}
      <AppText variant="body" weight={700} raw={kind === "main" ? onColor(c.accent) : kind === "danger" ? c.danger : c.text}>{label}</AppText>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="구글 캘린더" onBack={() => goBack("/settings")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: tokens.layout.gutter, paddingBottom: 40 }}>
        <AppText variant="helper" color="textMuted" style={{ marginVertical: 12 }}>
          고른 구글 캘린더의 일정이 립마크에 들어오고, 그 일정을 립마크에서 바꾸면 구글에도 바뀌어요. 캘린더마다 같은 이름의 일정 카테고리가 생겨요.
        </AppText>
        {!status ? <ActivityIndicator color={c.text} style={{ marginTop: 30 }} /> : status.missing ? (
          <View style={{ ...card, padding: 16 }}>
            <AppText variant="body" weight={700}>아직 준비 중이에요</AppText>
            <AppText variant="helper" color="textMuted" style={{ marginTop: 6 }}>서버에 구글 캘린더용 SQL과 설정이 먼저 들어가야 해요 (PC에서 할 일).</AppText>
          </View>
        ) : !status.connected ? (
          <>
            <View style={{ ...card, padding: 16 }}>
              <AppText variant="body" weight={700}>연결된 구글 계정이 없어요</AppText>
              <AppText variant="helper" color="textMuted" style={{ marginTop: 6 }}>연결하기를 누르면 구글 화면이 열려요. 동의하고 립마크로 돌아오면 끝이에요.</AppText>
            </View>
            {button("구글 계정 연결하기", () => run("connect", connectGoogle), "main", "connect")}
          </>
        ) : (
          <>
            <View style={{ ...card, padding: 16, gap: 4 }}>
              <AppText variant="body" weight={700}>{status.email ?? "구글 계정"}</AppText>
              <AppText variant="helper" color={status.last_error ? "danger" : "textMuted"}>{status.last_error ?? when(status.last_sync_at)}</AppText>
            </View>

            <AppText variant="small" weight={700} color="textMuted" style={{ marginTop: 22, marginBottom: 8, marginLeft: 4 }} accessibilityRole="header">연동할 캘린더</AppText>
            <View style={card}>
              {cals.length ? cals.map((k, i) => (
                <View key={k.calendar_id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 54, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
                  <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: k.color }} />
                  <View style={{ flex: 1 }}>
                    <AppText variant="bodyLg" numberOfLines={1}>{k.summary}</AppText>
                    {!k.can_write ? <AppText variant="small" color="textMuted">보기만 할 수 있는 캘린더</AppText> : null}
                  </View>
                  <Toggle value={k.selected} label={`${k.summary} 연동`} onChange={(v) => run("sync", async () => { await pickCalendar(k.calendar_id, v); setCals((l) => l.map((x) => (x.calendar_id === k.calendar_id ? { ...x, selected: v } : x))); await syncGoogle(); })} />
                </View>
              )) : <AppText variant="body" color="textMuted" style={{ padding: 16 }}>캘린더를 불러오는 중이에요. 지금 맞추기를 눌러 보세요.</AppText>}
            </View>
            <AppText variant="small" color="textMuted" style={{ marginTop: 8, marginLeft: 4 }}>끄면 그 캘린더에서 온 일정은 립마크에서만 사라져요 (구글엔 남아요).</AppText>

            <AppText variant="small" color="textMuted" style={{ marginTop: 14, marginLeft: 4 }}>
              립마크에서 만든 일정은 일정을 추가하거나 고칠 때 '구글 캘린더' 줄에서 올릴 캘린더를 골라야 올라가요. 고르지 않으면 립마크에만 있어요.
              강조한 일정은 구글에서 제목 맨 앞에 ⭐가 붙고, 구글에서 제목 맨 앞에 ⭐를 붙이면 립마크에서 강조돼요.
            </AppText>

            {button("지금 맞추기", () => run("sync", syncGoogle, "구글 캘린더와 맞췄어요"), "main", "sync")}
            {button("연결 끊기", () => setAsking(true), "danger", "off")}
          </>
        )}
      </ScrollView>
      {toast}
      <ConfirmDialog visible={asking} message="구글 캘린더 연결을 끊을까요? 구글에서 온 일정은 립마크에서 사라지고, 립마크에서 만든 일정은 남아요." cancel="취소" ok="끊기" danger
        onCancel={() => setAsking(false)} onOk={() => { setAsking(false); run("off", disconnectGoogle, "연결을 끊었어요"); }} />
    </View>
  );
}
