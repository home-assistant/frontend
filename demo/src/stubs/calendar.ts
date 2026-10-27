import type { CalendarEventApiData } from "../../../src/data/calendar";
import type { MockHomeAssistant } from "../../../src/fake_data/provide_hass";

// Sample events relative to today, so demos always show something in the
// current week and month.

const pad = (value: number) => String(value).padStart(2, "0");

const day = (offset: number): Date => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);

  return date;
};

const isoDate = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const at = (offset: number, hours: number, minutes = 0) => {
  const date = day(offset);
  date.setHours(hours, minutes);

  return date.toISOString();
};

const allDay = (offset: number, days = 1) => ({
  start: isoDate(day(offset)),
  end: isoDate(day(offset + days)),
  all_day: true,
});

export const FAMILY_EVENTS: CalendarEventApiData[] = [
  { summary: "School run", start: at(0, 8), end: at(0, 8, 30) },
  {
    summary: "Dentist",
    start: at(0, 15, 30),
    end: at(0, 16, 15),
    location: "Main Street 12",
  },
  { summary: "Grandma's birthday", ...allDay(1) },
  { summary: "Football practice", start: at(2, 17), end: at(2, 18, 30) },
  {
    summary: "Dinner with friends",
    start: at(3, 19),
    end: at(3, 22),
    status: "tentative",
  },
  { summary: "Summer cabin", ...allDay(5, 3) },
  { summary: "Parent-teacher meeting", start: at(9, 18), end: at(9, 19) },
  { summary: "Football practice", start: at(9, 17), end: at(9, 18, 30) },
  { summary: "Swimming lessons", start: at(12, 10), end: at(12, 11) },
  { summary: "Car service", start: at(-3, 9), end: at(-3, 11) },
  { summary: "Book club", start: at(-6, 19), end: at(-6, 21) },
];

export const WORK_EVENTS: CalendarEventApiData[] = [
  { summary: "Stand-up", start: at(0, 9), end: at(0, 9, 15) },
  { summary: "Sprint planning", start: at(2, 10), end: at(2, 12) },
  { summary: "Team lunch", start: at(4, 12), end: at(4, 13) },
  { summary: "Conference", ...allDay(8, 2) },
  { summary: "Quarterly review", start: at(-2, 14), end: at(-2, 15, 30) },
];

const toTime = (value: CalendarEventApiData["start"]) =>
  new Date(
    typeof value === "string"
      ? value
      : "dateTime" in value
        ? value.dateTime
        : value.date
  ).getTime();

const inRange = (
  events: CalendarEventApiData[],
  start: string | null,
  end: string | null
): CalendarEventApiData[] => {
  const startTime = start ? new Date(start).getTime() : -Infinity;
  const endTime = end ? new Date(end).getTime() : Infinity;

  return events.filter(
    (event) => toTime(event.end) > startTime && toTime(event.start) < endTime
  );
};

/**
 * Answers event requests of calendar entities with the events of
 * `getEvents`. A calendar without events gets `null`, like a calendar whose
 * integration fails to return them.
 */
export const mockCalendarEvents = (
  hass: MockHomeAssistant,
  getEvents: (
    entityId: string,
    currentHass: MockHomeAssistant
  ) => CalendarEventApiData[] | null | undefined
) => {
  hass.mockWS("calendar/event/subscribe", (msg, currentHass, onChange) => {
    const events = getEvents(msg.entity_id, currentHass);
    onChange?.({ events: events ? inRange(events, msg.start, msg.end) : null });

    return () => undefined;
  });
  // Home Assistant before 2026.5 has no event subscription, so cards that
  // support it ask the REST API instead.
  hass.mockAPI(/^calendars\/[^/?]+\?/, (currentHass, _method, path) => {
    const url = new URL(path, location.origin);
    const entityId = url.pathname.slice(url.pathname.lastIndexOf("/") + 1);
    const events = getEvents(entityId, currentHass);

    if (!events) {
      return Promise.reject(new Error("Calendar not found"));
    }

    return inRange(
      events,
      url.searchParams.get("start"),
      url.searchParams.get("end")
    );
  });
};
