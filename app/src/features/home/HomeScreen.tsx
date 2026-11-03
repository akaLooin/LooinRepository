import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  AppText, Archive, Calendar, CalendarHeader, CategoryPill, Chip, IconChip, ProfileHeader, TextAlignStart, TodoRow, useToast, Users,
} from "../../components";
import {
  addTodo, ddayLabel, EndedCategoryError, selectCategories, selectDDays, toggleTodo, updateTodo, useDB,
} from "../../data/store";
import { addDays, monthGrid, parseDay, today, weekday, type Day } from "../../lib/dates";
import { tokens, useTheme } from "../../theme";
import { dayState } from "./dayState";
import { HomeMenu, MenuButton } from "./HomeMenu";
import { InlineTodoInput } from "./InlineTodoInput";
import { TodoSheets } from "./TodoSheets";

const G = tokens.layout.gutter;

function weekOfMonth(day: Day) {
  const { y, m } = parseDay(day);
  return monthGrid(y, m).findIndex((row) => row.includes(day));
}

export function HomeScreen() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const profile = useDB((d) => d.profile);
  const categories = useDB(selectCategories);
  const allTodos = useDB((d) => d.todos);
  const ddays = useDB(selectDDays);

  const now = today();
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [mode, setMode] = useState<"month" | "week">("month");
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sheetTodo, setSheetTodo] = useState<string | null>(null);
  const [toast, notice] = useToast();

  const byDay = useMemo(() => {
    const m = new Map<Day, typeof allTodos>();
    for (const t of allTodos) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return m;
  }, [allTodos]);
  const dayTodos = (byDay.get(selected) ?? []).slice().sort((a, b) => Number(a.isDone) - Number(b.isDone) || a.sortOrder - b.sortOrder);

  const grid = monthGrid(view.y, view.m);
  const weekRow = mode === "week" ? [grid[Math.max(0, parseDay(selected).m === view.m ? weekOfMonth(selected) : 0)]] : undefined;
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

  const firstDDay = ddays.find((d) => !d.isPrivate) ?? ddays[0];
  const shown = categories.filter((cat) => !cat.endedAt || dayTodos.some((t) => t.categoryId === cat.id));

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
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ height: 56, alignItems: "flex-end", justifyContent: "center", paddingHorizontal: G }}>
          <MenuButton onPress={() => setMenuOpen(true)} />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: G, gap: 8 }}>
          <IconChip label="보관함" onPress={() => notice("보관함은 나중에 만들어요")}><Archive size={22} color={c.text} /></IconChip>
          <Chip label={profile.nickname} selected />
          <IconChip label="친구" onPress={() => notice("친구 기능은 2단계에서 만들어요")}><Users size={22} color={c.text} /></IconChip>
        </ScrollView>

        <View style={{ paddingHorizontal: G, marginTop: 28 }}>
          <ProfileHeader
            name={profile.nickname}
            bio={profile.bio}
            dday={firstDDay ? { title: firstDDay.title, label: ddayLabel(firstDDay.targetDate, now) } : undefined}
            onDday={() => router.push("/ddays" as never)}
            onEmoji={() => notice("상태 이모지는 다음 단계에서 만들어요")}
          />
        </View>

        <View style={{ paddingHorizontal: G, marginTop: 28, gap: 16 }}>
          <CalendarHeader
            title={title}
            mode={mode}
            onToggleMode={() => { setMode(mode === "month" ? "week" : "month"); setView({ y: parseDay(selected).y, m: parseDay(selected).m }); }}
            onPrev={() => shift(-1)}
            onNext={() => shift(1)}
            filterColors={categories.slice(0, 2).map((x) => x.color)}
            onFilter={() => notice("표시할 카테고리 고르기는 다음 단계에서 만들어요")}
          />
          <Calendar
            year={view.y}
            month={view.m}
            today={now}
            selected={selected}
            onSelect={(d) => { setSelected(d); setAdding(null); setEditing(null); }}
            state={(d) => dayState(byDay.get(d) ?? [], categories)}
            rows={weekRow}
          />
        </View>

        <View style={{ paddingHorizontal: G, marginTop: 20, gap: 12 }}>
          {selected !== now ? (
            <AppText variant="helper" color="textMuted">{`${parseDay(selected).m}월 ${parseDay(selected).d}일 ${"일월화수목금토"[weekday(selected)]}요일`}</AppText>
          ) : null}
          {shown.length === 0 ? (
            <Pressable onPress={() => router.push("/categories/new" as never)} accessibilityRole="button" style={{ paddingVertical: 24, alignItems: "center", gap: 6 }}>
              <AppText variant="bodyLg" weight={600}>카테고리를 먼저 만들어 주세요</AppText>
              <AppText variant="helper" color="textMuted">눌러서 첫 카테고리 만들기</AppText>
            </Pressable>
          ) : null}
          {shown.map((cat) => {
            const items = dayTodos.filter((t) => t.categoryId === cat.id);
            return (
              <View key={cat.id} style={{ gap: 4 }}>
                <CategoryPill
                  title={cat.title}
                  color={cat.color}
                  visibility={cat.visibility}
                  onPress={() => router.push(`/categories/${cat.id}` as never)}
                  onAdd={() => { setEditing(null); setAdding(cat.id); }}
                />
                <View style={{ marginTop: 6 }}>
                  {items.map((t) =>
                    editing === t.id ? (
                      <InlineTodoInput key={t.id} color={cat.color} initial={t.title} onSubmit={(title) => updateTodo(t.id, { title })} onDone={() => setEditing(null)} />
                    ) : (
                      <TodoRow
                        key={t.id}
                        title={t.title}
                        memo={t.memo}
                        done={t.isDone}
                        color={cat.color}
                        onToggle={() => toggleTodo(t.id)}
                        onPress={() => setSheetTodo(t.id)}
                        onDoubleTap={() => { setSheetTodo(null); setEditing(t.id); }}
                      />
                    ),
                  )}
                  {adding === cat.id ? <InlineTodoInput color={cat.color} onSubmit={(title) => onAdd(cat.id, title)} onDone={() => setAdding(null)} /> : null}
                </View>
              </View>
            );
          })}

          <View style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: c.surfaceStrong, marginTop: 16 }} />
          <Pressable onPress={() => notice("리스트 메뉴는 다음 단계에서 만들어요")} accessibilityRole="button" style={{ alignSelf: "flex-end", flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 12 }}>
            <TextAlignStart size={20} color={c.text} />
            <AppText variant="bodyLg">리스트 메뉴</AppText>
          </Pressable>
        </View>
      </ScrollView>

      <HomeMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <TodoSheets todoId={sheetTodo} onClose={() => setSheetTodo(null)} onEdit={(id) => setEditing(id)} notice={notice} />
      {toast}
    </View>
  );
}
