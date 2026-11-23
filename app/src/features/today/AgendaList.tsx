import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Pressable, View } from "react-native";
import { AppText, BottomSheet, Button, ChevronDown, ChevronUp, Ellipsis, MoodMark, MemoInput, ReorderableList, TitleInput, TodoRow, CalendarPlus, NotebookPen, useGlowOf, GlowTint, VisibilityIcon, type DragHandle } from "../../components";
import { reactionsOnMine, type Received } from "../../data/social";
import { ReactionLine } from "../social/FriendHome";
import { smoothLayout } from "../../lib/motion";
import { arrangeByHeaders } from "../../lib/arrange";
import { useFeature, useT } from "../../lib/appConfig";
import { EventEditor, newDraft, type EventDraft } from "../events/EventSheets";
import { useCalendarEvents } from "../../lib/calendarView";
import { isReadOnlyEvent } from "../../lib/googleColors";
import { formatTime, setPref, usePrefs } from "../../data/prefs";
import {
  addRoutineTodo, arrangeTodos, copyTodos, ddayLabel, deleteTodos, isDDayOn, manualRoutinesOn, materialize, moveTodos, selectCategories, selectDDays, todosForDay, toggleEventImportant, toggleImportant, toggleTodo, updateTodo, useDB,
} from "../../data/store";
import { addDays, parseDay, today, type Day } from "../../lib/dates";
import { clock, dayBlocks, eventsOn, eventTimeLabel, fromMinutes, inBand, type CalEvent } from "../../lib/events";
import { onColor, tokens, useTheme, visibleOn } from "../../theme";
import { ListMenuSheet, type ListAction } from "../home/HomeSheets";
import { PendingRoutineRow } from "../home/PendingRoutineRow";
import { DatePickSheet, MemoLockChip, TodoSheets } from "../home/TodoSheets";
import { GlowFrame } from "../../components";

const TIME_W = 50;

/** The To Do order of 달력 (also used by 홈's week card): category order, 강조 first, done last (if set), then the user's order. */
export const agendaSort = (catOrder: Map<string, number>, doneLast: boolean) => (a: AgendaTodo, b: AgendaTodo) =>
  (catOrder.get(a.categoryId) ?? 0) - (catOrder.get(b.categoryId) ?? 0)
  || Number(!!b.isImportant) - Number(!!a.isImportant)
  || (doneLast ? Number(a.isDone) - Number(b.isDone) : 0) || a.sortOrder - b.sortOrder;
type AgendaTodo = { categoryId: string; isImportant?: boolean; isDone: boolean; sortOrder: number };
type Todo = ReturnType<typeof todosForDay>[number];
type Item = { kind: "event"; at: number; e: CalEvent; from: number; to: number } | { kind: "todo"; at: number; t: Todo };

/**
 * One day as an agenda (design app, 2026-11-21, user's choice "오늘 중심"): 종일 events, then 오전 · 오후 · 저녁 with
 * timed events and to-dos with a time mixed in time order, then To Do: the day's D-days on top, then to-dos in
 * category groups (강조 ones first, marked on the right; hold and drop in another group to move them there). Events
 * open their editor. Thin lines part the blocks. The diary of the day closes the list.
 */
/** Somewhere outside the list a to-do can be dropped on (달력: a date; see ReorderableList `drop`). */
export type AgendaDrop = { prepare: () => void; at: (x: number, y: number) => string | null; onHover: (target: string | null) => void; onDropOn: (key: string, target: string) => void };

