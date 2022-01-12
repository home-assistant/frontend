import { getColorByIndex } from "../common/color/colors";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import type { CalendarEvent, HomeAssistant } from "../types";

export interface Calendar {
  entity_id: string;
  name?: string;
  backgroundColor?: string;
}

export const fetchCalendarEvents = async (
  hass: HomeAssistant,
  start: Date,
  end: Date,
  calendars: Calendar[]
): Promise<CalendarEvent[]> => {
  const params = encodeURI(
    `?start=${start.toISOString()}&end=${end.toISOString()}`
  );

  const calEvents: CalendarEvent[] = [];
  const promises: Promise<any>[] = [];

  calendars.forEach((cal) => {
    promises.push(
      hass.callApi<CalendarEvent[]>(
        "GET",
        `calendars/${cal.entity_id}${params}`
      )
    );
  });

  const results = await Promise.all(promises);

  results.forEach((result, idx) => {
    const cal = calendars[idx];
    result.forEach((ev) => {
      const eventStart = getCalendarDate(ev.start);
      if (!eventStart) {
        return;
      }
      const eventEnd = getCalendarDate(ev.end);
      const event: CalendarEvent = {
        start: eventStart,
        end: eventEnd,
        title: ev.summary,
        summary: ev.summary,
        backgroundColor: cal.backgroundColor,
        borderColor: cal.backgroundColor,
        calendar: cal.entity_id,
      };

      calEvents.push(event);
    });
  });

  return calEvents;
};

const getCalendarDate = (dateObj: any): string | undefined => {
  if (typeof dateObj === "string") {
    return dateObj;
  }

  if (dateObj.dateTime) {
    return dateObj.dateTime;
  }

  if (dateObj.date) {
    return dateObj.date;
  }

  return undefined;
};

export const getCalendars = (hass: HomeAssistant): Calendar[] =>
  Object.keys(hass.states)
    .filter((eid) => computeDomain(eid) === "calendar")
    .sort()
    .map((eid, idx) => ({
      entity_id: eid,
      name: computeStateName(hass.states[eid]),
      backgroundColor: getColorByIndex(idx),
    }));
