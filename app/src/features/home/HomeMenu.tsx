import { useInsets } from "../../theme";
import { router } from "expo-router";
import { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { AppText, Bell, BottomSheet, CalendarDays, ChevronLeft, List, Palette, PopupMenu, Sparkles, Toggle } from "../../components";
import { setPref, usePrefs } from "../../data/prefs";
import { saveEventCategory, selectEventCategories, useDB } from "../../data/store";
import { EVENT_VISIBILITY, type EventVisibility } from "../../lib/events";
import { DESIGN_TRIAL } from "../../lib/variant";
import { ScaledRoot, tokens, useTheme } from "../../theme";

/** Three uneven bars, our own drawing of a menu button. */
export function MenuButton({ onPress }: { onPress: () => void }) {
  const { c } = useTheme();
  const bar = (w: number) => <View style={{ width: w, height: 3, borderRadius: 2, backgroundColor: c.text }} />;
  return (
    <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button" accessibilityLabel="관리 메뉴" style={{ gap: 5, alignItems: "flex-start", padding: 4 }}>
      {bar(24)}{bar(24)}{bar(17)}
    </Pressable>
  );
}

/** S06m: popup anchored top-right over a dimmed screen. */
export function HomeMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const insets = useInsets();
  const go = (href: string) => () => {
    onClose();
    router.push(href as never);
  };
  // design app: a sheet of icon tiles (관리) instead of the original's corner popup of pill buttons
  if (DESIGN_TRIAL) return <ManageSheet open={open} onClose={onClose} go={go} />;
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <ScaledRoot>
      <Pressable style={{ flex: 1, backgroundColor: tokens.scrim }} onPress={onClose} accessibilityLabel="메뉴 닫기">
        <View style={{ position: "absolute", top: insets.top + 8, right: tokens.layout.gutter - 4 }}>
          <PopupMenu
            items={[
              { label: "할 일 캘린더", onPress: go("/todo-calendar") },
              { label: "카테고리 관리", onPress: go("/categories") },
              { label: "루틴 관리", onPress: go("/routines") },
              { label: "디데이 관리", onPress: go("/ddays") },
              { label: "리마인더 관리", onPress: go("/reminders") },
            ]}
          />
        </View>
      </Pressable>
      </ScaledRoot>
    </Modal>
  );
}

function ManageSheet({ open, onClose, go }: { open: boolean; onClose: () => void; go: (href: string) => () => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const [viewing, setViewing] = useState(false);
  const close = () => { setViewing(false); onClose(); };
  if (viewing) return <ViewSettings onBack={() => setViewing(false)} onClose={close} />;
  const tiles: [string, string, typeof List, string][] = [
    ["카테고리", "이름 · 색 · 공개 범위", Palette, "/categories"],
    ["루틴", "반복하는 할 일", List, "/routines"],
    ["디데이", "다가오는 날 세기", Sparkles, "/ddays"],
    ["리마인더", "매일 알림 시간", Bell, "/reminders"],
  ];
  return (
    <BottomSheet visible={open} onClose={close} title="관리">
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {tiles.map(([label, sub, Icon, href]) => (
          <Pressable key={href} onPress={go(href)} accessibilityRole="button" accessibilityLabel={`${label} 관리`}
            style={({ pressed }) => ({ width: "48%", flexGrow: 1, padding: 14, gap: 10, borderRadius: tokens.radius.lg, backgroundColor: pressed ? c.surfaceRow : c.surface })}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}><Icon size={19} color={c.text} /></View>
            <View>
              <AppText variant="body" weight={700}>{label}</AppText>
              <AppText variant="small" color="textMuted" numberOfLines={1}>{sub}</AppText>
            </View>
          </Pressable>
        ))}
        {/* 보기 설정 (user, 2026-11-23): which Google calendars the 달력 tab shows */}
        {DESIGN_TRIAL ? (
          <Pressable onPress={() => setViewing(true)} accessibilityRole="button" accessibilityLabel="보기 설정"
            style={({ pressed }) => ({ width: "48%", flexGrow: 1, padding: 14, gap: 10, borderRadius: tokens.radius.lg, backgroundColor: pressed ? c.surfaceRow : c.surface })}>
            <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: c.surfaceStrong, alignItems: "center", justifyContent: "center" }}><CalendarDays size={19} color={c.text} /></View>
            <View>
              <AppText variant="body" weight={700}>보기 설정</AppText>
              <AppText variant="small" color="textMuted" numberOfLines={1}>달력에 보일 것 · 공개 범위</AppText>
            </View>
          </Pressable>
        ) : null}
      </View>
    </BottomSheet>
  );
}

