import { fireEvent } from "../../common/dom/fire_event";

export const showStartupProgressDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-startup-progress",
    dialogImport: () => import("./dialog-startup-progress"),
    dialogParams: {},
  });
};
