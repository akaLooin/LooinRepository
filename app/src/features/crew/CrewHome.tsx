import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { AppText, Calendar, CalendarHeader, Crown, Plus, ProfileHeader, StoredImage, TodoRow } from "../../components";
import { crewRange, type CrewHomeData } from "../../data/crews";
import { addTodo, isVirtual, materialize, sessionUserId, todosForDay, toggleTodo, useDB } from "../../data/store";
import { usePrefs } from "../../data/prefs";
import { crewDB } from "../../lib/crew";
import { addDays, fromMonthIndex, monthGrid, monthIndex, parseDay, pickAfterPaging, today, weekday, weekStart, type Day } from "../../lib/dates";
import { smoothLayout } from "../../lib/motion";
import { tokens, useTheme, visibleOn } from "../../theme";
import { CalendarPager, calendarJustSwiped } from "../home/CalendarPager";
import { dayState } from "../home/dayState";
import { InlineTodoInput } from "../home/InlineTodoInput";

const G = tokens.layout.gutter;

/**
 * 크루 홈, from the crew's chip on home (original, user's recording): the crew's picture, name and description (tap →
 * the crew page), a calendar whose clovers count every member's shared category, and for the picked day each member's
 * shared category with its to-dos. My own row has the "+" and its checks work, as on my home; the others' are read only.
 */
