import { fireEvent } from "../../common/dom/fire_event";

export const loadAppDialog = () => import("./app-dialog");

export const showAppDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "app-dialog",
    dialogImport: loadAppDialog,
    addHistory: false,
  });
};
