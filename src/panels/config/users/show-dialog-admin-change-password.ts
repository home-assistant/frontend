import { fireEvent } from "../../../common/dom/fire_event";

export interface AdminChangePasswordDialogParams {
  userId: string;
}

export const loadAdminChangePasswordDialog = () =>
  import("./dialog-admin-change-password");

export const showAdminChangePasswordDialog = (
  element: HTMLElement,
  dialogParams: AdminChangePasswordDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-admin-change-password",
    dialogImport: loadAdminChangePasswordDialog,
    dialogParams,
  });
};
