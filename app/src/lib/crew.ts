// Pure helpers for 크루 (no device imports, so tests can load them).
import { toPerson, type Person } from "./friend";

export type CrewStatus = "pending" | "member" | null;
export type CrewCard = { id: string; name: string; description: string; imageUri?: string; members: number; myStatus: CrewStatus };
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
  return { id: String(r.id), name: String(r.name ?? ""), description: r.description ?? "", imageUri: r.image_path ?? undefined, members: Number(r.members ?? 0), myStatus: st(r.my_status) };
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
