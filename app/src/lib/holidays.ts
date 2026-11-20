/**
 * 대한민국 공휴일 (public information: 관공서의 공휴일에 관한 규정, 연도별 발표). Fixed days every year, plus the lunar
 * holidays (설날·추석 사흘, 부처님오신날), substitute holidays (대체공휴일) and election days per year, 2025–2029.
 * Years outside the table get the fixed days only.
 */
const FIXED = ["01-01", "03-01", "05-05", "06-06", "08-15", "10-03", "10-09", "12-25"];
const BY_YEAR: Record<number, string[]> = {
  2025: ["01-27", "01-28", "01-29", "01-30", "03-03", "05-06", "06-03", "10-05", "10-06", "10-07", "10-08"],
  2026: ["02-16", "02-17", "02-18", "03-02", "05-24", "05-25", "06-03", "08-17", "09-24", "09-25", "09-26", "10-05"],
  2027: ["02-06", "02-07", "02-08", "02-09", "05-13", "08-16", "09-14", "09-15", "09-16", "10-04", "10-11", "12-27"],
  2028: ["01-26", "01-27", "01-28", "04-12", "05-02", "10-02", "10-03", "10-04", "10-05"],
  2029: ["02-12", "02-13", "02-14", "05-20", "05-21", "09-21", "09-22", "09-23", "09-24"],
};

/** day: "YYYY-MM-DD" */
export function isHoliday(day: string): boolean {
  const md = day.slice(5);
  return FIXED.includes(md) || (BY_YEAR[Number(day.slice(0, 4))]?.includes(md) ?? false);
}
