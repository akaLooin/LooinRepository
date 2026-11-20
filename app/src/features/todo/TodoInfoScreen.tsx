import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Animated, Pressable, ScrollView, View } from "react-native";
import { AppText, Clover, ScreenHeader, StoredImage, useSheetDrag, VisibilityIcon, ZoomPhoto } from "../../components";
import { formatTime, usePrefs } from "../../data/prefs";
import { timerTotal, useDB } from "../../data/store";
import { parseDay, weekday } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";
import { VISIBILITY_LABEL } from "../categories/CategoryEditScreen";
import { DESIGN_TRIAL } from "../../lib/variant";

const WD = "일월화수목금토";

function doneLabel(iso: string, use24h: boolean) {
  const d = new Date(iso);
  return `완료 ${d.getMonth() + 1}월 ${d.getDate()}일 ${formatTime(d, use24h)}`;
}
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);

/** S05b: one to-do in full, as others would see it. */
export function TodoInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const todo = useDB((d) => d.todos.find((t) => t.id === id));
  const cat = useDB((d) => d.categories.find((x) => x.id === todo?.categoryId));
  const profile = useDB((d) => d.profile);
  const { use24h } = usePrefs();
  const [open, setOpen] = useState(true);
  const close = () => setOpen(false);
  const { translateY, scrimOpacity, handlers } = useSheetDrag(open, () => goBack("/"), () => goBack("/"));
  if (!todo || !cat) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <ScreenHeader title="할 일" close onBack={() => goBack("/")} />
        <AppText variant="body" color="textMuted" center style={{ marginTop: 40 }}>할 일을 찾을 수 없어요</AppText>
      </View>
    );
  }
  const dateLabel = todo.date ? (() => { const { y, m, d } = parseDay(todo.date); return `${y}년 ${m}월 ${d}일 ${WD[weekday(todo.date)]}요일`; })() : "보관함";
  const seconds = timerTotal(todo);
  return (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: tokens.scrim, opacity: scrimOpacity }}>
        <Pressable style={{ flex: 1 }} onPress={close} accessibilityLabel="닫기" />
      </Animated.View>
      <Animated.View style={{ height: "92%", backgroundColor: c.surfaceRaised, transform: [{ translateY }], ...(DESIGN_TRIAL
        ? { borderRadius: 28, marginHorizontal: 8, marginBottom: 8 + insets.bottom, paddingTop: 6 }
        : { borderTopLeftRadius: tokens.radius.sheet, borderTopRightRadius: tokens.radius.sheet, paddingTop: 12 }) }}>
      <View {...handlers} accessibilityHint="아래로 끌어 닫기">
        {DESIGN_TRIAL ? null : <View style={{ alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: c.grabber }} />}
        <ScreenHeader title="할 일" close onBack={close} />
      </View>
      {DESIGN_TRIAL ? (
        // design app: the to-do on top with its state, then one card of facts (not the original's big clover and author line)
        <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 14, paddingBottom: 40 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Clover size={30} state={todo.isDone ? { kind: "todoDone", color: cat.color } : { kind: "todoOpen" }} />
            <AppText variant="bodyLg" weight={700} style={{ flex: 1, fontSize: 20, lineHeight: 28 }}>{todo.title}</AppText>
          </View>
          {todo.photoUri ? <ZoomPhoto uri={todo.photoUri!} label="인증 사진" others={false}><StoredImage uri={todo.photoUri} label="인증 사진" style={{ width: "100%", aspectRatio: 1.4, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} /></ZoomPhoto> : null}
          {todo.memo ? (
            <View style={{ padding: 14, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
              <AppText variant="small" weight={700} color="textMuted">메모</AppText>
              <AppText variant="body" style={{ marginTop: 4 }}>{todo.memo}</AppText>
            </View>
          ) : null}
          <View style={{ borderRadius: tokens.radius.lg, backgroundColor: c.surface, overflow: "hidden" }}>
            {([
              ["날짜", dateLabel],
              ["카테고리", cat.title],
              ["공개 범위", VISIBILITY_LABEL[cat.visibility]],
              ["상태", todo.isDone && todo.doneAt ? doneLabel(todo.doneAt, use24h) : "아직 안 끝냄"],
              ...(seconds > 0 ? [["기록한 시간", dur(seconds)]] : []),
              ["쓴 사람", profile.nickname || "나"],
            ] as [string, string][]).map(([k, v], i) => (
              <View key={k} style={{ flexDirection: "row", alignItems: "center", minHeight: 48, paddingHorizontal: 16, gap: 10, borderTopWidth: i ? 1 : 0, borderTopColor: c.sectionLine }}>
                <AppText variant="body" color="textMuted" style={{ width: 84 }}>{k}</AppText>
                {k === "카테고리" ? <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: cat.color }} /> : null}
                {k === "공개 범위" ? <VisibilityIcon value={cat.visibility} color={c.textMuted} size={15} /> : null}
                <AppText variant="body" weight={600} style={{ flex: 1 }}>{v}</AppText>
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 18, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <Clover size={48} state={todo.isDone ? { kind: "todoDone", color: cat.color } : { kind: "todoOpen" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <StoredImage uri={profile.avatarUri} label="프로필 사진" style={{ width: 46, height: 46, borderRadius: 23 }} />
          <View style={{ gap: 2 }}>
            <AppText variant="bodyLg" weight={700}>{profile.nickname || "나"}</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText variant="body">{dateLabel}</AppText>
              <VisibilityIcon value={cat.visibility} color={c.textMuted} size={16} />
              <AppText variant="body" color="textMuted">{VISIBILITY_LABEL[cat.visibility]}</AppText>
            </View>
          </View>
        </View>
        {todo.photoUri ? <ZoomPhoto uri={todo.photoUri!} label="인증 사진" others={false}><StoredImage uri={todo.photoUri} label="인증 사진" style={{ width: "100%", aspectRatio: 1.4, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} /></ZoomPhoto> : null}
        <View style={{ gap: 6 }}>
          <AppText variant="bodyLg">{todo.title}</AppText>
          {todo.memo ? <AppText variant="body" color="textSecondary">{todo.memo}</AppText> : null}
          {todo.isDone && todo.doneAt ? <AppText variant="body" color="textMuted">{doneLabel(todo.doneAt, use24h)}</AppText> : null}
          {seconds > 0 ? <AppText variant="body" color="textMuted">{`기록한 시간 ${dur(seconds)}`}</AppText> : null}
        </View>
      </ScrollView>
      )}
      </Animated.View>
    </View>
  );
}
