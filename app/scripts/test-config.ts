import assert from "node:assert/strict";
import { parseConfig } from "../src/lib/configRules";
import { streakOf } from "../src/lib/dates";

// crews: hidden in the design app until switched on; the usual app always shows them
assert.equal(parseConfig([], true).crews, false);
assert.equal(parseConfig([{ key: "crews_enabled", value: true }], true).crews, true);
assert.equal(parseConfig([{ key: "crews_enabled", value: false }], false).crews, true);
assert.equal(parseConfig([{ key: "crews_enabled", value: "yes" }], true).crews, false); // wrong type ignored
assert.equal(parseConfig([{ key: "home_notice", value: "  점검 안내  " }], true).notice, "점검 안내");
assert.equal(parseConfig([{ key: "home_notice", value: " " }], true).notice, null);
console.log("ok 관리 설정: crews switch and home notice read from app_config");

const days = new Set(["2026-11-18", "2026-11-19", "2026-11-20"]);
assert.equal(streakOf(days, "2026-11-20"), 3);
assert.equal(streakOf(days, "2026-11-21"), 3); // nothing yet today: counts up to yesterday
assert.equal(streakOf(days, "2026-11-22"), 0);
assert.equal(streakOf(new Set(), "2026-11-20"), 0);
console.log("ok 연속 기록: days in a row ending today or yesterday");
