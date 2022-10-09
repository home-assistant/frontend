import { fireEvent } from "../../common/dom/fire_event";
import { Calendar, CalendarEventData } from "../../data/calendar";

export interface CalendarEventDetailDialogParams {
  calendars: Calendar[]; // Must have > 1 calendar to create an event
  calendarId?: string;
  entry?: CalendarEventData;
  updated: () => void;
}

export const loadCalendarEventDetailDialog = () =>
  import("./dialog-calendar-event-detail");

export const showCalendarEventDetailDialog = (
  element: HTMLElement,
  systemLogDetailParams: CalendarEventDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-event-detail",
    dialogImport: loadCalendarEventDetailDialog,
    dialogParams: systemLogDetailParams,
  });
};
