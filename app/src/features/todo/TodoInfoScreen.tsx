import { router, useLocalSearchParams } from "expo-router";
import { Image, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, Clover, ScreenHeader, VisibilityIcon } from "../../components";
import { timerTotal, useDB } from "../../data/store";
import { parseDay, weekday } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";
import { VISIBILITY_LABEL } from "../categories/CategoryEditScreen";

const WD = "일월화수목금토";

function doneLabel(iso: string) {
  const d = new Date(iso);
  return `완료 ${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
const dur = (s: number) => (s >= 3600 ? `${Math.floor(s / 3600)}시간 ${Math.floor((s % 3600) / 60)}분` : s >= 60 ? `${Math.floor(s / 60)}분 ${s % 60}초` : `${s}초`);

/** S05b: one to-do in full, as others would see it. */
export function TodoInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const todo = useDB((d) => d.todos.find((t) => t.id === id));
  const cat = useDB((d) => d.categories.find((x) => x.id === todo?.categoryId));
  const profile = useDB((d) => d.profile);
  if (!todo || !cat) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <ScreenHeader title="할 일" close onBack={() => router.back()} />
        <AppText variant="body" color="textMuted" center style={{ marginTop: 40 }}>할 일을 찾을 수 없어요</AppText>
      </View>
    );
  }
  const { y, m, d } = parseDay(todo.date);
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
              <AppText variant="body">{`${y}년 ${m}월 ${d}일 ${WD[weekday(todo.date)]}요일`}</AppText>
              <VisibilityIcon value={cat.visibility} color={c.textMuted} size={16} />
              <AppText variant="body" color="textMuted">{VISIBILITY_LABEL[cat.visibility]}</AppText>
            </View>
          </View>
        </View>
        {todo.photoUri ? <Image source={{ uri: todo.photoUri }} style={{ width: "100%", aspectRatio: 1.4, borderRadius: tokens.radius.lg, backgroundColor: c.surface }} accessibilityLabel="인증 사진" /> : null}
        <View style={{ gap: 6 }}>
          <AppText variant="bodyLg">{todo.title}</AppText>
          {todo.memo ? <AppText variant="body" color="textSecondary">{todo.memo}</AppText> : null}
          {todo.isDone && todo.doneAt ? <AppText variant="body" color="textMuted">{doneLabel(todo.doneAt)}</AppText> : null}
          {seconds > 0 ? <AppText variant="body" color="textMuted">{`기록한 시간 ${dur(seconds)}`}</AppText> : null}
        </View>
      </ScrollView>
    </View>
  );
}
