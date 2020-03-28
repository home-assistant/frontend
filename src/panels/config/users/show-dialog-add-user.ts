import { fireEvent } from "../../../common/dom/fire_event";

export interface AddUserDialogParams {
  userAddedCallback: (user: User) => void;
}

export const loadAddUserDialog = () =>
  import(/* webpackChunkName: "add-user-dialog" */ "./dialog-add-user");

export const showAddUserDialog = (
  element: HTMLElement,
  dialogParams: AddUserDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-add-user",
    dialogImport: loadAddUserDialog,
    dialogParams,
  });
};
