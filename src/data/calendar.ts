import { getColorByIndex } from "../common/color/colors";
import { computeDomain } from "../common/entity/compute_domain";
import { computeStateName } from "../common/entity/compute_state_name";
import type { HomeAssistant } from "../types";
import { isUnavailableState } from "./entity";

export interface Calendar {
  entity_id: string;
  name?: string;
  backgroundColor?: string;
}

/** Object used to render a calendar event in fullcalendar. */
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
  uid?: string;
  recurrence_id?: string;
  summary: string;
  dtstart: string;
  dtend: string;
  rrule?: string;
  description?: string;
}

export interface CalendarEventMutableParams {
  summary: string;
  dtstart: string;
  dtend: string;
  rrule?: string;
  description?: string;
}

// The scope of a delete/update for a recurring event
export enum RecurrenceRange {
  THISEVENT = "",
  THISANDFUTURE = "THISANDFUTURE",
}

export const enum CalendarEntityFeature {
  CREATE_EVENT = 1,
  DELETE_EVENT = 2,
  UPDATE_EVENT = 4,
}

export const fetchCalendarEvents = async (
  hass: HomeAssistant,
  start: Date,
  end: Date,
  calendars: Calendar[]
): Promise<{ events: CalendarEvent[]; errors: string[] }> => {
  const params = encodeURI(
    `?start=${start.toISOString()}&end=${end.toISOString()}`
  );

  const calEvents: CalendarEvent[] = [];
  const errors: string[] = [];
  const promises: Promise<CalendarEvent[]>[] = [];

  calendars.forEach((cal) => {
    promises.push(
      hass.callApi<CalendarEvent[]>(
        "GET",
        `calendars/${cal.entity_id}${params}`
      )
    );
  });

  for (const [idx, promise] of promises.entries()) {
    let result: CalendarEvent[];
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await promise;
    } catch (err) {
      errors.push(calendars[idx].entity_id);
      continue;
    }
    const cal = calendars[idx];
    result.forEach((ev) => {
      const eventStart = getCalendarDate(ev.start);
      const eventEnd = getCalendarDate(ev.end);
      if (!eventStart || !eventEnd) {
        return;
      }
      const eventData: CalendarEventData = {
        uid: ev.uid,
        summary: ev.summary,
        description: ev.description,
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
  }

  return { events: calEvents, errors };
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
    .filter(
      (eid) =>
        computeDomain(eid) === "calendar" &&
        !isUnavailableState(hass.states[eid].state)
    )
    .sort()
    .map((eid, idx) => ({
      ...hass.states[eid],
      name: computeStateName(hass.states[eid]),
      backgroundColor: getColorByIndex(idx),
    }));

export const createCalendarEvent = (
  hass: HomeAssistant,
  entityId: string,
  event: CalendarEventMutableParams
) =>
  hass.callWS<void>({
    type: "calendar/event/create",
    entity_id: entityId,
    event: event,
  });

export const updateCalendarEvent = (
  hass: HomeAssistant,
  entityId: string,
  uid: string,
  event: CalendarEventMutableParams,
  recurrence_id?: string,
  recurrence_range?: RecurrenceRange
) =>
  hass.callWS<void>({
    type: "calendar/event/update",
    entity_id: entityId,
    uid,
    recurrence_id,
    recurrence_range,
    event,
  });

export const deleteCalendarEvent = (
  hass: HomeAssistant,
  entityId: string,
  uid: string,
  recurrence_id?: string,
  recurrence_range?: RecurrenceRange
) =>
  hass.callWS<void>({
    type: "calendar/event/delete",
    entity_id: entityId,
    uid,
    recurrence_id,
    recurrence_range,
  });
