import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, BottomSheet, Button, Ellipsis, MoodMark, TitleInput, TodoRow } from "../../components";
import { formatTime, usePrefs } from "../../data/prefs";
import {
  addRoutineTodo, copyTodos, deleteTodos, manualRoutinesOn, materialize, moveTodos, selectCategories, todosForDay, toggleImportant, toggleTodo, updateTodo, useDB,
} from "../../data/store";
import { addDays, parseDay, type Day } from "../../lib/dates";
import { clock, dayBlocks, eventsOn, eventTimeLabel, fromMinutes, inBand, type CalEvent } from "../../lib/events";
import { onColor, tokens, useTheme, visibleOn } from "../../theme";
import { ListMenuSheet, type ListAction } from "../home/HomeSheets";
import { PendingRoutineRow } from "../home/PendingRoutineRow";
import { DatePickSheet, TodoSheets } from "../home/TodoSheets";
import { GlowFrame } from "../../components";

const TIME_W = 50;
type Todo = ReturnType<typeof todosForDay>[number];
type Item = { kind: "event"; at: number; e: CalEvent; from: number; to: number } | { kind: "todo"; at: number; t: Todo };

/**
 * One day as an agenda (design app, 2026-11-21, user's choice "오늘 중심"): 종일 events, then 오전 · 오후 · 저녁 with
 * timed events and to-dos with a time mixed in time order, then 언제든 (to-dos without a time), each with its category as
 * a small tag on the right instead of category headings. The diary of the day closes the list.
 */
