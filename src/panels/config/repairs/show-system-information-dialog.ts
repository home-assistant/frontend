import { fireEvent } from "../../../common/dom/fire_event";

export const loadSystemInformationDialog = () =>
  import("./dialog-system-information");

export const showSystemInformationDialog = (element: HTMLElement): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-system-information",
    dialogImport: loadSystemInformationDialog,
    dialogParams: undefined,
  });
};
