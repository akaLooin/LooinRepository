import { useInsets } from "../../theme";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import {
  AppText, Archive, BottomSheet, CollapseChevron, Button, Calendar, CalendarHeader, CategoryPill, Chip, IconChip, ProfileHeader, ReorderableList, TextAlignStart, TodoRow, useToast, Users, DragScrollView,
} from "../../components";
import {
  addRoutineTodo, addTodo, arrangeTodos, copyTodos, ddayLabel, deleteTodos, EndedCategoryError, manualRoutinesOn, materialize, moveTodos, selectCategories, selectDDays, todosForDay, toggleTodo,
  updateTodo, useDB,
} from "../../data/store";
import { arrangeByHeaders } from "../../lib/arrange";
import { addDays, monthGrid, parseDay, today, weekday, type Day } from "../../lib/dates";
import { formatTime, usePrefs } from "../../data/prefs";
import { tokens, useTheme } from "../../theme";
import { dayState } from "./dayState";
import { HomeMenu, MenuButton } from "./HomeMenu";
import { InlineTodoInput } from "./InlineTodoInput";
import { PendingRoutineRow } from "./PendingRoutineRow";
import { CalendarFilterSheet, ListMenuSheet, type ListAction } from "./HomeSheets";
import { DatePickSheet } from "./TodoSheets";
import { SelectionBar } from "./SelectionBar";
import { useSwipeRight } from "./useSwipeRight";
import { usePager } from "./pagerContext";
import { setPref } from "../../data/prefs";
import { smoothLayout } from "../../lib/motion";
import { TodoSheets } from "./TodoSheets";

const G = tokens.layout.gutter;

function weekOfMonth(day: Day, sundayFirst: boolean) {
  const { y, m } = parseDay(day);
  return monthGrid(y, m, sundayFirst).findIndex((row) => row.includes(day));
}

