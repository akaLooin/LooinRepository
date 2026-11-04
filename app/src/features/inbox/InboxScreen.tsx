import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { AppText, CategoryPill, ReorderableList, TodoRow, useToast } from "../../components";
import { usePrefs } from "../../data/prefs";
import { addTodo, EndedCategoryError, reorderTodos, selectActiveCategories, selectInbox, toggleTodo, updateTodo, useDB } from "../../data/store";
import { tokens, useInsets, useTheme } from "../../theme";
import { InlineTodoInput } from "../home/InlineTodoInput";
import { TodoSheets } from "../home/TodoSheets";
import { useSwipeRight } from "../home/useSwipeRight";

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
  const [dragging, setDragging] = useState(false);
  const [toast, notice] = useToast();
  const back = useSwipeRight(() => (router.canGoBack() ? router.back() : router.replace("/" as never)), 70, -1);

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
      <ScrollView scrollEnabled={!dragging} contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: tokens.layout.headerHeight, justifyContent: "center" }}>
          <AppText variant="screenTitle" center accessibilityRole="header">보관함</AppText>
        </View>
        <View style={{ paddingHorizontal: tokens.layout.gutter, gap: 12, marginTop: 8 }}>
          {todos.length === 0 ? (
            <AppText variant="helper" color="textMuted">날짜를 정하지 않은 할 일을 모아 두는 곳이에요. 카테고리의 + 를 눌러 추가해 보세요.</AppText>
          ) : null}
          {categories.map((cat) => {
            const items = todos.filter((t) => t.categoryId === cat.id).sort((a, b) => a.sortOrder - b.sortOrder);
            return (
              <View key={cat.id} style={{ gap: 4 }}>
                <CategoryPill title={cat.title} color={cat.color} visibility={cat.visibility}
                  onPress={() => router.push(`/categories/${cat.id}` as never)}
                  onAdd={() => { setEditing(null); setAdding(cat.id); }} />
                <View style={{ marginTop: 6 }}>
                  <ReorderableList items={items} keyOf={(t) => t.id} labelOf={(t) => t.title} onDragging={setDragging} onReorder={reorderTodos}
                    renderItem={(t, drag) =>
                      editing === t.id ? (
                        <InlineTodoInput color={cat.color} initial={t.title} onSubmit={(title) => updateTodo(t.id, { title })} onDone={() => setEditing(null)} />
                      ) : (
                        <TodoRow title={t.title} memo={t.memo} photo={t.photoUri} done={t.isDone} color={cat.color} onToggle={() => toggleTodo(t.id)} onPress={() => setSheetTodo(t.id)}
                          onDoubleTap={prefs.doubleTapToEdit ? () => { setSheetTodo(null); setEditing(t.id); } : undefined} small={prefs.smallTodoText} smallMemo={prefs.smallTodoMemo} largeMemo={!prefs.smallTodoMemo} {...drag} />
                      )
                    } />
                  {adding === cat.id ? <InlineTodoInput color={cat.color} onSubmit={(title) => add(cat.id, title)} onDone={() => setAdding(null)} /> : null}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
      <TodoSheets inbox todoId={sheetTodo} onClose={() => setSheetTodo(null)} onEdit={(id) => setEditing(id)} notice={notice} />
      {toast}
    </View>
  );
}
