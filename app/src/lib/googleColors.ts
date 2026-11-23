/**
 * Google Calendar's eleven event colours, with the names its Korean app uses (Google's own palette, shown to pick
 * from when an event goes to Google, user 2026-11-23). Same as supabase/functions/_shared/gcal.ts
 * GOOGLE_EVENT_COLORS (checked by scripts/test-gcal.ts).
 */
export const GOOGLE_COLORS: { id: string; hex: string; name: string }[] = [
  { id: "11", hex: "#D50000", name: "토마토" },
  { id: "4", hex: "#E67C73", name: "플라밍고" },
  { id: "6", hex: "#F4511E", name: "귤" },
  { id: "5", hex: "#F6BF26", name: "바나나" },
  { id: "2", hex: "#33B679", name: "세이지" },
  { id: "10", hex: "#0B8043", name: "바질" },
  { id: "7", hex: "#039BE5", name: "공작" },
  { id: "9", hex: "#3F51B5", name: "블루베리" },
  { id: "1", hex: "#7986CB", name: "라벤더" },
  { id: "3", hex: "#8E24AA", name: "포도" },
  { id: "8", hex: "#616161", name: "흑연" },
];
/** An event of a Google calendar that can only be read: shown in 립마크, never changed there (user, 2026-11-23). */
export const isReadOnlyEvent = (e: { googleCalendarId?: string | null }, readOnlyCalendars: string[]) =>
  !!e.googleCalendarId && readOnlyCalendars.includes(e.googleCalendarId);

/**
 * The colours to offer: what Google answered for this account (user, 2026-11-23: there are more than eleven), named
 * where we know the name; the eleven when nothing came yet.
 */
export function googleColorChoices(live: { id: string; hex: string }[]): { id: string; hex: string; name: string }[] {
  if (!live.length) return GOOGLE_COLORS;
  const named = new Map(GOOGLE_COLORS.map((c) => [c.id, c.name]));
  return live.map((c, i) => ({ ...c, name: named.get(c.id) ?? `색 ${i + 1}` }));
}
export const isGoogleColor = (hex: string, calendarColor: string | undefined, live: { id: string; hex: string }[]) =>
  googleColorChoices(live).some((c) => c.hex.toUpperCase() === hex.toUpperCase()) || (!!calendarColor && calendarColor.toUpperCase() === hex.toUpperCase());