export function CrewHome({ id }: { id: string }) {
  const { c } = useTheme();
  const prefs = usePrefs();
  const local = useDB((d) => d);
  const now = today();
  const meId = sessionUserId() ?? "demo-me";
  const [selected, setSelected] = useState<Day>(now);
  const [view, setView] = useState(() => ({ y: parseDay(now).y, m: parseDay(now).m }));
  const [mode, setMode] = useState<"month" | "week">("month");
  const [months, setMonths] = useState<Record<number, CrewHomeData | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const loading = useRef(new Set<number>());
  const sundayFirst = prefs.weekStartsSunday;

  const load = useCallback((i: number, force = false) => {
    if (loading.current.has(i) || (!force && i in months)) return;
    loading.current.add(i);
    const first = (k: number) => { const { y, m } = fromMonthIndex(k); return `${y}-${String(m).padStart(2, "0")}-01`; };
    crewRange(id, addDays(first(i), -7), addDays(first(i + 1), 6))
      .then((v) => { setMonths((x) => ({ ...x, [i]: v })); setError(null); })
      .catch((e) => setError(e instanceof Error ? e.message : "불러오지 못했어요"))
      .finally(() => loading.current.delete(i));
  }, [id, months]);

  const monthOf = (d: Day) => { const { y, m } = parseDay(d); return monthIndex(y, m); };
  const epochWeek = weekStart("2000-01-02", sundayFirst);
  const weekIndexOf = (d: Day) => Math.round((Date.parse(weekStart(d, sundayFirst)) - Date.parse(epochWeek)) / (7 * 86400000));
  const weekDays = (i: number) => Array.from({ length: 7 }, (_, k) => addDays(epochWeek, i * 7 + k));
  const pageIndex = mode === "month" ? monthIndex(view.y, view.m) : weekIndexOf(selected);
  useEffect(() => { setMonths({}); setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode === "month") load(pageIndex);
    else { const days = weekDays(pageIndex); load(monthOf(days[0])); load(monthOf(days[6])); }
  }, [load, pageIndex, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // my part comes from this phone, so it follows my changes at once
  const dbs = useMemo(() => Object.fromEntries(Object.entries(months).map(([k, v]) => [k, v ? crewDB(v, local, meId) : null])), [months, local, meId]);
  const current = months[monthOf(selected)];
  const anyData = current ?? Object.values(months).find((v): v is CrewHomeData => !!v);
  const goPage = (i: number, dir: 1 | -1) => {
    smoothLayout(200);
    setAdding(false);
    if (mode === "week") {
      const next = addDays(selected, dir * 7 * Math.abs(i - pageIndex || 1));
      setSelected(next);
      setView({ y: parseDay(next).y, m: parseDay(next).m });
      return;
    }
    const { y, m } = fromMonthIndex(i);
    setView({ y, m });
    setSelected(pickAfterPaging(y, m, dir));
  };

  if (current === null || (!anyData && Object.values(months).some((v) => v === null))) {
    return <AppText variant="bodyLg" color="textMuted" center style={{ marginTop: 60 }}>크루 멤버만 볼 수 있어요</AppText>;
  }
  if (!anyData) {
    return (
      <View style={{ marginTop: 60, alignItems: "center", gap: 12, paddingHorizontal: G }}>
        {error ? <AppText variant="body" color="textMuted" center>{error}</AppText> : <ActivityIndicator color={c.textMuted} />}
        {error ? <Pressable onPress={() => load(pageIndex, true)} accessibilityRole="button"><AppText variant="body" color="saturday">다시 시도</AppText></Pressable> : null}
      </View>
    );
  }
  const crew = anyData.crew;
  const fdb = dbs[monthOf(selected)];
  const grid = monthGrid(view.y, view.m, sundayFirst);
  const weekNo = Math.max(0, grid.findIndex((row) => row.includes(selected)));
  const stateOn = (d: Day) => {
    const v = dbs[monthOf(d)];
    if (months[monthOf(d)] === undefined) setTimeout(() => load(monthOf(d)), 0);
    return v ? dayState(todosForDay(v, d), v.categories, prefs.calendarCategoryCount) : { kind: "empty" as const };
  };
  const renderPage = (i: number, width: number) => {
    const ym = mode === "month" ? fromMonthIndex(i) : view;
    return (
      <Calendar year={ym.y} month={ym.m} today={now} selected={selected}
        onSelect={(d) => { if (calendarJustSwiped()) return; if (d !== selected) smoothLayout(160); setSelected(d); setAdding(false); }}
        state={stateOn} rows={mode === "week" ? [weekDays(i)] : undefined} weekStartsSunday={sundayFirst} width={width} />
    );
  };
  const dayTodos = fdb ? todosForDay(fdb, selected).sort((a, b) => a.sortOrder - b.sortOrder) : [];

  return (
    <View>
      <Pressable onPress={() => router.push(`/crew/${crew.id}` as never)} accessibilityRole="button" accessibilityLabel={`${crew.name} 크루 보기`} style={{ paddingHorizontal: G, marginTop: 34 }}>
        <ProfileHeader name={crew.name} avatar={crew.imageUri} bio={crew.description} readOnly />
      </Pressable>
      <View style={{ paddingHorizontal: G, marginTop: 27, gap: 16 }}>
        <CalendarHeader
          title={mode === "month" ? `${view.y}년 ${view.m}월` : `${view.y}년 ${view.m}월 ${weekNo + 1}주차`}
          mode={mode}
          onTitle={() => { setSelected(now); setView({ y: parseDay(now).y, m: parseDay(now).m }); }}
          onToggleMode={() => { smoothLayout(); setMode(mode === "month" ? "week" : "month"); setView({ y: parseDay(selected).y, m: parseDay(selected).m }); }}
          onPrev={() => goPage(pageIndex - 1, -1)}
          onNext={() => goPage(pageIndex + 1, 1)}
          filterColors={(fdb?.categories ?? []).slice(0, 2).map((x) => x.color)}
        />
        <CalendarPager key={`crew-${id}-${mode}-${sundayFirst}`} index={pageIndex} onIndexChange={goPage} renderPage={renderPage} gutter={G} />
      </View>
      <View style={{ paddingHorizontal: G, marginTop: 20, gap: 14, marginLeft: 3 }}>
        {selected !== now ? <AppText variant="helper" color="textMuted">{`${parseDay(selected).m}월 ${parseDay(selected).d}일 ${"일월화수목금토"[weekday(selected)]}요일`}</AppText> : null}
        {current === undefined ? <ActivityIndicator color={c.textMuted} /> : null}
        {(current?.members ?? []).map((m) => {
          const mine = m.person.id === meId;
          const cat = fdb?.categories.find((x) => x.id === m.category.id);
          const list = dayTodos.filter((t) => t.categoryId === m.category.id);
          const color = cat?.color ?? m.category.color;
          return (
            <View key={m.person.id} style={{ gap: 2 }}>
              <View style={{ flexDirection: "row", alignSelf: "flex-start", alignItems: "center", height: tokens.size.categoryPillHeight, borderRadius: 999, backgroundColor: c.surface, paddingLeft: 6, paddingRight: mine ? 4 : 14, gap: 8, marginBottom: 8 }}>
                <View>
                  {m.person.avatarUri ? <StoredImage uri={m.person.avatarUri} label="" style={{ width: 24, height: 24, borderRadius: 12 }} /> : <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.surfaceStrong }} />}
                  {m.isOwner ? (
                    <View style={{ position: "absolute", right: -4, bottom: -3, width: 13, height: 13, borderRadius: 7, backgroundColor: c.crown, alignItems: "center", justifyContent: "center" }}>
                      <Crown size={7} color={c.onIcon} fill={c.onIcon} />
                    </View>
                  ) : null}
                </View>
                <AppText variant="category" raw={visibleOn(color, c.surface, c.text)} numberOfLines={1} accessibilityLabel={`${m.person.nickname}의 ${cat?.title ?? m.category.title}`}>{cat?.title ?? m.category.title}</AppText>
                {mine ? (
                  <Pressable onPress={() => { smoothLayout(160); setAdding(true); }} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${cat?.title ?? ""}에 할 일 추가`}
                    style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: c.bg, alignItems: "center", justifyContent: "center" }}>
                    <Plus size={20} color={c.text} strokeWidth={2.4} />
                  </Pressable>
                ) : null}
              </View>
              {list.map((t) => (
                <TodoRow key={t.id} title={t.title} done={t.isDone} color={color} memo={mine ? t.memo : undefined}
                  onToggle={() => { if (mine) toggleTodo(isVirtual(t.id) ? materialize(t.id) : t.id); }} />
              ))}
              {mine && adding ? <InlineTodoInput color={color} onSubmit={(title) => addTodo(m.category.id, selected, title)} onDone={() => setAdding(false)} /> : null}
              {list.length === 0 && !(mine && adding) ? <AppText variant="helper" color="textMuted" style={{ paddingVertical: 4 }}>{mine ? "할 일을 더해 보세요" : "이날 할 일이 없어요"}</AppText> : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
