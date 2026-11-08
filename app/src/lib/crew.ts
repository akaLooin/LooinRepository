// Pure helpers for 크루 (no device imports, so tests can load them).
import { toPerson, type Person } from "./friend";
import { fromRow } from "../data/rows";
import type { DB } from "../data/types";

export type CrewStatus = "pending" | "member" | null;
export type CrewCard = { id: string; name: string; description: string; imageUri?: string; members: number; myStatus: CrewStatus; recruiting: boolean };
export type CrewMember = {
  person: Person; isOwner: boolean; category?: { title: string; color: string }; doneCount: number; lastDoneAt?: string;
  today?: { title: string; isDone: boolean }[]; // only when I am a member
};
export type CrewRequest = { person: Person; message: string; createdAt: string; category?: { title: string; color: string } };
export type CrewDetail = CrewCard & { isOwner: boolean; myCategoryId?: string; memberList: CrewMember[]; requests?: CrewRequest[] };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = any;
const st = (v: unknown): CrewStatus => (v === "pending" || v === "member" ? v : null);
const cat = (v: R) => (v?.title ? { title: String(v.title), color: String(v.color ?? "#FFFFFF") } : undefined);

export function toCrewCard(r: R): CrewCard {
  return { id: String(r.id), name: String(r.name ?? ""), description: r.description ?? "", imageUri: r.image_path ?? undefined, members: Number(r.members ?? 0), myStatus: st(r.my_status), recruiting: r.recruiting !== false };
}

export function toCrewDetail(r: R): CrewDetail | null {
  if (!r || !r.id) return null;
  const memberList: CrewMember[] = (r.members ?? []).map((m: R) => ({
    person: toPerson(m.person), isOwner: !!m.is_owner, category: cat(m.category), doneCount: Number(m.done_count ?? 0), lastDoneAt: m.last_done_at ?? undefined,
    today: Array.isArray(m.today) ? m.today.map((t: R) => ({ title: String(t.title), isDone: !!t.is_done })) : undefined,
  }));
  return {
    ...toCrewCard({ ...r, members: memberList.length }), isOwner: !!r.is_owner, myCategoryId: r.my_category_id ?? undefined, memberList,
    requests: Array.isArray(r.requests) ? r.requests.map((q: R) => ({ person: toPerson(q.person), message: q.message ?? "", createdAt: String(q.created_at), category: cat(q.category) })) : undefined,
  };
}

/** Gold, silver, bronze for the top three who finished anything (original: medals on the right of the ranking). */
export const medalOf = (rank: number, doneCount: number): 1 | 2 | 3 | null => (doneCount > 0 && rank < 3 ? ((rank + 1) as 1 | 2 | 3) : null);

/** A crew I belong to (home chip row). */
export type MyCrew = { id: string; name: string; description: string; imageUri?: string; isOwner: boolean };
export const toMyCrew = (r: R): MyCrew => ({ id: String(r.id), name: String(r.name ?? ""), description: r.description ?? "", imageUri: r.image_path ?? undefined, isOwner: !!r.is_owner });

/** 크루 홈: the members with the category each shares, and those categories' to-dos and routines in the same shape as mine. */
export type CrewHomeMember = { person: Person; isOwner: boolean; category: { id: string; title: string; color: string } };
export type CrewHomeData = { crew: MyCrew; members: CrewHomeMember[]; todos: R[]; routines: R[] };
export function toCrewHome(r: R): CrewHomeData | null {
  if (!r || !r.crew) return null;
  return {
    crew: toMyCrew(r.crew),
    members: (r.members ?? []).filter((m: R) => m?.category?.id).map((m: R) => ({ person: toPerson(m.person), isOwner: !!m.is_owner,
      category: { id: String(m.category.id), title: String(m.category.title), color: String(m.category.color ?? "#FFFFFF") } })),
    todos: r.todos ?? [], routines: r.routines ?? [],
  };
}

/** The crew link to share (opens the crew page in the app). */
export const crewLink = (id: string) => `todomateclone://crew/${id}`;

/**
 * 크루 홈 as one data set in the same shape as mine: a category per member (the one shared with the crew), their
 * to-dos and routines from the server, and for me my own copy from this phone (so checks and new to-dos show at once).
 */
export function crewDB(data: CrewHomeData, local: DB, meId: string): DB {
  const mineCat = data.members.find((m) => m.person.id === meId)?.category.id;
  const categories = data.members.map((m, i) => {
    const own = m.person.id === meId ? local.categories.find((c) => c.id === m.category.id) : undefined;
    return { id: m.category.id, title: own?.title ?? m.category.title, color: own?.color ?? m.category.color, visibility: "public" as const, sortOrder: i };
  });
  const others = (rows: R[]) => rows.filter((r) => r.category_id !== mineCat);
  return {
    profile: { id: data.crew.id, nickname: data.crew.name, bio: data.crew.description },
    categories,
    todos: [...others(data.todos).map((t) => fromRow.todos(t)), ...local.todos.filter((t) => t.categoryId === mineCat && t.date)],
    routines: [...others(data.routines).map((r) => fromRow.routines(r)), ...local.routines.filter((r) => r.categoryId === mineCat)],
    ddays: [], diaries: [], reminders: [],
  };
}
