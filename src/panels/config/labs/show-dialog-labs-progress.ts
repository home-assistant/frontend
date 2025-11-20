import { fireEvent } from "../../../common/dom/fire_event";
import { closeDialog } from "../../../dialogs/make-dialog-manager";

export interface LabsProgressDialogParams {
  enabled: boolean;
}

export const loadLabsProgressDialog = () => import("./dialog-labs-progress");

export const showLabsProgressDialog = (
  element: HTMLElement,
  dialogParams: LabsProgressDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-labs-progress",
    dialogImport: loadLabsProgressDialog,
    dialogParams,
  });
};

export const closeLabsProgressDialog = () =>
  closeDialog("dialog-labs-progress");