/** 보기 설정: each calendar of the Google account, on = its events show on the 달력 tab. */
function ViewSettings({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const hidden = prefs.hiddenGoogleCalendarIds;
  const set = (id: string, show: boolean) => setPref("hiddenGoogleCalendarIds", show ? hidden.filter((x) => x !== id) : [...new Set([...hidden, id])]);
  const cals = prefs.googleLinked ? (prefs.googleAllCalendars.length ? prefs.googleAllCalendars : prefs.googleCalendars) : [];
  // 공개 범위 (2026-11-26): per 일정 카테고리 (a Google calendar is one too); 나만 unless changed
  const eventCats = useDB(selectEventCategories);
  const googleCatIds = new Map(prefs.googleAllCalendars.map((k) => [prefs.googleCalendars.find((g) => g.id === k.id)?.categoryId ?? "", k.id]));
  const ordered = [...eventCats].sort((a, b) => Number(!googleCatIds.has(b.id)) - Number(!googleCatIds.has(a.id)) || a.sortOrder - b.sortOrder);
  const setVis = (id: string, title: string, color: string, visibility: EventVisibility) => saveEventCategory({ id, title, color, visibility });
  return (
    <BottomSheet visible onClose={onClose} onBack={onBack}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="뒤로" style={{ padding: 4 }}><ChevronLeft size={26} color={c.text} /></Pressable>
        <AppText variant="sheetTitle" accessibilityRole="header">보기 설정</AppText>
      </View>
      <ScrollView style={{ maxHeight: 520 }}>
        {cals.length ? <AppText variant="body" weight={700} style={{ marginBottom: 4 }}>달력에 보이기</AppText> : null}
        {cals.length ? <AppText variant="small" color="textMuted" style={{ marginBottom: 6 }}>{prefs.googleEmail ?? "구글 계정"}의 캘린더예요. 끄면 달력 탭에서만 가려지고, 일정을 추가할 때는 그대로 고를 수 있어요.</AppText> : null}
        {cals.length ? cals.map((k, i) => (
          <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: k.color }} />
            <AppText variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>{k.summary}</AppText>
            <Toggle value={!hidden.includes(k.id)} label={`${k.summary} 달력에 보이기`} onChange={(v) => set(k.id, v)} />
          </View>
        )) : prefs.googleLinked ? <AppText variant="body" color="textMuted">설정 → 구글 캘린더를 한 번 열면 캘린더 목록이 들어와요</AppText> : null}

        {/* 공개 범위: who else sees the events of each category (user, 2026-11-26; private by default) */}
        <AppText variant="body" weight={700} style={{ marginTop: cals.length ? 20 : 0, marginBottom: 4 }}>다른 사람에게 보이기</AppText>
        <AppText variant="small" color="textMuted" style={{ marginBottom: 6 }}>일정 카테고리(구글 캘린더 포함)마다 정해요. 기본은 나만이에요. 보이는 건 제목과 시간뿐이고, 메모·장소·참석자는 보이지 않아요. 카테고리 없는 일정은 늘 나만 봐요.</AppText>
        {ordered.length ? ordered.map((k, i) => {
          const v = k.visibility ?? "private";
          return (
            <View key={k.id} style={{ paddingVertical: 10, gap: 8, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: k.color }} />
                <AppText variant="bodyLg" numberOfLines={1} style={{ flex: 1 }}>{k.title}</AppText>
                {googleCatIds.has(k.id) ? <AppText variant="small" color="textMuted">구글</AppText> : null}
              </View>
              <View style={{ flexDirection: "row", gap: 6 }} accessibilityRole="radiogroup">
                {EVENT_VISIBILITY.map((o) => (
                  <Pressable key={o.key} onPress={() => setVis(k.id, k.title, k.color, o.key)} accessibilityRole="radio" accessibilityState={{ checked: v === o.key }}
                    accessibilityLabel={`${k.title} 공개 범위 ${o.label}`}
                    style={{ flex: 1, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: v === o.key ? c.selectedBg : c.surface }}>
                    <AppText variant="small" weight={600} color={v === o.key ? "onSelected" : "text"}>{o.label}</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        }) : <AppText variant="body" color="textMuted">일정 카테고리가 아직 없어요</AppText>}
      </ScrollView>
    </BottomSheet>
  );
}
