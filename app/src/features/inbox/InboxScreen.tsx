import { goBack } from "../../lib/nav";
import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { AppText, CategoryPill, ReorderableList, TodoRow, useToast, DragScrollView } from "../../components";
import { formatTime, usePrefs } from "../../data/prefs";
import { addTodo, arrangeTodos, EndedCategoryError, selectActiveCategories, selectInbox, toggleTodo, updateTodo, useDB } from "../../data/store";
import { tokens, useInsets, useTheme } from "../../theme";
import { arrangeByHeaders } from "../../lib/arrange";
import { InlineTodoInput } from "../home/InlineTodoInput";
import { TodoSheets } from "../home/TodoSheets";
import { useSwipeRight } from "../home/useSwipeRight";
import { usePager } from "../home/pagerContext";

/**
 * S23 보관함: to-dos without a date, by category, with their memos in full.
 * Reached from the box button on home or by swiping right under the calendar; swipe left to go back.
 */
export function InboxScreen() {
  const { c } = useTheme();
  const insets = useInsets();
  const prefs = usePrefs();
  const categories = useDB(selectActiveCategories);
  const todos = useDB(selectInbox);
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sheetTodo, setSheetTodo] = useState<string | null>(null);
  const [sheetStart, setSheetStart] = useState<"menu" | "memo" | "alarm">("menu");
  const openSheet = (id: string, start: "menu" | "memo" | "alarm" = "menu") => { setSheetStart(start); setSheetTodo(id); };
  const [toast, notice] = useToast();
  const pager = usePager();
  const routeBack = useSwipeRight(() => (router.canGoBack() ? goBack("/") : router.replace("/" as never)), 70, -1);
  // in the pager, swiping left drags the pages back to home with the finger
  const back = pager ? pager.swipe(-1) : routeBack;

  type Cat = (typeof categories)[number];
  type Row = { kind: "head" | "foot"; key: string; cat: Cat; last?: boolean } | { kind: "todo"; key: string; cat: Cat; t: (typeof todos)[number] };
  const rows: Row[] = categories.flatMap((cat, i) => [
    { kind: "head" as const, key: `h:${cat.id}`, cat },
    ...todos.filter((t) => t.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder).map((t) => ({ kind: "todo" as const, key: t.id, cat, t })),
    { kind: "foot" as const, key: `f:${cat.id}`, cat, last: i === categories.length - 1 },
  ]);

  const add = (categoryId: string, title: string) => {
    try {
      addTodo(categoryId, null, title);
    } catch (e) {
      if (e instanceof EndedCategoryError) notice(e.message);
      else throw e;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }} {...back}>
      <DragScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: tokens.layout.headerHeight, justifyContent: "center" }}>
          <AppText variant="screenTitle" center accessibilityRole="header">보관함</AppText>
        </View>
        <View style={{ paddingHorizontal: tokens.layout.gutter, gap: 12, marginTop: 8 }}>
          {todos.length === 0 ? (
            <AppText variant="helper" color="textMuted">날짜를 정하지 않은 할 일을 모아 두는 곳이에요. 카테고리의 + 를 눌러 추가해 보세요.</AppText>
          ) : null}
          {/* one list, as on home: a held to-do can move into another category */}
          <ReorderableList
            items={rows}
            keyOf={(r) => r.key}
            labelOf={(r) => (r.kind === "todo" ? r.t.title : r.cat.title)}
            fixed={(r) => r.kind !== "todo"}
            onReorder={(keys) => { if (!arrangeTodos(arrangeByHeaders(keys, (k) => (k.startsWith("h:") || k.startsWith("f:") ? k.slice(2) : null)))) notice("종료한 카테고리로는 옮길 수 없어요"); }}
            renderItem={(r, drag) => {
              const cat = r.cat;
              if (r.kind === "head") {
                return (
                  <View style={{ marginBottom: 10 }}>
                    <CategoryPill title={cat.title} color={cat.color} visibility={cat.visibility}
                      onPress={() => router.push(`/categories/${cat.id}` as never)}
                      onAdd={() => { setEditing(null); setAdding(cat.id); }} />
                  </View>
                );
              }
              if (r.kind !== "todo") {
                return (
                  <View style={{ paddingBottom: r.last ? 0 : 12 }}>
                    {adding === cat.id ? <InlineTodoInput color={cat.color} onSubmit={(title) => add(cat.id, title)} onDone={() => setAdding(null)} /> : null}
                  </View>
                );
              }
              const t = r.t;
              return editing === t.id ? (
                <InlineTodoInput color={cat.color} initial={t.title} onSubmit={(title) => updateTodo(t.id, { title })} onDone={() => setEditing(null)} />
              ) : (
                <TodoRow title={t.title} alarm={t.remindAt ? formatTime(new Date(t.remindAt), prefs.use24h) : undefined} memo={t.memo} photo={t.photoUri} done={t.isDone} color={cat.color} onToggle={() => toggleTodo(t.id)} onPress={() => { if (!pager?.justSwiped()) openSheet(t.id); }}
                  onMemoPress={() => openSheet(t.id, "memo")} onAlarmPress={() => openSheet(t.id, "alarm")}
                  onDoubleTap={prefs.doubleTapToEdit ? () => { setSheetTodo(null); setEditing(t.id); } : undefined} small={prefs.smallTodoText} smallMemo={prefs.smallTodoMemo} largeMemo={!prefs.smallTodoMemo} {...drag} />
              );
            }}
          />
        </View>
      </DragScrollView>
      <TodoSheets inbox todoId={sheetTodo} start={sheetStart} onClose={() => setSheetTodo(null)} onEdit={(id) => setEditing(id)} notice={notice} />
      {toast}
    </View>
  );
}
