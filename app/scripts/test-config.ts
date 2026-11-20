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

import { featureOn, numberOf, textOf } from "../src/lib/configRules";
// admin app edits for the design app: texts, shown parts, numbers, colours, 점검 모드; bad values are dropped
const rows = [
  { key: "texts", value: { "tab.home": " 메인 ", "agenda.todo": "할 일", "nope": "x", "home.today": 3, "quickadd.placeholder": "{date} 무엇을 할까요?" } },
  { key: "features", value: { "home.weekCard": false, "tab.together": "no", "zzz": false } },
  { key: "numbers", value: { weekStarSize: 99, holdMs: 120, comingCount: 4.4, junk: 3 } },
  { key: "colors", value: { dark: { accent: "#FF0000", bg: "red", nope: "#000000" }, light: "x" } },
  { key: "maintenance", value: { on: true, message: "곧 돌아와요" } },
];
const d = parseConfig(rows, true);
assert.equal(textOf(d, "tab.home"), "메인");
assert.equal(textOf(d, "agenda.todo"), "할 일");
assert.equal(textOf(d, "home.today"), "오늘", "a number is not a text: default");
assert.equal(textOf(d, "quickadd.placeholder", { date: "11월 21일" }), "11월 21일 무엇을 할까요?");
assert.equal(featureOn(d, "home.weekCard"), false);
assert.equal(featureOn(d, "tab.together"), true, "not a boolean: default (shown)");
assert.equal(numberOf(d, "weekStarSize"), 42, "clamped to the max");
assert.equal(numberOf(d, "holdMs"), 150, "clamped to the min");
assert.equal(numberOf(d, "comingCount"), 4, "rounded");
assert.equal(numberOf(d, "ddayCount"), 3, "default");
assert.deepEqual(d.colors, { dark: { accent: "#ff0000" }, light: {} });
assert.deepEqual(d.maintenance, { on: true, message: "곧 돌아와요" });
// the usual app takes none of it
const u = parseConfig(rows, false);
assert.equal(textOf(u, "tab.home"), "홈");
assert.deepEqual(u.colors, { dark: {}, light: {} });
assert.equal(u.maintenance.on, false);
console.log("ok 관리자 앱 편집: 문구·보이기·숫자·색·점검 모드 (bad values dropped, usual app untouched)");

import { cardOrder } from "../src/lib/configRules";
assert.deepEqual(cardOrder(["shortcuts", "today", "x", "today"]), ["shortcuts", "today", "week", "dday", "coming"], "order: unknown and repeated dropped, missing added");
assert.deepEqual(cardOrder("nope"), ["today", "week", "dday", "coming", "shortcuts"]);
assert.deepEqual(parseConfig([{ key: "home_order", value: ["coming", "week"] }], true).homeOrder, ["coming", "week", "today", "dday", "shortcuts"]);
assert.equal(numberOf(parseConfig([{ key: "numbers", value: { textScale: 300 } }], true), "textScale"), 140, "글자 크기 clamped");
console.log("ok 관리자 앱 편집: 카드 순서 · 글자 크기");
