import { fireEvent } from "../../../../common/dom/fire_event";
import type { LogbookEntry } from "../../../../data/logbook";
import type { AutomationTraceExtended } from "../../../../data/trace";

export interface AutomationTraceExplanationDialogParams {
  trace: AutomationTraceExtended;
  logbookEntries: LogbookEntry[];
}

export const showAutomationTraceExplanationDialog = (
  element: HTMLElement,
  dialogParams: AutomationTraceExplanationDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-automation-trace-explanation",
    dialogImport: () => import("./dialog-automation-trace-explanation"),
    dialogParams,
  });
