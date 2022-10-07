import { getColorByIndex } from "../common/color/colors";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import type { HomeAssistant } from "../types";

export interface Calendar {
  entity_id: string;
  name?: string;
  backgroundColor?: string;
}

/** Object used to render a calendar even in fullcalendar. */
export interface CalendarEvent {
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  calendar: string;
  eventData: CalendarEventData;
  [key: string]: any;
}

/** Data returned from the core APIs. */
export interface CalendarEventData {
  summary: string;
  dtstart: string;
  dtend?: string;
  uid?: string;
  recurrence_id?: string;
  rrule?: string;
}

// The scope of a delete/update for a recurring event
export enum RecurrenceRange {
  THISEVENT = "",
  THISANDFUTURE = "THISANDFUTURE",
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
      const eventData: CalendarEventData = {
        uid: ev.uid,
        summary: ev.summary,
        dtstart: eventStart,
        dtend: eventEnd,
        recurrence_id: ev.recurrence_id,
        rrule: ev.rrule,
      };
      const event: CalendarEvent = {
        start: eventStart,
        end: eventEnd,
        title: ev.summary,
        backgroundColor: cal.backgroundColor,
        borderColor: cal.backgroundColor,
        calendar: cal.entity_id,
        eventData: eventData,
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

export const createCalendarEvent = (
  hass: HomeAssistant,
  entityId: string,
  event: CalendarEventData
) => {
  hass.callWS<void>({
    type: "calendar/event/create",
    entity_id: entityId,
    event: event,
  });
};

export const deleteCalendarEvent = (
  hass: HomeAssistant,
  entityId: string,
  uid: string,
  recurrence_id?: string,
  recurrence_range?: RecurrenceRange
) => {
  hass.callWS<void>({
    type: "calendar/event/delete",
    entity_id: entityId,
    uid,
    recurrence_id,
    recurrence_range,
  });
};
