// Mirrors replica/schema.sql (phase 1). Field names are camelCase versions of the columns.
import type { Day } from "../lib/dates";
import type { RepeatRule } from "../lib/routines";

export type Visibility = "public" | "followers" | "partial" | "private";

export type Gender = "male" | "female" | "nonbinary";
export type Profile = {
  id: string; nickname: string; bio: string; avatarUri?: string; statusEmoji?: string;
  /** 설정 → 프로필 (original): ID for friends to find you (phase 2), interests (up to 10) */
  handle?: string; interests?: string[];
  /** 설정 → 계정 (original) */
  gender?: Gender; birthMonth?: string; // "YYYY-MM"
};

export type Category = {
  id: string;
  title: string;
  color: string; // #RRGGBB, typed by the user
  visibility: Visibility;
  sortOrder: number;
  endedAt?: string;
};

export type Todo = {
  id: string;
  categoryId: string;
  title: string;
  date: Day | null; // null = 보관함 (no date yet)
  sortOrder: number;
  isDone: boolean;
  doneAt?: string;
  memo: string;
  memoIsPrivate: boolean;
  remindAt?: string;
  photoUri?: string;
  timerSeconds: number;
  timerStartedAt?: string;
  routineId?: string;
  routineDate?: Day;
  isSkipped?: boolean; // a routine occurrence the user deleted
  createdAt: string;
};

export type Routine = RepeatRule & {
  id: string;
  categoryId: string;
  title: string;
  startDate: Day;
  endDate?: Day;
  timeOfDay?: string; // "HH:MM"
  memo: string;
  manualAdd: boolean; // guess: when on, the routine is offered when adding, not shown automatically
  sortOrder: number;
};

export type DDay = { id: string; title: string; type: "fixed" | "repeat"; targetDate: Day; repeatUnit?: "yearly" | "monthly"; isPrivate: boolean; sortOrder: number };

export type Diary = {
  id: string;
  date: Day; // one per day
  emoji?: string; // 오늘의 기분: a sticker id ("clover.best") or an emoji
  moodTemp?: number | null; // 기분 온도 0–100° (null = taken away, undefined = never set)
  body: string;
  visibility: Visibility;
  backgroundColor?: string; // #RRGGBB
  imagePaths: string[];
};

export type Reminder = { id: string; timeOfDay: string }; // "HH:MM", every day

export type DB = { profile: Profile; categories: Category[]; todos: Todo[]; routines: Routine[]; ddays: DDay[]; diaries: Diary[]; reminders: Reminder[] };
