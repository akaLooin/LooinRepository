// Pure: reads what Supabase put in a link that opened the app (password reset). No React Native imports.

export type AuthLink =
  | { kind: "recovery"; accessToken: string; refreshToken: string }
  | { kind: "error"; message: string }
  | null;

/**
 * The reset mail's link goes through Supabase and comes back as
 * todomateclone://reset-password#access_token=…&refresh_token=…&type=recovery
 * (or with ?error=…&error_description=… when the link is old or already used).
 */
export function parseAuthLink(url: string | null | undefined): AuthLink {
  if (!url) return null;
  const params = new URLSearchParams();
  const hash = url.indexOf("#");
  const query = url.indexOf("?");
  if (query >= 0) new URLSearchParams(url.slice(query + 1, hash > query ? hash : undefined)).forEach((v, k) => params.set(k, v));
  if (hash >= 0) new URLSearchParams(url.slice(hash + 1)).forEach((v, k) => params.set(k, v));
  const error = params.get("error_description") ?? params.get("error");
  if (error) {
    const expired = /expired|invalid/i.test(error) || params.get("error_code") === "otp_expired";
    return { kind: "error", message: expired ? "메일의 링크가 만료됐거나 이미 쓰였어요. 비밀번호 재설정 메일을 다시 받아 주세요" : `링크를 열지 못했어요 (${error})` };
  }
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (params.get("type") === "recovery" && accessToken && refreshToken) return { kind: "recovery", accessToken, refreshToken };
  return null;
}
