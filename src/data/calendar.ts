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

/** Type for date values that can come from REST API or subscription */
type CalendarDateValue = string | { dateTime: string } | { date: string };

/** Calendar event data from REST API */
interface CalendarEventRestData {
  summary: string;
  start: CalendarDateValue;
  end: CalendarDateValue;
  description?: string | null;
  location?: string | null;
  uid?: string | null;
  recurrence_id?: string | null;
  rrule?: string | null;
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
  const promises: Promise<CalendarEventRestData[]>[] = [];

  calendars.forEach((cal) => {
    promises.push(
      hass.callApi<CalendarEventRestData[]>(
        "GET",
        `calendars/${cal.entity_id}${params}`
      )
    );
  });

  for (const [idx, promise] of promises.entries()) {
    let result: CalendarEventRestData[];
    try {
      // eslint-disable-next-line no-await-in-loop
      result = await promise;
    } catch (_err) {
      errors.push(calendars[idx].entity_id);
      continue;
    }
    const cal = calendars[idx];
    result.forEach((ev) => {
      const normalized = normalizeSubscriptionEventData(ev, cal);
      if (normalized) {
        calEvents.push(normalized);
      }
    });
  }

  return { events: calEvents, errors };
};

export const getCalendars = (hass: HomeAssistant): Calendar[] =>
  Object.keys(hass.states)
    .filter(
      (eid) =>
        computeDomain(eid) === "calendar" &&
        !isUnavailableState(hass.states[eid].state) &&
        hass.entities[eid]?.hidden !== true
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
  hass.callWS<undefined>({
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
  hass.callWS<undefined>({
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
  hass.callWS<undefined>({
    type: "calendar/event/delete",
    entity_id: entityId,
    uid,
    recurrence_id,
    recurrence_range,
  });

export interface CalendarEventSubscriptionData {
  summary: string;
  start: CalendarDateValue;
  end: CalendarDateValue;
  description?: string | null;
  location?: string | null;
  uid?: string | null;
  recurrence_id?: string | null;
  rrule?: string | null;
}

export interface CalendarEventSubscription {
  events: CalendarEventSubscriptionData[] | null;
}

export const subscribeCalendarEvents = (
  hass: HomeAssistant,
  entity_id: string,
  start: Date,
  end: Date,
  callback: (update: CalendarEventSubscription) => void
) =>
  hass.connection.subscribeMessage<CalendarEventSubscription>(callback, {
    type: "calendar/event/subscribe",
    entity_id,
    start: start.toISOString(),
    end: end.toISOString(),
  });

const getCalendarDate = (dateObj: CalendarDateValue): string | undefined => {
  if (typeof dateObj === "string") {
    return dateObj;
  }

  if ("dateTime" in dateObj) {
    return dateObj.dateTime;
  }

  if ("date" in dateObj) {
    return dateObj.date;
  }

  return undefined;
};

/**
 * Normalize calendar event data from API format to internal format.
 * Handles both REST API format (with dateTime/date objects) and subscription format (strings).
 * Converts to internal format with { dtstart, dtend, ... }
 */
export const normalizeSubscriptionEventData = (
  eventData: CalendarEventSubscriptionData,
  calendar: Calendar
): CalendarEvent | null => {
  const eventStart = getCalendarDate(eventData.start);
  const eventEnd = getCalendarDate(eventData.end);

  if (!eventStart || !eventEnd) {
    return null;
  }

  const normalizedEventData: CalendarEventData = {
    summary: eventData.summary,
    dtstart: eventStart,
    dtend: eventEnd,
    description: eventData.description ?? undefined,
    uid: eventData.uid ?? undefined,
    recurrence_id: eventData.recurrence_id ?? undefined,
    rrule: eventData.rrule ?? undefined,
  };

  return {
    start: eventStart,
    end: eventEnd,
    title: eventData.summary,
    backgroundColor: calendar.backgroundColor,
    borderColor: calendar.backgroundColor,
    calendar: calendar.entity_id,
    eventData: normalizedEventData,
  };
};
