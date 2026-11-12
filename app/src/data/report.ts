// 신고하기: sends a report to the server (supabase/migrations/20261112000000_my_features.sql, report_content).
import { supabase } from "../lib/supabase";
import { sessionUserId } from "./store";

export async function reportContent(kind: "photo" | "todo" | "diary" | "message" | "person", target: string, reason: string) {
  if (!sessionUserId()) return; // demo: nothing to send
  if (!supabase) throw new Error("서버가 설정되지 않았어요");
  const { error } = await supabase.rpc("report_content", { kind, target, reason });
  if (error) throw new Error(/could not find|does not exist/i.test(error.message) ? "서버에 SQL을 먼저 실행해 주세요 (backend.md 18번)" : "신고하지 못했어요");
}
