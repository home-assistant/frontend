import { fireEvent } from "../../../common/dom/fire_event";

export const showAddIntegrationDialog = (
  element: HTMLElement,
  dialogParams?: any
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-add-integration",
    dialogImport: () => import("./dialog-add-integration"),
    dialogParams: dialogParams,
  });
};
