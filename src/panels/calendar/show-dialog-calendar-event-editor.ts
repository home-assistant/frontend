import { fireEvent } from "../../common/dom/fire_event";
import { Calendar, CalendarEventData } from "../../data/calendar";

export interface CalendarEventEditDialogParams {
  calendars: Calendar[]; // When creating new events, is the list of calendar entities that support creation
  calendarId?: string;
  selectedDate?: Date; // When provided is used as the pre-filled date for the event creation dialog
  entry?: CalendarEventData;
  canDelete?: boolean;
  updated: () => void;
}

export const loadCalendarEventEditDialog = () =>
  import("./dialog-calendar-event-editor");

export const showCalendarEventEditDialog = (
  element: HTMLElement,
  detailParams: CalendarEventEditDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-calendar-event-editor",
    dialogImport: loadCalendarEventEditDialog,
    dialogParams: detailParams,
  });
};
