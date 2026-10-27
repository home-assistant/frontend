import { fireEvent } from "../../../../common/dom/fire_event";
import type { Lovelace } from "../../types";
import type { LovelacePath } from "../lovelace-path";

export interface EditSidebarDialogParams {
  lovelace: Lovelace;
  path: LovelacePath;
}

export const showEditSidebarDialog = (
  element: HTMLElement,
  params: EditSidebarDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-edit-sidebar",
    dialogImport: () => import("./hui-dialog-edit-sidebar"),
    dialogParams: params,
  });
};
