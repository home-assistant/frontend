import { fireEvent } from "../../common/dom/fire_event";

export const loadEditProfileDialog = () => import("./dialog-edit-profile");

export const showEditProfileDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-edit-profile",
    dialogImport: loadEditProfileDialog,
  });
};
