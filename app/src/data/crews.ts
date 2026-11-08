// 크루: talks to supabase/migrations/20261109000200_crews.sql. Demo mode keeps two sample crews in memory.
import { supabase } from "../lib/supabase";
import { readBytes } from "../lib/readBytes";
import { toCrewCard, toCrewDetail, type CrewCard, type CrewDetail } from "../lib/crew";
import { getDB, newId, sessionUserId, todosForDay } from "./store";
import { getPerson } from "./social";
import type { Day } from "../lib/dates";

export type { CrewCard, CrewDetail, CrewMember, CrewRequest } from "../lib/crew";

const isDemo = () => sessionUserId() === null;
async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new Error("서버가 설정되지 않았어요");
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    if (/could not find the function|does not exist/i.test(error.message)) throw new Error("서버에 크루 SQL을 먼저 실행해 주세요 (backend.md 16번)");
    if (/not allowed/i.test(error.message)) throw new Error("할 수 없는 동작이에요");
    throw new Error(/fetch|network/i.test(error.message) ? "인터넷 연결을 확인해 주세요" : error.message);
  }
  return data as T;
}

// ───────── demo ─────────
type DemoCrew = { id: string; name: string; description: string; members: { id: string; cat: string; color: string; done: number }[]; me: "pending" | "member" | null; myCat?: string; owner: boolean };
const demo: DemoCrew[] = [
  { id: "demo-crew-run", name: "아침 운동 모임", description: "매일 아침 30분, 몸을 깨워요.\n운동한 날은 할 일에 체크!", owner: false, me: null,
    members: [{ id: "demo-rabbit", cat: "운동", color: "#7FB2FF", done: 9 }, { id: "demo-squirrel", cat: "헬스", color: "#FF9F7F", done: 4 }, { id: "demo-owl", cat: "산책", color: "#B7A6FF", done: 0 }] },
  { id: "demo-crew-book", name: "하루 한 장 독서", description: "한 장이라도 매일 읽기", owner: false, me: null, members: [{ id: "demo-owl", cat: "독서", color: "#7FE3A6", done: 6 }] },
];
async function demoDetail(d: DemoCrew, day: Day): Promise<CrewDetail | null> {
  const db = getDB();
  const people = await Promise.all(d.members.map(async (m) => ({ m, p: await getPerson(m.id) })));
  const members = people.filter((x) => x.p).map(({ m, p }) => ({
    person: { id: p!.id, nickname: p!.nickname, handle: p!.handle, bio: p!.bio }, is_owner: m === d.members[0] && !d.owner,
    category: { title: m.cat, color: m.color }, done_count: m.done, last_done_at: m.done ? new Date(Date.now() - 86400000).toISOString() : null,
    today: d.me === "member" ? [{ title: `${m.cat} 30분`, is_done: m.done > 5 }] : null,
  }));
  if (d.me === "member") {
    const cat = db.categories.find((c) => c.id === d.myCat);
    const mine = cat ? todosForDay(db, day).filter((t) => t.categoryId === cat.id) : [];
    members.push({ person: { id: "demo-me", nickname: db.profile.nickname || "나", handle: undefined, bio: "" }, is_owner: d.owner,
      category: cat ? { title: cat.title, color: cat.color } : { title: "", color: "#FFFFFF" }, done_count: mine.filter((t) => t.isDone).length,
      last_done_at: null, today: mine.map((t) => ({ title: t.title, is_done: t.isDone })) });
  }
  members.sort((a, b) => b.done_count - a.done_count);
  return toCrewDetail({ id: d.id, name: d.name, description: d.description, is_owner: d.owner, my_status: d.me, my_category_id: d.myCat, members, requests: d.owner ? [] : null });
}

// ───────── what the screens call ─────────
export async function crewList(q?: string): Promise<CrewCard[]> {
  if (isDemo()) {
    return demo.filter((d) => !q?.trim() || d.name.includes(q.trim()))
      .map((d) => toCrewCard({ id: d.id, name: d.name, description: d.description, members: d.members.length + (d.me === "member" ? 1 : 0), my_status: d.me }));
  }
  return (await rpc<unknown[]>("crew_list", { q: q ?? null })).map(toCrewCard);
}

export async function crewDetail(id: string, day: Day): Promise<CrewDetail | null> {
  if (isDemo()) { const d = demo.find((x) => x.id === id); return d ? demoDetail(d, day) : null; }
  return toCrewDetail(await rpc<unknown>("crew_detail", { crew: id, day }));
}

export async function createCrew(input: { name: string; description: string; categoryId: string; localImage?: string }): Promise<string> {
  if (isDemo()) {
    const id = `demo-crew-${newId()}`;
    demo.unshift({ id, name: input.name, description: input.description, members: [], me: "member", myCat: input.categoryId, owner: true });
    return id;
  }
  let imagePath: string | null = null;
  if (input.localImage) {
    const me = sessionUserId();
    const body = await readBytes(input.localImage);
    const path = `${me}/${newId()}.jpg`;
    const error = !supabase || body.byteLength < 1024 ? "사진을 읽지 못했어요"
      : (await supabase.storage.from("crew-images").upload(path, body, { contentType: "image/jpeg", upsert: true })).error?.message;
    if (error) setCrewFlash(`크루는 만들었지만 사진을 올리지 못했어요 (${error})`);
    else imagePath = `crew-images/${path}`;
  }
  return rpc<string>("create_crew", { name: input.name, description: input.description, image_path: imagePath, category: input.categoryId });
}

export async function applyCrew(id: string, message: string, categoryId: string) {
  if (isDemo()) { const d = demo.find((x) => x.id === id); if (d) { d.me = "pending"; d.myCat = categoryId; } return; }
  await rpc("apply_crew", { crew: id, message, category: categoryId });
}
export async function cancelCrewApplication(id: string) {
  if (isDemo()) { const d = demo.find((x) => x.id === id); if (d) d.me = null; return; }
  await rpc("cancel_crew_application", { crew: id });
}
export async function respondCrew(id: string, applicant: string, accept: boolean) {
  if (!isDemo()) await rpc("respond_crew", { crew: id, applicant, accept });
}
export async function setCrewCategory(id: string, categoryId: string) {
  if (isDemo()) { const d = demo.find((x) => x.id === id); if (d) d.myCat = categoryId; return; }
  await rpc("set_crew_category", { crew: id, category: categoryId });
}
export async function leaveCrew(id: string) {
  if (isDemo()) { const d = demo.find((x) => x.id === id); if (d) d.me = null; return; }
  await rpc("leave_crew", { crew: id });
}
export async function deleteCrew(id: string) {
  if (isDemo()) { const i = demo.findIndex((x) => x.id === id); if (i >= 0) demo.splice(i, 1); return; }
  await rpc("delete_crew", { crew: id });
}

/** Demo only: lets the e2e accept the sample request as if the leader did. */
export const demoAccept = (id: string) => { const d = demo.find((x) => x.id === id); if (d && d.me === "pending") d.me = "member"; };

// a short message for the crew page after coming back (original: "참가 신청을 보냈습니다.")
let flash: string | null = null;
export const setCrewFlash = (m: string) => { flash = m; };
export const takeCrewFlash = () => { const m = flash; flash = null; return m; };
