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

import { isHoliday } from "../src/lib/holidays";
assert.ok(isHoliday("2026-01-01") && isHoliday("2026-12-25") && isHoliday("2027-10-09"), "fixed holidays every year");
assert.ok(isHoliday("2026-02-17") && isHoliday("2026-09-25") && isHoliday("2026-05-24"), "설날 · 추석 · 부처님오신날 2026");
assert.ok(isHoliday("2026-03-02") && isHoliday("2026-08-17"), "대체공휴일 2026");
assert.ok(!isHoliday("2026-11-20") && !isHoliday("2026-02-19"), "ordinary days");
console.log("ok 공휴일: fixed, lunar and substitute days");
