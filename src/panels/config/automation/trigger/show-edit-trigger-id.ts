import type { LitElement } from "lit";
import { fireEvent } from "../../../../common/dom/fire_event";

export const loadEditTriggerIdDialog = () =>
  import("./ha-automation-edit-trigger-id-dialog");

export interface EditTriggerIdDialogParams {
  id?: string;
  onUpdate: (newId: string | undefined) => void;
}

export const showEditTriggerIdDialog = (
  element: LitElement,
  dialogParams: EditTriggerIdDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    parentElement: element,
    dialogTag: "ha-automation-edit-trigger-id-dialog",
    dialogImport: loadEditTriggerIdDialog,
    dialogParams,
  });
};
