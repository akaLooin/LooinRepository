import type { CloverState } from "../../components";
import type { Category, Todo } from "../../data/store";
import { tokens } from "../../theme";

/**
 * Clover for one calendar day. Rules inferred from the reference month view (S03):
 *  - no to-dos: empty clover
 *  - nothing done: grey clover with the number left
 *  - everything done: filled with the first category's colour and a tick
 *  - some done: filled in proportion, tick on top
 * The exact rule the original uses for mixed days is a guess; see build-log.
 */
export function dayState(todos: Todo[], categories: Category[]): CloverState {
  if (todos.length === 0) return { kind: "empty" };
  const done = todos.filter((t) => t.isDone);
  const left = todos.length - done.length;
  const order = new Map(categories.map((c, i) => [c.id, i]));
  const firstDone = [...done].sort((a, b) => (order.get(a.categoryId) ?? 0) - (order.get(b.categoryId) ?? 0))[0];
  const color = categories.find((c) => c.id === (firstDone ?? todos[0]).categoryId)?.color ?? tokens.colors.dark.accent;
  if (done.length === 0) return { kind: "count", count: left };
  if (left === 0) return { kind: "done", color };
  return { kind: "partial", color, ratio: done.length / todos.length };
}
