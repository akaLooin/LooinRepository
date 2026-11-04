import { useInsets } from "../../theme";
import { router, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, View } from "react-native";
import { AppText, Clover, ScreenHeader, VisibilityIcon } from "../../components";
import { formatTime, usePrefs } from "../../data/prefs";
import { timerTotal, useDB } from "../../data/store";
import { parseDay, weekday } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";
import { VISIBILITY_LABEL } from "../categories/CategoryEditScreen";

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
  if (!todo || !cat) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <ScreenHeader title="할 일" close onBack={() => router.back()} />
        <AppText variant="body" color="textMuted" center style={{ marginTop: 40 }}>할 일을 찾을 수 없어요</AppText>
      </View>
    );
  }
  const dateLabel = todo.date ? (() => { const { y, m, d } = parseDay(todo.date); return `${y}년 ${m}월 ${d}일 ${WD[weekday(todo.date)]}요일`; })() : "보관함";
  const seconds = timerTotal(todo);
  return (
    <View style={{ flex: 1, backgroundColor: c.surfaceRaised, paddingTop: insets.top }}>
      <ScreenHeader title="할 일" close onBack={() => router.back()} />
      <ScrollView contentContainerStyle={{ padding: tokens.layout.gutter, gap: 18, paddingBottom: 40 }}>
        <View style={{ alignItems: "center", marginVertical: 8 }}>
          <Clover size={48} state={todo.isDone ? { kind: "todoDone", color: cat.color } : { kind: "todoOpen" }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: c.surfaceStrong }} />
          <View style={{ gap: 2 }}>
            <AppText variant="bodyLg" weight={700}>{profile.nickname || "나"}</AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <AppText variant="body">{dateLabel}</AppText>
              <VisibilityIcon value={cat.visibility} color={c.textMuted} size={16} />
              <AppText variant="body" color="textMuted">{VISIBILITY_LABEL[cat.visibility]}</AppText>
            </View>
          </View>
        </View>
        {todo.photoUri ? <Image source={{ uri: todo.photoUri }} style={{ width: "100%", aspectRatio: 1.4, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} accessibilityLabel="인증 사진" /> : null}
        <View style={{ gap: 6 }}>
          <AppText variant="bodyLg">{todo.title}</AppText>
          {todo.memo ? <AppText variant="body" color="textSecondary">{todo.memo}</AppText> : null}
          {todo.isDone && todo.doneAt ? <AppText variant="body" color="textMuted">{doneLabel(todo.doneAt, use24h)}</AppText> : null}
          {seconds > 0 ? <AppText variant="body" color="textMuted">{`기록한 시간 ${dur(seconds)}`}</AppText> : null}
        </View>
      </ScrollView>
    </View>
  );
}
