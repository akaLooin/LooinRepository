import type { CloverState } from "../../components";
import type { Category, Todo } from "../../data/store";

/** How many categories the calendar splits a clover into (설정 → 화면 "할 일 캘린더에서 표시할 카테고리", default 2). */
export const CALENDAR_CATEGORY_COUNT = 2;

/**
 * Clover for one calendar day (rule confirmed by the user):
 *  - no to-dos: empty clover
 *  - nothing done yet: grey clover with the number left
 *  - at least one done: the clover is covered in the colours of that day's categories, split into bands
 *    in category order; on top, the number left across all categories, or a tick when everything is done
 */
export function dayState(todos: Todo[], categories: Category[], limit = CALENDAR_CATEGORY_COUNT): CloverState {
  if (todos.length === 0) return { kind: "empty" };
  const left = todos.filter((t) => !t.isDone).length;
  if (left === todos.length) return { kind: "count", count: left };
  const present = new Set(todos.map((t) => t.categoryId));
  const colors = categories.filter((c) => present.has(c.id)).slice(0, limit).map((c) => c.color);
  return { kind: "split", colors: colors.length ? colors : [categories[0]?.color ?? "#FFFFFF"], left };
}
