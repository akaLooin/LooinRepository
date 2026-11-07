// Settings that follow the account (Supabase user_settings) <-> app prefs. Pure, so tests can load it.
// Device-only prefs (화면 크기, folded categories, calendar filter) are not here on purpose.
import type { Prefs } from "./prefs";

export const SYNCED: (keyof Prefs)[] = [
  "theme", "weekStartsSunday", "doubleTapToEdit", "use24h", "smallTodoText", "smallTodoMemo", "todoSort",
  "calendarCategoryCount", "monthCalendarMax", "weekCalendarMax", "collapsibleCategories", "inputAtTop", "smallTodoPhoto", "showLikesInFeed", "font", "feedMemoLines",
  // privacy: other people's apps (and the database rules) must respect these
  "followApproval", "likesTodo", "likesDiary", "chatFrom", "searchable",
  // the push server must respect these
  "notifyChat", "notifyLikes", "notifyFollowing",
];

/** Choices for the 할 일 캘린더 limits (0 = 무제한). */
export const CALENDAR_MAX = [3, 5, 7, 10, 15, 20, 0];

/** Columns added by later migrations (friends 20261108000000, push 20261108000300). A server without them still
 * takes the others. */
export const PRIVACY_COLUMNS = ["follow_approval", "likes_todo", "likes_diary", "chat_from", "searchable", "notify_chat", "notify_likes", "notify_following"];

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
    font: p.font === "pretendard" ? "default" : p.font, // the column's default is 'default'
    feed_memo_line_limit: p.feedMemoLines || null, // null = 무제한
    month_calendar_max: p.monthCalendarMax || null, // null = 무제한
    week_calendar_max: p.weekCalendarMax || null,
    follow_approval: p.followApproval,
    likes_todo: p.likesTodo,
    likes_diary: p.likesDiary,
    chat_from: p.chatFrom,
    searchable: p.searchable,
    notify_chat: p.notifyChat,
    notify_likes: p.notifyLikes,
    notify_following: p.notifyFollowing,
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
  bool("follow_approval", "followApproval");
  bool("searchable", "searchable");
  bool("notify_chat", "notifyChat");
  bool("notify_likes", "notifyLikes");
  bool("notify_following", "notifyFollowing");
  const audience = (k: string, key: "likesTodo" | "likesDiary" | "chatFrom") => {
    if (r[k] === "all" || r[k] === "followers" || r[k] === "none") out[key] = r[k];
  };
  audience("likes_todo", "likesTodo");
  audience("likes_diary", "likesDiary");
  audience("chat_from", "chatFrom");
  if (r.font === "default") out.font = "pretendard";
  else if (r.font === "system" || r.font === "nanumGothic" || r.font === "nanumPen") out.font = r.font;
  const max = (k: string, key: "monthCalendarMax" | "weekCalendarMax") => {
    if (r[k] === null) out[key] = 0;
    else if (CALENDAR_MAX.includes(Number(r[k])) && Number(r[k]) > 0) out[key] = Number(r[k]);
  };
  max("month_calendar_max", "monthCalendarMax");
  max("week_calendar_max", "weekCalendarMax");
  if (r.feed_memo_line_limit === null) out.feedMemoLines = 0;
  else if ([1, 2, 3, 5].includes(Number(r.feed_memo_line_limit))) out.feedMemoLines = Number(r.feed_memo_line_limit);
  return out;
}
