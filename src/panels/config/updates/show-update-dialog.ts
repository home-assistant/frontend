import { fireEvent } from "../../../common/dom/fire_event";
import type { UpdateEntity } from "../../../data/update";

export interface UpdateDialogParams {
  entity: UpdateEntity;
}

export const loadUpdateDialog = () => import("./dialog-update");

export const showUpdateDialog = (
  element: HTMLElement,
  updateParams: UpdateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-update",
    dialogImport: loadUpdateDialog,
    dialogParams: updateParams,
  });
};
