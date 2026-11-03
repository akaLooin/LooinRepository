import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText, PlayButton, ScreenHeader } from "../../components";
import { pauseTimer, resetTimer, startTimer, timerTotal, useDB } from "../../data/store";
import { tokens, useTheme } from "../../theme";

const hms = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");

/** S08. Time is stored as a start time plus a total, so closing the app does not lose it. */
export function TimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const todo = useDB((d) => d.todos.find((t) => t.id === id));
  const [, tick] = useState(0);
  const running = !!todo?.timerStartedAt;
  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(h);
  }, [running]);

  if (!todo) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <ScreenHeader title="타이머" close onBack={() => router.back()} />
        <AppText variant="body" color="textMuted" center style={{ marginTop: 40 }}>할 일을 찾을 수 없어요</AppText>
      </View>
    );
  }
  const total = timerTotal(todo);
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <ScreenHeader title="타이머" close onBack={() => router.back()} />
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: tokens.layout.gutter + 20, gap: 20, marginTop: -60 }}>
        <AppText variant="sheetTitle" center numberOfLines={2}>{todo.title}</AppText>
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.surfaceStrong, paddingVertical: 10 }}>
          <AppText variant="timer" color={running || total ? "text" : "timerIdle"} center style={{ fontVariant: ["tabular-nums"] }} accessibilityLabel={`기록한 시간 ${hms(total)}`} accessibilityLiveRegion="none">
            {hms(total)}
          </AppText>
        </View>
      </View>
      <View style={{ paddingBottom: insets.bottom + 120, alignItems: "center", gap: 18 }}>
        <PlayButton running={running} label={running ? "일시정지" : total ? "이어서 하기" : "시작하기"} onPress={() => (running ? pauseTimer(todo.id) : startTimer(todo.id))} />
        {total > 0 && !running ? (
          <Pressable onPress={() => resetTimer(todo.id)} accessibilityRole="button" hitSlop={10}>
            <AppText variant="body" color="textMuted">기록 지우기</AppText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
