import { fireEvent } from "../../common/dom/fire_event";

export const loadDeveloperToolDialog = () =>
  import("./ha-developer-tools-dialog");

export const showDeveloperToolDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "ha-developer-tools-dialog",
    dialogImport: loadDeveloperToolDialog,
    dialogParams: {},
  });
};
