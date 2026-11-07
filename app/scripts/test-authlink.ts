import assert from "node:assert/strict";
import { parseAuthLink } from "../src/lib/authLink";

assert.equal(parseAuthLink(null), null);
assert.equal(parseAuthLink("todomateclone://"), null);
assert.deepEqual(parseAuthLink("todomateclone://reset-password#access_token=AAA&expires_in=3600&refresh_token=RRR&token_type=bearer&type=recovery"),
  { kind: "recovery", accessToken: "AAA", refreshToken: "RRR" });
// a sign-in link that is not a reset is ignored
assert.equal(parseAuthLink("todomateclone://reset-password#access_token=AAA&refresh_token=RRR&type=signup"), null);
const old = parseAuthLink("todomateclone://reset-password#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
assert.equal(old?.kind, "error");
assert.match((old as { message: string }).message, /만료/);
const q = parseAuthLink("todomateclone://reset-password?error=server_error&error_description=Something+broke");
assert.match((q as { message: string }).message, /Something broke/);
console.log("ok password reset links: tokens, other links ignored, expired and other errors (6 cases)");