export function AgendaList({ day, notice }: { day: Day; notice: (m: string) => void }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const categories = useDB(selectCategories);
  const diary = useDB((d) => d.diaries.find((x) => x.date === day));
  const [sheetTodo, setSheetTodo] = useState<string | null>(null);
  const [sheetStart, setSheetStart] = useState<"menu" | "memo" | "alarm">("menu");
  const [renaming, setRenaming] = useState<{ id: string; title: string } | null>(null);
  const [listMenu, setListMenu] = useState<null | "menu" | "move" | "copy" | "delete">(null);
  const catOf = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);
  const catOrder = useMemo(() => new Map(categories.map((x, i) => [x.id, i])), [categories]);

  const todos = todosForDay(db, day);
  const timeOf = (t: Todo) => {
    if (!t.remindAt) return null;
    const d = new Date(t.remindAt);
    return d.getHours() * 60 + d.getMinutes();
  };
  const band = eventsOn(db.events, day).filter(inBand);
  const timed: Item[] = [
    ...dayBlocks(db.events, day).map((b) => ({ kind: "event" as const, at: b.top, e: b.e, from: b.top, to: b.bottom })),
    ...todos.filter((t) => timeOf(t) !== null).map((t) => ({ kind: "todo" as const, at: timeOf(t)!, t })),
  ].sort((a, b) => a.at - b.at);
  const anytime = todos.filter((t) => timeOf(t) === null)
    .sort((a, b) => (prefs.todoSort === "done_last" ? Number(a.isDone) - Number(b.isDone) : 0)
      || (catOrder.get(a.categoryId) ?? 0) - (catOrder.get(b.categoryId) ?? 0) || a.sortOrder - b.sortOrder);
  const pending = categories.filter((x) => !x.endedAt).flatMap((cat) => manualRoutinesOn(db, day, cat.id).map((r) => ({ r, cat })));
  const parts: [string, (m: number) => boolean][] = [["오전", (m) => m < 12 * 60], ["오후", (m) => m >= 12 * 60 && m < 18 * 60], ["저녁", (m) => m >= 18 * 60]];

  const tag = (catId: string) => {
    const cat = catOf.get(catId);
    if (!cat) return null;
    const col = visibleOn(cat.color, c.bg, c.textMuted);
    return (
      <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: col + "22", alignSelf: "flex-start", marginTop: 2 }}>
        <AppText variant="small" weight={600} raw={col} numberOfLines={1}>{cat.title}</AppText>
      </View>
    );
  };
  const row = (t: Todo, withTime: boolean) => {
    const cat = catOf.get(t.categoryId);
    return (
      <TodoRow key={t.id}
        title={t.title}
        alarm={withTime || !t.remindAt ? undefined : formatTime(new Date(t.remindAt), prefs.use24h)}
        memo={t.memo}
        photo={t.photoUri}
        done={t.isDone}
        color={cat?.color ?? c.accent}
        important={t.isImportant}
        onImportant={() => notice(toggleImportant(t.id) ? "중요한 날로 표시했어요" : "중요한 날 표시를 풀었어요")}
        onToggle={() => toggleTodo(t.id)}
        onPress={() => { setSheetStart("menu"); setSheetTodo(materialize(t.id)); }}
        onMemoPress={() => { setSheetStart("memo"); setSheetTodo(materialize(t.id)); }}
        onAlarmPress={() => { setSheetStart("alarm"); setSheetTodo(materialize(t.id)); }}
        onDoubleTap={prefs.doubleTapToEdit ? () => { const id = materialize(t.id); setRenaming({ id, title: t.title }); } : undefined}
        small={prefs.smallTodoText} smallMemo={prefs.smallTodoMemo} smallPhoto={prefs.smallTodoPhoto}
        right={tag(t.categoryId)} />
    );
  };
  const eventCard = (e: CalEvent, from: number, to: number) => (
    <Pressable key={e.id} onPress={() => router.push(`/events/${day}` as never)} accessibilityRole="button"
      accessibilityLabel={`${e.title}, ${eventTimeLabel(e, prefs.use24h, parseDay(day).y)}${e.important ? ", 강조" : ""}`}
      style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 12, borderRadius: tokens.radius.md, backgroundColor: e.color + "26", borderLeftWidth: 3, borderLeftColor: e.color, marginVertical: 4 }}>
      {e.important ? <GlowFrame radius={tokens.radius.md} inset={4} embers={{ count: 6, rise: 18, size: 3 }} /> : null}
      <AppText variant="body" weight={600} numberOfLines={1}>{e.title}</AppText>
      <AppText variant="small" color="textMuted">{`${clock(fromMinutes(from), prefs.use24h)}~${clock(fromMinutes(to), prefs.use24h)} · 일정`}</AppText>
    </Pressable>
  );
  const heading = (text: string, right?: React.ReactNode) => (
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 18, marginBottom: 2 }}>
      <AppText variant="helper" weight={700} color="textMuted" style={{ flex: 1 }}>{text}</AppText>
      {right}
    </View>
  );

  // 리스트 메뉴 (kept from the to-do list): unfinished to tomorrow / another day, copy all, delete all
  const undone = () => todos.filter((t) => !t.isDone).map((t) => t.id);
  const all = () => todos.map((t) => t.id);
  const runList = (a: ListAction) => {
    setListMenu(null);
    if (a === "tomorrow") { const ids = undone(); moveTodos(ids, addDays(day, 1)); notice(ids.length ? `미완료 ${ids.length}개를 내일로 옮겼어요` : "미완료 할 일이 없어요"); }
    if (a === "otherDay") setListMenu("move");
    if (a === "copyAll") setListMenu("copy");
    if (a === "deleteAll") setListMenu("delete");
  };

  return (
    <View>
      {band.length ? (
        <>
          {heading("종일")}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 6 }}>
            {band.map((e) => (
              <Pressable key={e.id} onPress={() => router.push(`/events/${day}` as never)} accessibilityRole="button" accessibilityLabel={`${e.title}, 종일${e.important ? ", 강조" : ""}`}
                style={{ backgroundColor: e.color, borderRadius: tokens.radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}>
                {e.important ? <GlowFrame radius={tokens.radius.sm} inset={5} embers={{ count: 6, rise: 16, size: 3 }} /> : null}
                <AppText variant="small" weight={600} raw={onColor(e.color)} numberOfLines={1}>{e.title}</AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}

      {parts.map(([name, inPart]) => {
        const items = timed.filter((x) => inPart(x.at));
        if (!items.length) return null;
        return (
          <View key={name}>
            {heading(name)}
            {items.map((x) => (
              <View key={x.kind === "event" ? `e${x.e.id}` : x.t.id} style={{ flexDirection: "row", alignItems: "flex-start" }}>
                <AppText variant="helper" weight={600} color="textMuted" style={{ width: TIME_W, paddingTop: x.kind === "event" ? 14 : 10 }}>{clock(fromMinutes(x.at), prefs.use24h)}</AppText>
                {x.kind === "event" ? eventCard(x.e, x.from, x.to) : <View style={{ flex: 1 }}>{row(x.t, true)}</View>}
              </View>
            ))}
          </View>
        );
      })}

      {heading("언제든", todos.length ? (
        <Pressable onPress={() => setListMenu("menu")} hitSlop={10} accessibilityRole="button" accessibilityLabel="리스트 메뉴"><Ellipsis size={20} color={c.textMuted} /></Pressable>
      ) : null)}
      {anytime.map((t) => row(t, false))}
      {pending.map(({ r, cat }) => <PendingRoutineRow key={r.id} title={`${r.title}`} onAdd={() => addRoutineTodo(r.id, day)} />)}
      {!todos.length && !pending.length ? (
        <AppText variant="body" color="textMuted" style={{ paddingVertical: 14 }}>{categories.length ? "아래 칸에 할 일을 적어 보세요" : "먼저 관리 메뉴에서 카테고리를 만들어 주세요"}</AppText>
      ) : null}

      <Pressable onPress={() => router.push(`/diary/${day}` as never)} accessibilityRole="button" accessibilityLabel={diary ? "일기 보기" : "일기 쓰기"}
        style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22, paddingVertical: 12, paddingHorizontal: 16, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
        {diary?.emoji ? <MoodMark value={diary.emoji} size={26} /> : <AppText variant="bodyLg">📔</AppText>}
        <AppText variant="body" color={diary ? "text" : "textMuted"} numberOfLines={1} style={{ flex: 1 }}>{diary ? diary.body || "오늘의 기분을 남겼어요" : "이날의 일기 쓰기"}</AppText>
      </Pressable>

      <TodoSheets todoId={sheetTodo} start={sheetStart} onClose={() => setSheetTodo(null)} onEdit={(id) => setRenaming({ id, title: db.todos.find((x) => x.id === id)?.title ?? "" })} notice={notice} />
      <BottomSheet visible={!!renaming} onClose={() => setRenaming(null)} title="할 일 고치기" right={renaming ? { label: "완료", onPress: () => { if (renaming.title.trim()) updateTodo(renaming.id, { title: renaming.title.trim() }); setRenaming(null); } } : undefined}>
        {renaming ? <TitleInput value={renaming.title} onChangeText={(title) => setRenaming({ ...renaming, title })} autoFocus placeholder="할 일" /> : null}
      </BottomSheet>
      <ListMenuSheet open={listMenu === "menu"} onClose={() => setListMenu(null)} onConfirm={runList} />
      {listMenu === "move" || listMenu === "copy" ? (
        <DatePickSheet title={listMenu === "move" ? "미완료 할 일 다른 날 하기" : "모든 할 일 복사"} initial={addDays(day, 1)} onClose={() => setListMenu(null)}
          onPick={(d) => {
            const ids = listMenu === "move" ? undone() : all();
            if (listMenu === "move") moveTodos(ids, d); else copyTodos(ids, d);
            setListMenu(null);
            notice(`${ids.length}개를 ${parseDay(d).m}월 ${parseDay(d).d}일에 ${listMenu === "move" ? "옮겼어요" : "복사했어요"}`);
          }} />
      ) : null}
      <BottomSheet visible={listMenu === "delete"} onClose={() => setListMenu(null)} title="모든 할 일 삭제">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>{`${parseDay(day).m}월 ${parseDay(day).d}일의 할 일 ${todos.length}개를 모두 지울까요?`}</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setListMenu(null)} />
          <Button kind="danger" flex label="삭제" onPress={() => { const n = todos.length; deleteTodos(all()); setListMenu(null); notice(`${n}개를 지웠어요`); }} />
        </View>
      </BottomSheet>
    </View>
  );
}