export function HomeScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const profile = useDB((d) => d.profile);
  const categories = useDB(selectCategories);
  const db = useDB((d) => d);
  const prefs = usePrefs();
  const ddays = useDB(selectDDays);
  const diaries = useDB((d) => d.diaries);

  const now = today();
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [mode, setMode] = useState<"month" | "week">("month");
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sheetTodo, setSheetTodo] = useState<string | null>(null);
  const [homeSheet, setHomeSheet] = useState<null | "filter" | "list" | "pickMove" | "pickCopy" | "confirmDelete">(null);
  const [selecting, setSelecting] = useState<Set<string> | null>(null);
  const pager = usePager();
  const routeSwipe = useSwipeRight(() => router.push("/inbox" as never));
  // inside the home/보관함 pager the swipe drags the pages with the finger; on its own it just opens the screen
  const swipe = pager ? pager.swipe(1) : routeSwipe;
  const openInbox = () => (pager ? pager.open(0) : router.push("/inbox" as never));
  const [toast, notice] = useToast();

  const grid = monthGrid(view.y, view.m, prefs.weekStartsSunday);
  const byDay = useMemo(() => {
    const m = new Map<Day, ReturnType<typeof todosForDay>>();
    for (const row of grid) for (const d of row) if (d) m.set(d, todosForDay(db, d));
    return m;
  }, [db, view.y, view.m, prefs.weekStartsSunday]); // eslint-disable-line react-hooks/exhaustive-deps
  const dayTodos = todosForDay(db, selected).sort((a, b) => (prefs.todoSort === "done_last" ? Number(a.isDone) - Number(b.isDone) : 0) || a.sortOrder - b.sortOrder);

  const weekRow = mode === "week" ? [grid[Math.max(0, parseDay(selected).m === view.m ? weekOfMonth(selected, prefs.weekStartsSunday) : 0)]] : undefined;
  const title = mode === "month" ? `${view.y}년 ${view.m}월` : `${view.y}년 ${view.m}월 ${(weekRow ? grid.indexOf(weekRow[0]) : 0) + 1}주차`;

  const shift = (dir: number) => {
    if (mode === "week") {
      const next = addDays(selected, dir * 7);
      setSelected(next);
      setView({ y: parseDay(next).y, m: parseDay(next).m });
      return;
    }
    setView(({ y, m }) => { const t = m + dir; return { y: y + Math.floor((t - 1) / 12), m: ((t - 1 + 120) % 12) + 1 }; });
  };

  const diary = diaries.find((x) => x.date === selected);
  const calIds = new Set(prefs.calendarCategoryIds ?? categories.map((x) => x.id));
  const calCats = categories.filter((x) => calIds.has(x.id));
  const firstDDay = ddays.find((d) => !d.isPrivate) ?? ddays[0];
  const shown = categories.filter((cat) => !cat.endedAt || dayTodos.some((t) => t.categoryId === cat.id));

  // The day as one sequence: title, to-dos, footer (manual routines, add field) for each category
  const isCollapsed = (id: string) => prefs.collapsibleCategories && prefs.collapsedCategoryIds.includes(id);
  type Cat = (typeof shown)[number];
  type DayRow = { kind: "head" | "foot"; key: string; cat: Cat; last?: boolean } | { kind: "todo"; key: string; cat: Cat; t: (typeof dayTodos)[number] };
  const dayRows: DayRow[] = shown.flatMap((cat, i) => [
    { kind: "head" as const, key: `h:${cat.id}`, cat },
    ...(isCollapsed(cat.id) ? [] : dayTodos.filter((t) => t.categoryId === cat.id).map((t) => ({ kind: "todo" as const, key: t.id, cat, t }))),
    { kind: "foot" as const, key: `f:${cat.id}`, cat, last: i === shown.length - 1 },
  ]);
  const onArrange = (keys: string[]) => {
    const owner = (k: string) => (k.startsWith("h:") || k.startsWith("f:") ? k.slice(2) : null);
    // to-dos hidden in folded categories are not in the list: put them back first, so a to-do dropped there goes last
    const full = keys.flatMap((k) => (k.startsWith("h:") && isCollapsed(k.slice(2)) ? [k, ...dayTodos.filter((t) => t.categoryId === k.slice(2)).map((t) => t.id)] : [k]));
    const entries = arrangeByHeaders(full, owner);
    if (!arrangeTodos(entries)) notice("종료한 카테고리로는 옮길 수 없어요");
  };

  const undoneIds = () => dayTodos.filter((t) => !t.isDone).map((t) => t.id);
  const allIds = () => dayTodos.map((t) => t.id);
  const runListAction = (a: ListAction) => {
    setHomeSheet(null);
    if (a === "tomorrow") { const ids = undoneIds(); moveTodos(ids, addDays(selected, 1)); notice(ids.length ? `미완료 ${ids.length}개를 내일로 옮겼어요` : "미완료 할 일이 없어요"); }
    if (a === "otherDay") setHomeSheet("pickMove");
    if (a === "copyAll") setHomeSheet("pickCopy");
    if (a === "deleteAll") setHomeSheet("confirmDelete");
    if (a === "select") setSelecting(new Set());
  };
  const toggleSelect = (id: string) => setSelecting((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const onAdd = (categoryId: string, title: string) => {
    try {
      addTodo(categoryId, selected, title);
    } catch (e) {
      if (e instanceof EndedCategoryError) notice(e.message);
      else throw e;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <DragScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 60, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: G }}>
          <MenuButton onPress={() => setMenuOpen(true)} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: G, gap: 8 }}>
          <IconChip label="보관함" onPress={openInbox}><Archive size={22} color={c.text} /></IconChip>
          <Chip label={profile.nickname} avatar={profile.avatarUri} selected />
          <IconChip label="친구" onPress={() => notice("친구 기능은 2단계에서 만들어요")}><Users size={22} color={c.text} /></IconChip>
        </ScrollView>

        <View style={{ paddingHorizontal: G, marginTop: 34 }}>
          <ProfileHeader
            name={profile.nickname}
            avatar={profile.avatarUri}
            bio={profile.bio}
            dday={firstDDay ? { title: firstDDay.title, label: ddayLabel(firstDDay, now) } : undefined}
            onDday={() => router.push("/ddays" as never)}
            onEmoji={() => notice("상태 이모지는 다음 단계에서 만들어요")}
          />
        </View>

        <View style={{ paddingHorizontal: G, marginTop: 27, gap: 16 }}>
          <CalendarHeader
            title={title}
            mode={mode}
            onToggleMode={() => { smoothLayout(); setMode(mode === "month" ? "week" : "month"); setView({ y: parseDay(selected).y, m: parseDay(selected).m }); }}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            filterColors={calCats.slice(0, 2).map((x) => x.color)}
            onFilter={() => setHomeSheet("filter")}
          />
          <Calendar
            year={view.y}
            month={view.m}
            today={now}
            selected={selected}
            onSelect={(d) => { if (d !== selected) smoothLayout(160); setSelected(d); setAdding(null); setEditing(null); }}
            state={(d) => dayState((byDay.get(d) ?? []).filter((t) => calIds.has(t.categoryId)), calCats, prefs.calendarCategoryCount)}
            rows={weekRow}
            weekStartsSunday={prefs.weekStartsSunday}
          />
        </View>

        <View style={{ paddingHorizontal: G, marginTop: 20, gap: 12 }} {...swipe}>
          {selected !== now ? (
            <AppText variant="helper" color="textMuted">{`${parseDay(selected).m}월 ${parseDay(selected).d}일 ${"일월화수목금토"[weekday(selected)]}요일`}</AppText>
          ) : null}
          {shown.length === 0 ? (
            <Pressable onPress={() => router.push("/categories/new" as never)} accessibilityRole="button" style={{ paddingVertical: 24, alignItems: "center", gap: 6 }}>
              <AppText variant="bodyLg" weight={600}>카테고리를 먼저 만들어 주세요</AppText>
              <AppText variant="helper" color="textMuted">눌러서 첫 카테고리 만들기</AppText>
            </Pressable>
          ) : null}
          {/* One list for the whole day, as in the original: a held to-do can move into another category */}
          {/* the original's list sits ~3dp further right and lower than the calendar's edge (same-phone screenshots) */}
          <View style={{ marginLeft: 3, marginTop: 3 }}>
          <ReorderableList
            items={dayRows}
            keyOf={(r) => r.key}
            labelOf={(r) => (r.kind === "todo" ? r.t.title : r.cat.title)}
            fixed={(r) => r.kind !== "todo"}
            onReorder={onArrange}
            renderItem={(r, drag) => {
              const cat = r.cat;
              const addInput = adding === cat.id ? <InlineTodoInput color={cat.color} onSubmit={(title) => onAdd(cat.id, title)} onDone={() => setAdding(null)} /> : null;
              if (r.kind === "head") {
                const collapsed = isCollapsed(cat.id);
                return (
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <View style={{ flexShrink: 1 }}>
                        <CategoryPill
                          title={cat.title}
                          color={cat.color}
                          visibility={cat.visibility}
                          onPress={() => router.push(`/categories/${cat.id}` as never)}
                          onLongPress={() => router.push(`/categories/${cat.id}` as never)}
                          onAdd={() => { smoothLayout(160); setEditing(null); setAdding(cat.id); }}
                        />
                      </View>
                      {prefs.collapsibleCategories ? (
                        <View style={{ marginLeft: "auto", paddingLeft: 8 }}>
                          <CollapseChevron collapsed={collapsed} label={cat.title} onPress={() => {
                            smoothLayout();
                            setPref("collapsedCategoryIds", collapsed ? prefs.collapsedCategoryIds.filter((x) => x !== cat.id) : [...prefs.collapsedCategoryIds, cat.id]);
                          }} />
                        </View>
                      ) : null}
                    </View>
                    {collapsed ? null : <View style={{ marginTop: 10 }}>{prefs.inputAtTop ? addInput : null}</View>}
                  </View>
                );
              }
              if (r.kind !== "todo") {
                return (
                  <View style={{ paddingBottom: r.last ? 0 : 12 }}>
                    {isCollapsed(cat.id) ? null : manualRoutinesOn(db, selected, cat.id).map((x) => (
                      <PendingRoutineRow key={x.id} title={x.title} onAdd={() => addRoutineTodo(x.id, selected)} />
                    ))}
                    {isCollapsed(cat.id) || prefs.inputAtTop ? null : addInput}
                  </View>
                );
              }
              const t = r.t;
              return editing === t.id ? (
                <InlineTodoInput color={cat.color} initial={t.title} onSubmit={(title) => updateTodo(t.id, { title })} onDone={() => setEditing(null)} />
              ) : (
                <TodoRow
                  title={t.title}
                  alarm={t.remindAt ? formatTime(new Date(t.remindAt), prefs.use24h) : undefined}
                  memo={t.memo}
                  photo={t.photoUri}
                  done={t.isDone}
                  color={cat.color}
                  onToggle={() => (selecting ? toggleSelect(t.id) : toggleTodo(t.id))}
                  onPress={() => { if (pager?.justSwiped()) return; if (selecting) toggleSelect(t.id); else setSheetTodo(materialize(t.id)); }}
                  selected={selecting?.has(t.id)}
                  onDoubleTap={prefs.doubleTapToEdit ? () => { setSheetTodo(null); setEditing(materialize(t.id)); } : undefined}
                  small={prefs.smallTodoText}
                  smallMemo={prefs.smallTodoMemo}
                  {...drag}
                />
              );
            }}
          />
          </View>

          <Pressable onPress={() => router.push(`/diary/${selected}` as never)} accessibilityRole="button" accessibilityLabel={diary ? "일기 보기" : "일기 쓰기"}
            style={{ flexDirection: "row", alignItems: "center", gap: 12, marginTop: 12, paddingVertical: 12, paddingHorizontal: 16, borderRadius: tokens.radius.lg, backgroundColor: c.surface }}>
            <AppText variant="bodyLg">{diary?.emoji ?? "📔"}</AppText>
            <AppText variant="body" color={diary ? "text" : "textMuted"} numberOfLines={1} style={{ flex: 1 }}>{diary ? diary.body || "오늘의 기분을 남겼어요" : "이날의 일기 쓰기"}</AppText>
          </Pressable>

          <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.surfaceStrong, marginTop: 16 }} />
          <Pressable onPress={() => setHomeSheet("list")} accessibilityRole="button" style={{ alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 }}>
            <TextAlignStart size={20} color={c.text} />
            <AppText variant="bodyLg">리스트 메뉴</AppText>
          </Pressable>
        </View>
      </DragScrollView>

      <HomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      {homeSheet === "filter" ? <CalendarFilterSheet open onClose={() => setHomeSheet(null)} categories={categories} /> : null}
      <ListMenuSheet open={homeSheet === "list"} onClose={() => setHomeSheet(null)} onConfirm={runListAction} />
      {homeSheet === "pickMove" || homeSheet === "pickCopy" ? (
        <DatePickSheet
          title={homeSheet === "pickMove" ? "미완료 할 일 다른 날 하기" : "모든 할 일 복사"}
          initial={addDays(selected, 1)}
          onClose={() => setHomeSheet(null)}
          onPick={(day) => {
            const ids = homeSheet === "pickMove" ? undoneIds() : allIds();
            if (homeSheet === "pickMove") moveTodos(ids, day); else copyTodos(ids, day);
            setHomeSheet(null);
            notice(`${ids.length}개를 ${parseDay(day).m}월 ${parseDay(day).d}일에 ${homeSheet === "pickMove" ? "옮겼어요" : "복사했어요"}`);
          }}
        />
      ) : null}
      <BottomSheet visible={homeSheet === "confirmDelete"} onClose={() => setHomeSheet(null)} title="모든 할 일 삭제">
        <AppText variant="body" color="textSecondary" center style={{ marginBottom: 20 }}>{`${parseDay(selected).m}월 ${parseDay(selected).d}일의 할 일 ${dayTodos.length}개를 모두 지울까요?`}</AppText>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Button kind="plain" flex label="취소" onPress={() => setHomeSheet(null)} />
          <Button kind="danger" flex label="삭제" onPress={() => { const n = dayTodos.length; deleteTodos(allIds()); setHomeSheet(null); notice(`${n}개를 지웠어요`); }} />
        </View>
      </BottomSheet>
      {selecting ? (
        <SelectionBar
          count={selecting.size}
          onCancel={() => setSelecting(null)}
          onTomorrow={() => { moveTodos([...selecting], addDays(selected, 1)); notice(`${selecting.size}개를 내일로 옮겼어요`); setSelecting(null); }}
          onInbox={() => { moveTodos([...selecting], null); notice(`${selecting.size}개를 보관함으로 옮겼어요`); setSelecting(null); }}
          onDelete={() => { deleteTodos([...selecting]); notice(`${selecting.size}개를 지웠어요`); setSelecting(null); }}
        />
      ) : null}
      <TodoSheets todoId={sheetTodo} onClose={() => setSheetTodo(null)} onEdit={(id) => setEditing(id)} notice={notice} />
      {toast}
    </View>
  );
}
