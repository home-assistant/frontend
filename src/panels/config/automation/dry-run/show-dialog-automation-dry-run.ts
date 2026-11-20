import type { LitElement } from "lit";
import { fireEvent } from "../../../../common/dom/fire_event";
import type { AutomationConfig } from "../../../../data/automation";

export interface AutomationDryRunDialogParams {
  config: AutomationConfig;
}

export const showAutomationDryRunDialog = (
  element: LitElement,
  params: AutomationDryRunDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-automation-dry-run",
    dialogParams: params,
    dialogImport: () => import("./dialog-automation-dry-run"),
  });
