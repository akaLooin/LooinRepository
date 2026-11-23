/**
 * 보기 설정 (달력 탭, user 2026-11-23): Google calendars can be hidden from the 달력 tab (its month and day list);
 * the event editor still offers every calendar.
 */
import { useMemo } from "react";
import { selectEvents, useDB } from "../data/store";
import { usePrefs } from "../data/prefs";
import { shownOnCalendar, type CalEvent } from "./events";


export function useCalendarEvents(): CalEvent[] {
  const events = useDB(selectEvents);
  const hidden = usePrefs().hiddenGoogleCalendarIds;
  return useMemo(() => shownOnCalendar(events, hidden), [events, hidden]);
}
