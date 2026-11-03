import assert from "node:assert/strict";

import { cleanUrl } from "../src/lib/cleanUrl";
const ok = "https://fttulaxmpnmvrcsakwjm.supabase.co";
for (const input of [ok, ok + "/", ok + "/rest/v1/", "fttulaxmpnmvrcsakwjm.supabase.co", ` "${ok}" `, "﻿" + ok]) assert.equal(cleanUrl(input), ok, input);
assert.equal(cleanUrl("https://xxxx"), null);
assert.equal(cleanUrl(""), null);
console.log("ok cleanUrl");
