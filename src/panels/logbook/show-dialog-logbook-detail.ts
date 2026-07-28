import { fireEvent } from "../../common/dom/fire_event";
import type { LogbookEntry } from "../../data/logbook";
import type { TraceContexts } from "../../data/trace";

export interface LogbookDetailDialogParams {
  entry: LogbookEntry;
  previousState?: string;
  traceContexts?: TraceContexts;
  userIdToName?: Record<string, string>;
  systemUserIds?: Set<string>;
}

export const loadLogbookDetailDialog = () => import("./dialog-logbook-detail");

export const showLogbookDetailDialog = (
  element: HTMLElement,
  params: LogbookDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-logbook-detail",
    dialogImport: loadLogbookDetailDialog,
    dialogParams: params,
  });
};
