import { fireEvent } from "../../../common/dom/fire_event";
import { UpdateUserParams, User } from "../../../data/user";

export interface UserDetailDialogParams {
  entry: User;
  updateEntry: (updates: Partial<UpdateUserParams>) => Promise<unknown>;
  removeEntry: () => Promise<boolean>;
}

export const loadUserDetailDialog = () => import("./dialog-user-detail");

export const showUserDetailDialog = (
  element: HTMLElement,
  detailParams: UserDetailDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-user-detail",
    dialogImport: loadUserDetailDialog,
    dialogParams: detailParams,
  });
};
