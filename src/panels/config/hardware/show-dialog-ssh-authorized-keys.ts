import { fireEvent } from "../../../common/dom/fire_event";

export const showSSHAuthorizedKeysDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-ssh-authorized-keys",
    dialogImport: () => import("./dialog-ssh-authorized-keys"),
    dialogParams: {},
  });
};
