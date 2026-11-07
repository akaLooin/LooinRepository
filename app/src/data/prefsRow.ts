// Settings that follow the account (Supabase user_settings) <-> app prefs. Pure, so tests can load it.
// Device-only prefs (화면 크기, folded categories, calendar filter) are not here on purpose.
import type { Prefs } from "./prefs";

export const SYNCED: (keyof Prefs)[] = [
  "theme", "weekStartsSunday", "doubleTapToEdit", "use24h", "smallTodoText", "smallTodoMemo", "todoSort",
  "calendarCategoryCount", "collapsibleCategories", "inputAtTop", "smallTodoPhoto", "showLikesInFeed",
];

export function toSettingsRow(p: Prefs, userId: string): Record<string, unknown> {
  return {
    user_id: userId,
    theme: p.theme,
    week_starts_sunday: p.weekStartsSunday,
    double_tap_to_edit: p.doubleTapToEdit,
    use_24h: p.use24h,
    small_todo_text: p.smallTodoText,
    small_todo_memo: p.smallTodoMemo,
    todo_sort: p.todoSort,
    calendar_category_count: p.calendarCategoryCount,
    collapsible_categories: p.collapsibleCategories,
    input_at_top: p.inputAtTop,
    small_todo_photo: p.smallTodoPhoto,
    show_likes_in_feed: p.showLikesInFeed,
  };
}

/** Only fields that are present and valid; anything odd keeps the device value. */
export function fromSettingsRow(r: Record<string, unknown>): Partial<Prefs> {
  const out: Partial<Prefs> = {};
  const bool = (k: string, key: keyof Prefs) => { if (typeof r[k] === "boolean") (out as Record<string, unknown>)[key] = r[k]; };
  if (r.theme === "system" || r.theme === "dark" || r.theme === "light") out.theme = r.theme;
  if (r.todo_sort === "done_last" || r.todo_sort === "manual") out.todoSort = r.todo_sort;
  const n = Number(r.calendar_category_count);
  if (Number.isInteger(n) && n >= 1 && n <= 4) out.calendarCategoryCount = n;
  bool("week_starts_sunday", "weekStartsSunday");
  bool("double_tap_to_edit", "doubleTapToEdit");
  bool("use_24h", "use24h");
  bool("small_todo_text", "smallTodoText");
  bool("small_todo_memo", "smallTodoMemo");
  bool("collapsible_categories", "collapsibleCategories");
  bool("input_at_top", "inputAtTop");
  bool("small_todo_photo", "smallTodoPhoto");
  bool("show_likes_in_feed", "showLikesInFeed");
  return out;
}
