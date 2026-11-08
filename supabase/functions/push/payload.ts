// What a push says, kept apart from the function so it can be tested without Deno (app/scripts/test-push.ts).

export type Settings = { notify_chat?: boolean | null; notify_likes?: boolean | null; notify_following?: boolean | null } | null;
export type PushMessage = { to: string; title: string; body: string; data: { url: string }; sound: "default"; channelId: string; priority: "high" };

/** The line of a chat message as it shows in the notification. */
export function messageText(kind: string, body: string): string {
  if (kind === "photo") return "사진을 보냈어요";
  if (kind === "sticker") return "스티커를 보냈어요";
  const t = (body ?? "").replace(/\s+/g, " ").trim();
  return t.length > 120 ? `${t.slice(0, 119)}…` : t;
}

/** A crew chat message: who said it, then the line. */
export const crewMessageText = (nickname: string, kind: string, body: string) => `${nickname ? `${nickname}: ` : ""}${messageText(kind, body)}`;

/** A follow / reaction notification as one sentence (same wording as the app's 알림 tab). */
export function noticeBody(type: string, actor: string, value?: string | null, todoTitle?: string | null, crewName?: string | null): string | null {
  const who = `${actor}님`;
  if (type === "crew_request") return `${who}이 '${crewName ?? "크루"}' 크루에 참가 신청했어요`;
  if (type === "crew_accepted") return `'${crewName ?? "크루"}' 크루 참가가 수락됐어요`;
  if (type === "follow_request") return `${who}이 팔로우를 요청했어요`;
  if (type === "follow") return `${who}이 나를 팔로우해요`;
  if (type === "follow_accepted") return `${who}이 팔로우 요청을 수락했어요`;
  if (type === "reaction") {
    const what = value?.startsWith("clover.") ? "스티커로" : value ?? "";
    return todoTitle ? `${who}이 '${todoTitle}'에 ${what} 반응했어요` : `${who}이 ${what} 반응했어요`;
  }
  return null;
}

/** Does the receiver want this kind of push? (설정 → 알림; missing settings = yes) */
export function wants(kind: "chat" | "likes" | "following", s: Settings): boolean {
  const v = kind === "chat" ? s?.notify_chat : kind === "likes" ? s?.notify_likes : s?.notify_following;
  return v !== false;
}
export const noticeKind = (type: string): "likes" | "following" => (type === "reaction" ? "likes" : "following"); // crew news counts as 팔로잉 소식

/** One push per phone; Expo takes up to 100 per request. */
export function expoBatches(tokens: string[], title: string, body: string, url: string, channelId: string): PushMessage[][] {
  const all = tokens.filter((t) => /^Expo(nent)?PushToken\[.+\]$/.test(t))
    .map((to) => ({ to, title, body, data: { url }, sound: "default" as const, channelId, priority: "high" as const }));
  const out: PushMessage[][] = [];
  for (let i = 0; i < all.length; i += 100) out.push(all.slice(i, i + 100));
  return out;
}

/** Tokens Expo says no longer reach a phone (app removed): forget them. */
export function deadTokens(batch: PushMessage[], tickets: { status?: string; details?: { error?: string } }[]): string[] {
  return tickets.flatMap((t, i) => (t?.status === "error" && t.details?.error === "DeviceNotRegistered" && batch[i] ? [batch[i].to] : []));
}
