import { fireEvent } from "../../common/dom/fire_event";
import { Calendar } from "../../data/calendar";

export interface ImportCalendarEventsDialogParams {
  calendars: Calendar[];
}

export const loadImportCalendarEventsDialog = () =>
  import("./dialog-import-calendar-events");

export const showImportCalendarEventsDialog = (
  element: HTMLElement,
  detailParams: ImportCalendarEventsDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-import-calendar-events",
    dialogImport: loadImportCalendarEventsDialog,
    dialogParams: detailParams,
  });
};
