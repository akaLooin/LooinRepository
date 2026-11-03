// Seed data shaped like the reference screenshots (November 2026), written fresh.
import { addDays, today, toDay } from "../lib/dates";
import type { DB, Todo } from "./types";

const TODO_CAT = "c0000000-0000-4000-8000-000000000001";
const NORMAL_CAT = "c0000000-0000-4000-8000-000000000002";
const WORKOUT = "r0000000-0000-4000-8000-000000000001";

const SAMPLE_TITLES = ["물 2L 마시기", "영단어 30개", "방 정리", "장보기", "블로그 글 쓰기", "스트레칭 10분"];

export function seed(): DB {
  let n = 0;
  const todo = (categoryId: string, date: string, title: string, isDone = false, memo = ""): Todo => ({
    id: `t0000000-0000-4000-8000-${String(++n).padStart(12, "0")}`, categoryId, title, date, sortOrder: n, isDone,
    doneAt: isDone ? `${date}T11:43:00.000Z` : undefined, memo, memoIsPrivate: false, timerSeconds: 0, createdAt: `${date}T00:00:00.000Z`,
  });

  // Remaining-count pattern from the reference month view.
  const counts: Record<number, number> = { 4: 6, 5: 2, 6: 1, 7: 4, 8: 2, 9: 1, 10: 3, 12: 1, 14: 2, 15: 1, 19: 1, 20: 1, 21: 2, 23: 1, 26: 2, 28: 2, 29: 1 };
  const todos: Todo[] = [];
  for (const [d, k] of Object.entries(counts)) {
    for (let i = 0; i < k; i++) todos.push(todo(i % 2 ? NORMAL_CAT : TODO_CAT, toDay(2026, 11, Number(d)), SAMPLE_TITLES[i % SAMPLE_TITLES.length]));
  }
  todos.push(todo(TODO_CAT, toDay(2026, 11, 1), "💪 운동하기: 하체", true), todo(NORMAL_CAT, toDay(2026, 11, 1), "빨래 개기"));
  todos.push(todo(TODO_CAT, toDay(2026, 11, 2), "💪 운동하기: 등", true));
  const workout = { ...todo(TODO_CAT, toDay(2026, 11, 3), "💪 운동하기: 어깨", true), routineId: WORKOUT, routineDate: toDay(2026, 11, 3) };
  todos.push(workout, todo(NORMAL_CAT, toDay(2026, 11, 3), "책 30쪽 읽기", false, "에세이 - 3장"));

  // Keep "today" meaningful when the app runs on another date.
  const t = today();
  if (!t.startsWith("2026-11")) todos.push(todo(TODO_CAT, t, "오늘 할 일 하나"), todo(NORMAL_CAT, addDays(t, 1), "내일 할 일 하나"));

  return {
    profile: { id: "u0000000-0000-4000-8000-000000000001", nickname: "루인", bio: "" },
    categories: [
      { id: TODO_CAT, title: "To Do", color: "#00FF7F", visibility: "followers", sortOrder: 1 },
      { id: NORMAL_CAT, title: "Normal", color: "#FFFFFF", visibility: "private", sortOrder: 2 },
    ],
    todos,
    routines: [
      { id: WORKOUT, categoryId: TODO_CAT, title: "💪 운동하기", startDate: "2026-09-27", repeatType: "daily", memo: "", manualAdd: true, sortOrder: 1 },
      { id: "r0000000-0000-4000-8000-000000000002", categoryId: TODO_CAT, title: "💵 월급날", startDate: "2026-09-29", endDate: "2026-12-31", repeatType: "monthly", monthDays: [10], memo: "", manualAdd: false, sortOrder: 2 },
      { id: "r0000000-0000-4000-8000-000000000003", categoryId: TODO_CAT, title: "📞 집에 안부 전화", startDate: "2026-10-17", endDate: "2027-10-17", repeatType: "weekly", weekdays: [6], memo: "", manualAdd: false, sortOrder: 3 },
    ],
    ddays: [
      { id: "d0000000-0000-4000-8000-000000000001", title: "자격증 시험", type: "fixed", targetDate: toDay(2026, 11, 15), isPrivate: false, sortOrder: 1 },
      { id: "d0000000-0000-4000-8000-000000000002", title: "프로젝트 마감", type: "fixed", targetDate: toDay(2026, 11, 21), isPrivate: false, sortOrder: 2 },
    ],
  };
}
