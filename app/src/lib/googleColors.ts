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
export const isGoogleColor = (hex: string, calendarColor?: string) =>
  GOOGLE_COLORS.some((c) => c.hex === hex.toUpperCase()) || (!!calendarColor && calendarColor.toUpperCase() === hex.toUpperCase());
