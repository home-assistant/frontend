import { fireEvent } from "../../common/dom/fire_event";

export interface RestartDialogParams {}

export const loadRestartDialog = () => import("./dialog-restart");

export const showRestartDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-restart",
    dialogImport: loadRestartDialog,
    dialogParams: {},
  });
};