export function AgendaList({ day, notice, drop, selecting, onSelecting }: {
  day: Day; notice: (m: string) => void;
  /** drag a to-do onto a date of the calendar above (as in the copy app) */
  drop?: AgendaDrop;
  /** 할 일 선택 (list menu): the picked to-dos, shown with a tick; the calendar tab shows the action bar */
  selecting?: Set<string> | null; onSelecting?: (s: Set<string> | null) => void;
}) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const db = useDB((d) => d);
  const categories = useDB(selectCategories);
  const diary = useDB((d) => d.diaries.find((x) => x.date === day));
  const [sheetTodo, setSheetTodo] = useState<string | null>(null);
  const [sheetStart, setSheetStart] = useState<"menu" | "memo" | "alarm">("menu");
  const [renaming, setRenaming] = useState<{ id: string; title: string; memo: string; priv: boolean; focus: "title" | "memo" } | null>(null);
  const saveRenaming = () => {
    if (renaming?.title.trim()) updateTodo(renaming.id, { title: renaming.title.trim(), memo: renaming.memo.trim(), memoIsPrivate: renaming.priv });
    setRenaming(null);
  };
  // the title and the memo in one sheet, from the title (double tap, 수정) or from the memo (a tap on it) (user)
  const editTodo = (id: string, focus: "title" | "memo") => {
    const t = db.todos.find((x) => x.id === id);
    setRenaming({ id, title: t?.title ?? "", memo: t?.memo ?? "", priv: !!t?.memoIsPrivate, focus });
  };
  const [listMenu, setListMenu] = useState<null | "menu" | "move" | "copy" | "delete">(null);
  const [editing, setEditing] = useState<EventDraft | null>(null);
  const ddays = useDB(selectDDays);
  const pick = (id: string) => { const n = new Set(selecting ?? []); if (n.has(id)) n.delete(id); else n.add(id); onSelecting?.(n); };
  // reactions friends left on my to-dos and diary around this day (shown under them, as in the copy app)
  const [received, setReceived] = useState<Received>({ todos: {}, diaries: {} });
  useEffect(() => {
    let alive = true;
    reactionsOnMine(addDays(day, -7), addDays(day, 7)).then((r) => { if (alive) setReceived(r); }).catch(() => {});
    return () => { alive = false; };
  }, [day]);
  // wording and shown parts from the admin app
  const tx = useT();
  const showDDays = useFeature("agenda.ddays"), showDiary = useFeature("agenda.diaryCard"), showCount = useFeature("agenda.groupCount");
  const glowOf = useGlowOf(); // 메인 앱: each item glows in its own colour (or the one picked for its category)
  const catOf = useMemo(() => new Map(categories.map((x) => [x.id, x])), [categories]);
  const catOrder = useMemo(() => new Map(categories.map((x, i) => [x.id, i])), [categories]);

  const todos = todosForDay(db, day);
  const shownEvents = useCalendarEvents(); // 보기 설정: hidden Google calendars left out
  const timeOf = (t: Todo) => {
    if (!t.remindAt) return null;
    const d = new Date(t.remindAt);
    return d.getHours() * 60 + d.getMinutes();
  };
  const band = eventsOn(shownEvents, day).filter(inBand);
  const timed: Item[] = [
    ...dayBlocks(shownEvents, day).map((b) => ({ kind: "event" as const, at: b.top, e: b.e, from: b.top, to: b.bottom })),
    ...todos.filter((t) => timeOf(t) !== null).map((t) => ({ kind: "todo" as const, at: timeOf(t)!, t })),
  ].sort((a, b) => a.at - b.at);
  // grouped by category (user, 2026-11-21): inside a category 강조 to-dos first, done ones last, then the user's order
  const anytime = todos.filter((t) => timeOf(t) === null).sort(agendaSort(catOrder, prefs.todoSort === "done_last"));
  const todayDDays = ddays.filter((x) => isDDayOn(x, day));
  const pending = categories.filter((x) => !x.endedAt).flatMap((cat) => manualRoutinesOn(db, day, cat.id).map((r) => ({ r, cat })));
  type Cat = (typeof categories)[number];
  type GroupRow = { kind: "head" | "foot"; key: string; cat: Cat } | { kind: "todo"; key: string; cat: Cat; t: Todo };
  // fold a category by tapping its title (user, 2026-11-23; the copy app's 카테고리 접기 펼치기)
  const folded = new Set(prefs.collapsedCategoryIds);
  const toggleFold = (id: string) => { smoothLayout(); setPref("collapsedCategoryIds", folded.has(id) ? prefs.collapsedCategoryIds.filter((x) => x !== id) : [...prefs.collapsedCategoryIds, id]); };
  const groupRows: GroupRow[] = categories
    .filter((cat) => anytime.some((t) => t.categoryId === cat.id) || pending.some((x) => x.cat.id === cat.id))
    .flatMap((cat) => [
      { kind: "head" as const, key: `h:${cat.id}`, cat },
      ...(folded.has(cat.id) ? [] : anytime.filter((t) => t.categoryId === cat.id).map((t) => ({ kind: "todo" as const, key: t.id, cat, t }))),
      { kind: "foot" as const, key: `f:${cat.id}`, cat },
    ]);
  // a group title of our own (not the original's pill): a short colour bar, the name in its colour, done/all on the right
  const groupHead = (cat: Cat) => {
    const col = visibleOn(cat.color, c.bg, c.text);
    const list = anytime.filter((t) => t.categoryId === cat.id);
    return (
      // tap: fold or open the group; hold: edit the category (as the copy app's category title)
      <Pressable onPress={() => toggleFold(cat.id)} onLongPress={() => router.push(`/categories/${cat.id}` as never)} delayLongPress={450}
        accessibilityRole="button" accessibilityLabel={`${cat.title} 카테고리, ${folded.has(cat.id) ? "접힘" : "펼침"}`} accessibilityHint="눌러서 접기·펼치기, 길게 눌러 카테고리 편집"
        style={{ flexDirection: "row", alignItems: "center", gap: 8, height: 34, marginTop: 6 }}>
        <View style={{ width: 3, height: 14, borderRadius: 2, backgroundColor: col }} />
        <AppText variant="helper" weight={700} raw={col} numberOfLines={1} style={{ flex: 1 }}>{cat.title}</AppText>
        {/* who can see this category, just left of the count (user) */}
        <VisibilityIcon value={cat.visibility} size={13} color={c.textMuted} />
        {list.length && showCount ? <AppText variant="small" color="textMuted">{`${list.filter((t) => t.isDone).length}/${list.length}`}</AppText> : null}
        {folded.has(cat.id) ? <ChevronDown size={16} color={c.textMuted} /> : <ChevronUp size={16} color={c.textMuted} />}
      </Pressable>
    );
  };
  const parts: [string, (m: number) => boolean][] = [[tx("agenda.morning"), (m) => m < 12 * 60], [tx("agenda.afternoon"), (m) => m >= 12 * 60 && m < 18 * 60], [tx("agenda.evening"), (m) => m >= 18 * 60]];

  // the right side of a to-do: 중요 when it is marked (user: named 중요 here) (no category tag any more; the groups show the category)
  const mark = (t: Todo, glow: string) => (t.isImportant ? (
    <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: glow, alignSelf: "flex-start", marginTop: 2 }} accessibilityLabel={tx("agenda.important")}>
      <AppText variant="small" weight={700} raw={glow}>{tx("agenda.important")}</AppText>
    </View>
  ) : null);
  const row = (t: Todo, withTime: boolean, drag?: DragHandle) => {
    const cat = catOf.get(t.categoryId);
    const glow = glowOf(t.categoryId, cat?.color ?? c.accent);
    return (
      <GlowTint key={t.id} color={glow}>
      <TodoRow key={t.id}
        title={t.title}
        alarm={withTime || !t.remindAt ? undefined : formatTime(new Date(t.remindAt), prefs.use24h)}
        memo={t.memo}
        photo={t.photoUri}
        done={t.isDone}
        color={cat?.color ?? c.accent}
        important={t.isImportant}
        onImportant={selecting ? undefined : () => notice(toggleImportant(t.id) ? "중요한 날로 표시했어요" : "중요한 날 표시를 풀었어요")}
        onToggle={() => (selecting ? pick(t.id) : toggleTodo(t.id) || notice("다가올 날의 할 일은 그날이 되면 완료할 수 있어요"))}
        onPress={() => { if (selecting) return pick(t.id); setSheetStart("menu"); setSheetTodo(materialize(t.id)); }}
        onMemoPress={selecting ? undefined : () => editTodo(materialize(t.id), "memo")}
        onAlarmPress={selecting ? undefined : () => { setSheetStart("alarm"); setSheetTodo(materialize(t.id)); }}
        selected={selecting?.has(t.id)}
        below={received.todos[t.id]?.length ? <ReactionLine list={received.todos[t.id]} /> : undefined}
        onDoubleTap={prefs.doubleTapToEdit ? () => editTodo(materialize(t.id), "title") : undefined}
        small={prefs.smallTodoText} smallMemo={prefs.smallTodoMemo} smallPhoto={prefs.smallTodoPhoto}
        right={mark(t, glow)} {...drag} />
      </GlowTint>
    );
  };
  // 꾹 누르기 = 강조 켜고 끄기 (user, 2026-11-23: quicker than opening the event); a read-only Google event stays
  const glowEvent = (e: CalEvent) => {
    if (isReadOnlyEvent(e, prefs.googleReadOnlyCalendarIds)) { notice("보기만 할 수 있는 구글 캘린더의 일정이에요"); return; }
    notice(toggleEventImportant(e.id) ? `'${e.title}' 강조했어요` : `'${e.title}' 강조를 풀었어요`);
  };
  const eventCard = (e: CalEvent, from: number, to: number) => (
    <Pressable key={e.id} onPress={() => setEditing({ ...e })} onLongPress={() => glowEvent(e)} delayLongPress={450} accessibilityRole="button" accessibilityHint="일정 수정, 꾹 누르면 강조"
      accessibilityLabel={`${e.title}, ${eventTimeLabel(e, prefs.use24h, parseDay(day).y)}${e.important ? ", 강조" : ""}`}
      style={{ flex: 1, paddingVertical: 9, paddingHorizontal: 12, borderRadius: tokens.radius.md, backgroundColor: e.color + "26", borderLeftWidth: 3, borderLeftColor: e.color, marginVertical: 4 }}>
      {e.important ? <GlowTint color={glowOf(e.categoryId, e.color)}><GlowFrame radius={tokens.radius.md} inset={4} embers={{ count: 6, rise: 18, size: 3 }} /></GlowTint> : null}
      <AppText variant="body" weight={600} numberOfLines={1}>{e.title}</AppText>
      <AppText variant="small" color="textMuted">{`${clock(fromMinutes(from), prefs.use24h)}~${clock(fromMinutes(to), prefs.use24h)} · ${e.location ? e.location : "일정"}`}</AppText>
    </Pressable>
  );
  const heading = (text: string, right?: React.ReactNode) => (
    // each part starts with a thin line, so 종일 · 오전 · 오후 · 저녁 · To Do read as separate blocks (user)
    <View style={{ flexDirection: "row", alignItems: "center", marginTop: 14, paddingTop: 12, marginBottom: 2, borderTopWidth: 1, borderTopColor: c.sectionLine }}>
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
    if (a === "select") onSelecting?.(new Set());
  };

  return (
    <View>
      {/* 일정 추가 | 일기 (user, 2026-11-23): always first, above the events and the to-dos, so they never move */}
      <View style={{ flexDirection: "row", gap: 10, marginTop: 14 }}>
        <Pressable onPress={() => {
          const now = new Date();
          const h = day === today() ? Math.min(now.getHours() + 1, 23) : 9;
          setEditing(newDraft(day, fromMinutes(h * 60), fromMinutes(Math.min(h * 60 + 60, 24 * 60 - 5)), db.events[db.events.length - 1]?.color ?? c.accent));
        }} accessibilityRole="button" accessibilityLabel="일정 추가"
          style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 14, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
          <CalendarPlus size={22} color={c.text} />
          <AppText variant="body" weight={600} numberOfLines={1} style={{ flex: 1 }}>일정 추가</AppText>
        </Pressable>
        {showDiary ? (
          <Pressable onPress={() => router.push(`/diary/${day}` as never)} accessibilityRole="button" accessibilityLabel={diary ? "일기 보기" : "일기 쓰기"}
            style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10, height: 50, paddingHorizontal: 14, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
            {diary?.emoji ? <MoodMark value={diary.emoji} size={24} /> : <NotebookPen size={22} color={c.text} />}
            <AppText variant="body" weight={600} color={diary ? "text" : "textSecondary"} numberOfLines={1} style={{ flex: 1 }}>{diary ? diary.body || "기분을 남겼어요" : tx("agenda.diary")}</AppText>
            {diary && received.diaries[diary.id]?.length ? <ReactionLine list={received.diaries[diary.id].slice(-2)} size={20} /> : null}
          </Pressable>
        ) : null}
      </View>
      {band.length ? (
        <>
          {heading(tx("agenda.allday"))}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 6 }}>
            {band.map((e) => (
              <Pressable key={e.id} onPress={() => setEditing({ ...e })} onLongPress={() => glowEvent(e)} delayLongPress={450} accessibilityRole="button" accessibilityHint="일정 수정, 꾹 누르면 강조" accessibilityLabel={`${e.title}, 종일${e.important ? ", 강조" : ""}`}
                style={{ backgroundColor: e.color, borderRadius: tokens.radius.sm, paddingHorizontal: 10, paddingVertical: 5 }}>
                {e.important ? <GlowTint color={glowOf(e.categoryId, e.color)}><GlowFrame radius={tokens.radius.sm} inset={5} embers={{ count: 6, rise: 16, size: 3 }} /></GlowTint> : null}
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

      {heading(tx("agenda.todo"), todos.length ? (
        <Pressable onPress={() => setListMenu("menu")} hitSlop={10} accessibilityRole="button" accessibilityLabel="리스트 메뉴"><Ellipsis size={20} color={c.textMuted} /></Pressable>
      ) : null)}
      {/* D-days of this day sit above everything (user) */}
      {(showDDays ? todayDDays : []).map((x) => (
        <Pressable key={x.id} onPress={() => router.push("/ddays" as never)} accessibilityRole="button" accessibilityLabel={`디데이 ${x.title}, ${ddayLabel(x, day)}`}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, paddingVertical: 6 }}>
          <View style={{ minWidth: 28, alignItems: "center" }}><AppText variant="small" weight={800} color="dday" numberOfLines={1}>{ddayLabel(x, day)}</AppText></View>
          <AppText variant="bodyLg" weight={600} style={{ flex: 1 }} numberOfLines={1}>{x.title}</AppText>
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: c.dday + "26" }}>
            <AppText variant="small" weight={700} color="dday">{tx("agenda.ddayMark")}</AppText>
          </View>
        </Pressable>
      ))}
      {/* to-dos in category groups; hold to move, dropped inside another group it joins that category (user) */}
      <ReorderableList items={groupRows} keyOf={(r) => r.key} labelOf={(r) => (r.kind === "todo" ? r.t.title : r.cat.title)} fixed={(r) => r.kind !== "todo" || !!selecting}
        drop={drop}
        onReorder={(rawKeys, moved) => {
          const owner = (k: string) => (k.startsWith("h:") || k.startsWith("f:") ? k.slice(2) : null);
          // to-dos hidden in folded groups are not in the list: put them back after their title first
          const keys = rawKeys.flatMap((k) => (k.startsWith("h:") && folded.has(k.slice(2)) ? [k, ...anytime.filter((t) => t.categoryId === k.slice(2)).map((t) => t.id)] : [k]));
          const before = anytime.find((t) => t.id === moved)?.categoryId;
          const entries = arrangeByHeaders(keys, owner);
          const joined = entries.find((e) => e.id === moved)?.categoryId;
          if (!arrangeTodos(entries)) notice("종료한 카테고리로는 옮길 수 없어요");
          else if (joined && joined !== before) notice(`'${catOf.get(joined)?.title ?? ""}'(으)로 옮겼어요`);
        }}
        renderItem={(r, drag) => {
          if (r.kind === "todo") return row(r.t, false, drag);
          if (r.kind === "head") return groupHead(r.cat);
          return (
            <View style={{ paddingBottom: 6 }}>
              {folded.has(r.cat.id) ? null : pending.filter((x) => x.cat.id === r.cat.id).map(({ r: rt }) => <PendingRoutineRow key={rt.id} title={rt.title} onAdd={() => addRoutineTodo(rt.id, day)} />)}
            </View>
          );
        }} />
      {!todos.length && !pending.length ? (
        <AppText variant="body" color="textMuted" style={{ paddingVertical: 14 }}>{categories.length ? tx("agenda.empty") : "먼저 관리 메뉴에서 카테고리를 만들어 주세요"}</AppText>
      ) : null}



      <TodoSheets todoId={sheetTodo} start={sheetStart} onClose={() => setSheetTodo(null)} onEdit={(id) => editTodo(id, "title")} notice={notice} />
      {/* 할 일 고치기: the title and the memo together (user, 2026-11-23) */}
      <BottomSheet visible={!!renaming} onClose={() => setRenaming(null)} title="할 일 고치기" right={renaming ? { label: "완료", onPress: saveRenaming } : undefined}>
        {renaming ? (
          <View style={{ gap: 12 }}>
            <TitleInput value={renaming.title} onChangeText={(title) => setRenaming((r) => (r ? { ...r, title } : r))} autoFocus={renaming.focus === "title"} placeholder="할 일" onSubmit={saveRenaming} />
            <View>
              {/* who sees the memo, set right here too (user, 2026-11-23) */}
              <MemoLockChip priv={renaming.priv} onChange={(priv) => setRenaming((r) => (r ? { ...r, priv } : r))} />
              <MemoInput value={renaming.memo} onChangeText={(memo) => setRenaming((r) => (r ? { ...r, memo } : r))} placeholder="메모" focusOnOpen={renaming.focus === "memo"} />
            </View>
          </View>
        ) : null}
      </BottomSheet>
      <EventEditor draft={editing} onClose={() => setEditing(null)} onSaved={(m) => { setEditing(null); notice(m); }} />
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

