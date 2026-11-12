import { goBack } from "../../lib/nav";
import { useInsets } from "../../theme";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, Ellipsis, Minus, PlayButton, Plus, PopupMenu, ScreenHeader } from "../../components";
import { cancelPomodoroEnd, schedulePomodoroEnd } from "../../data/notifications";
import { setPref, usePrefs } from "../../data/prefs";
import { pauseTimer, resetTimer, startTimer, timerTotal, updateTodo, useDB } from "../../data/store";
import { clampMinutes, countdownText, pomodoroLeft, POMODORO_MAX, POMODORO_MIN, POMODORO_STEP, startSession } from "../../lib/pomodoro";
import { tokens, useTheme } from "../../theme";

const hms = (s: number) => [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(" : ");

/**
 * S08. Time is stored as a start time plus a total, so closing the app does not lose it.
 * ⋯ switches between 스톱워치 and 뽀모도로 (user's feature): a countdown from a chosen length that records the focused
 * time on the to-do and rings at the end, also with the app closed.
 */
export function TimerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const todo = useDB((d) => d.todos.find((t) => t.id === id));
  const [, tick] = useState(0);
  const [menu, setMenu] = useState(false);
  const [done, setDone] = useState(false);
  const running = !!todo?.timerStartedAt;
  const pomo = prefs.timerMode === "pomodoro";
  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(h);
  }, [running]);

  const total = todo ? timerTotal(todo) : 0;
  const session = todo && prefs.pomodoro?.todoId === todo.id ? prefs.pomodoro : null;
  const left = todo ? pomodoroLeft(session, todo.id, total, prefs.pomodoroMinutes) : 0;
  // the countdown reached zero (now, or while the app was closed): record exactly the session's length and stop
  useEffect(() => {
    if (!todo || !pomo || !session || !running || left > 0) return;
    updateTodo(todo.id, { timerSeconds: session.base + session.seconds, timerStartedAt: undefined });
    setPref("pomodoro", null);
    setDone(true);
  }, [todo, pomo, session, running, left]);

  if (!todo) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
        <ScreenHeader title="타이머" close onBack={() => goBack("/")} />
        <AppText variant="body" color="textMuted" center style={{ marginTop: 40 }}>할 일을 찾을 수 없어요</AppText>
      </View>
    );
  }

  const switchMode = (mode: "stopwatch" | "pomodoro") => {
    setMenu(false);
    if (mode === prefs.timerMode) return;
    if (running) pauseTimer(todo.id);
    setPref("pomodoro", null);
    cancelPomodoroEnd();
    setDone(false);
    setPref("timerMode", mode);
  };
  const pomoStart = () => {
    const s = startSession(session, todo.id, total, prefs.pomodoroMinutes);
    setPref("pomodoro", s);
    setDone(false);
    startTimer(todo.id);
    schedulePomodoroEnd(new Date(Date.now() + pomodoroLeft(s, todo.id, total, prefs.pomodoroMinutes) * 1000), `${todo.title} 집중 시간이 끝났어요`);
  };
  const pomoPause = () => { pauseTimer(todo.id); cancelPomodoroEnd(); };
  const pomoStop = () => { if (running) pauseTimer(todo.id); setPref("pomodoro", null); cancelPomodoroEnd(); };
  const step = (d: number) => setPref("pomodoroMinutes", clampMinutes(prefs.pomodoroMinutes + d));
  const idle = !session; // the length can be changed only before a session starts

  const stepButton = (d: number) => {
    const off = d < 0 ? prefs.pomodoroMinutes <= POMODORO_MIN : prefs.pomodoroMinutes >= POMODORO_MAX;
    const Icon = d < 0 ? Minus : Plus;
    return (
      <Pressable onPress={() => step(d)} disabled={off} hitSlop={10} accessibilityRole="button" accessibilityLabel={d < 0 ? "5분 줄이기" : "5분 늘리기"}
        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c.surfaceInput, alignItems: "center", justifyContent: "center", opacity: off ? 0.35 : 1 }}>
        <Icon size={22} color={c.text} />
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: insets.top }}>
      <View style={{ zIndex: 1 }}>
        <ScreenHeader title={pomo ? "뽀모도로" : "타이머"} close onBack={() => goBack("/")} />
        <Pressable onPress={() => setMenu(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="타이머 종류"
          style={{ position: "absolute", right: tokens.layout.gutter, top: 0, bottom: 0, justifyContent: "center" }}>
          <Ellipsis size={26} color={c.text} />
        </Pressable>
      </View>
      <View style={{ flex: 1, justifyContent: "center", paddingHorizontal: tokens.layout.gutter + 20, gap: 20, marginTop: -60 }}>
        <AppText variant="sheetTitle" center numberOfLines={2}>{todo.title}</AppText>
        <View style={{ borderTopWidth: 1, borderBottomWidth: 1, borderColor: c.surfaceStrong, paddingVertical: 10 }}>
          {pomo ? (
            <AppText variant="timer" color={session ? "text" : "timerIdle"} center style={{ fontVariant: ["tabular-nums"] }} accessibilityLabel={`남은 시간 ${countdownText(left).replace(/ /g, "")}`} accessibilityLiveRegion="none">
              {countdownText(left)}
            </AppText>
          ) : (
            <AppText variant="timer" color={running || total ? "text" : "timerIdle"} center style={{ fontVariant: ["tabular-nums"] }} accessibilityLabel={`기록한 시간 ${hms(total).replace(/ /g, "")}`} accessibilityLiveRegion="none">
              {hms(total)}
            </AppText>
          )}
        </View>
        {pomo ? (
          idle ? (
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 }}>
              {stepButton(-POMODORO_STEP)}
              <AppText variant="bodyLg" weight={600} style={{ minWidth: 64 }} center accessibilityLabel={`집중 시간 ${prefs.pomodoroMinutes}분`}>{prefs.pomodoroMinutes}분</AppText>
              {stepButton(POMODORO_STEP)}
            </View>
          ) : null
        ) : null}
        {pomo ? (
          <AppText variant="helper" color="textMuted" center>
            {done ? "집중 시간이 끝났어요. 잠깐 쉬어요" : `이 할 일에 기록한 시간 ${hms(total)}`}
          </AppText>
        ) : null}
      </View>
      <View style={{ paddingBottom: insets.bottom + 170, alignItems: "center", gap: 18 }}>
        {pomo ? (
          <>
            <PlayButton running={running} label={running ? "일시정지" : session ? "이어서 하기" : "시작하기"} onPress={() => (running ? pomoPause() : pomoStart())} />
            {session ? (
              <Pressable onPress={pomoStop} accessibilityRole="button" hitSlop={10}>
                <AppText variant="body" color="textMuted">그만하기</AppText>
              </Pressable>
            ) : null}
          </>
        ) : (
          <>
            <PlayButton running={running} label={running ? "일시정지" : total ? "이어서 하기" : "시작하기"} onPress={() => (running ? pauseTimer(todo.id) : startTimer(todo.id))} />
            {total > 0 && !running ? (
              <Pressable onPress={() => resetTimer(todo.id)} accessibilityRole="button" hitSlop={10}>
                <AppText variant="body" color="textMuted">기록 지우기</AppText>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      {menu ? (
        <Pressable onPress={() => setMenu(false)} accessibilityLabel="메뉴 닫기"
          style={{ position: "absolute", inset: 0, paddingTop: insets.top + tokens.layout.headerHeight, paddingRight: tokens.layout.gutter, alignItems: "flex-end" }}>
          <PopupMenu items={[
            { label: `스톱워치${pomo ? "" : " ✓"}`, onPress: () => switchMode("stopwatch") },
            { label: `뽀모도로${pomo ? " ✓" : ""}`, onPress: () => switchMode("pomodoro") },
          ]} />
        </Pressable>
      ) : null}
    </View>
  );
}
