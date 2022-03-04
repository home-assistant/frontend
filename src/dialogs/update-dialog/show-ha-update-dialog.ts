import { fireEvent } from "../../common/dom/fire_event";
import { UpdateDescription } from "../../data/update";

export interface UpdateDialogParams {
  update: UpdateDescription;
  refreshCallback: () => void;
}

export const showUpdateDialog = (
  element: HTMLElement,
  dialogParams: UpdateDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-update-dialog",
    dialogImport: () => import("./ha-update-dialog"),
    dialogParams,
  });
};
