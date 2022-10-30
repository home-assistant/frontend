import { fireEvent } from "../../common/dom/fire_event";
import { Calendar, CalendarEventData } from "../../data/calendar";

export interface CalendarEventDetailDialogParams {
  calendars: Calendar[]; // When creating new events, is the list of events that support creation
  calendarId?: string;
  entry?: CalendarEventData;
  canDelete?: boolean;
  updated: () => void;
}

export const loadCalendarEventDetailDialog = () =>
  import("./dialog-calendar-event-detail");

export const showCalendarEventDetailDialog = (
  element: HTMLElement,
  detailParams: CalendarEventDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-event-detail",
    dialogImport: loadCalendarEventDetailDialog,
    dialogParams: detailParams,
  });
};
