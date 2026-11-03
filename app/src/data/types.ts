// Mirrors replica/schema.sql (phase 1). Field names are camelCase versions of the columns.
import type { Day } from "../lib/dates";

export type Visibility = "public" | "followers" | "partial" | "private";

export type Profile = { id: string; nickname: string; bio: string; avatarUri?: string; statusEmoji?: string };

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
  date: Day;
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
  createdAt: string;
};

export type DDay = { id: string; title: string; type: "fixed" | "repeat"; targetDate: Day; isPrivate: boolean; sortOrder: number };

export type DB = { profile: Profile; categories: Category[]; todos: Todo[]; ddays: DDay[] };
