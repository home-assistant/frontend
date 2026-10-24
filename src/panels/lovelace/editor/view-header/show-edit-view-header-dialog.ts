import { fireEvent } from "../../../../common/dom/fire_event";
import type { Lovelace } from "../../types";

// New unified header editor (redesign), shown when the "header" dev feature
// switch is ON. The stock single-purpose dialog is used when it is OFF.
// Sandbox-only scaffolding.

export interface EditViewHeaderDialogParams {
  lovelace: Lovelace;
  viewIndex: number;
}

export const showEditViewHeaderDialog = (
  element: HTMLElement,
  dialogParams: EditViewHeaderDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-view-header",
    dialogImport: () => import("./hui-dialog-edit-view-header"),
    dialogParams: dialogParams,
  });
};
