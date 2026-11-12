/**
 * 뽀모도로 (user's feature). A session counts down over the to-do's own timer: it remembers the to-do's recorded
 * total when it started (`base`), so the time left is length − (total now − base). Pausing and resuming use the
 * to-do's timer, and the focused time is recorded on the to-do like the stopwatch. Pure, so tests can load it.
 */
export type PomodoroSession = { todoId: string; base: number; seconds: number };

export const POMODORO_MIN = 5;
export const POMODORO_MAX = 120;
export const POMODORO_STEP = 5;

export const clampMinutes = (m: number) => Math.max(POMODORO_MIN, Math.min(POMODORO_MAX, Math.round(m / POMODORO_STEP) * POMODORO_STEP));

/** Seconds still to go; the full length when nothing has started. */
export function pomodoroLeft(s: PomodoroSession | null, todoId: string, total: number, minutes: number) {
  if (!s || s.todoId !== todoId) return minutes * 60;
  return Math.max(0, s.seconds - Math.max(0, total - s.base));
}

/** The session to use when 시작 is pressed: the paused one for this to-do, or a fresh one. */
export function startSession(s: PomodoroSession | null, todoId: string, total: number, minutes: number): PomodoroSession {
  if (s && s.todoId === todoId && pomodoroLeft(s, todoId, total, minutes) > 0) return s;
  return { todoId, base: total, seconds: minutes * 60 };
}

/** mm : ss (hh : mm : ss past an hour). */
export function countdownText(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h ? `${p(h)} : ${p(m)} : ${p(s)}` : `${p(m)} : ${p(s)}`;
}
