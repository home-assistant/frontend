import { fireEvent } from "../../../common/dom/fire_event";
import { User } from "../../../data/user";

export interface AddUserDialogParams {
  userAddedCallback: (user: User) => void;
  name?: string;
}

export const loadAddUserDialog = () => import("./dialog-add-user");

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
