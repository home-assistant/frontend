import { fireEvent } from "../../common/dom/fire_event";

export interface EditSidebarDialogParams {
  saveCallback: (order: string[], hidden: string[]) => void;
}

export const loadEditSidebarDialog = () => import("./dialog-edit-sidebar");

export const showEditSidebarDialog = (
  element: HTMLElement,
  dialogParams: EditSidebarDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-sidebar",
    dialogImport: loadEditSidebarDialog,
    dialogParams,
  });
};
