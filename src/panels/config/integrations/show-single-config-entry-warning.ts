import type { LitElement } from "lit";
import { fireEvent } from "../../../common/dom/fire_event";

export interface SingleConfigEntryWarningDialogParams {
  domain: string;
}

export const showSingleConfigEntryWarning = (
  element: LitElement,
  params: SingleConfigEntryWarningDialogParams
) =>
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-single-config-entry-warning",
    dialogParams: params,
    dialogImport: () => import("./dialog-single-config-entry-warning"),
  });
