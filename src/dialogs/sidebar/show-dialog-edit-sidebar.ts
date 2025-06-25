import { fireEvent } from "../../common/dom/fire_event";

export const loadEditSidebarDialog = () => import("./dialog-edit-sidebar");

export const showEditSidebarDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-sidebar",
    dialogImport: loadEditSidebarDialog,
    dialogParams: {},
  });
};
