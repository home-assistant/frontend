import { fireEvent } from "../../common/dom/fire_event";
import { CalendarEventData } from "../../data/calendar";

export interface CalendarEventDetailDialogParams {
  calendarId: string;
  entry: CalendarEventData;
  canDelete?: boolean;
  canEdit?: boolean;
  updated: () => void;
  color?: string;
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
