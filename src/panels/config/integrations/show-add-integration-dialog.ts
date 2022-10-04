import { fireEvent } from "../../../common/dom/fire_event";

export interface AddIntegrationDialogParams {
  brand?: string;
  initialFilter?: string;
}

export const showAddIntegrationDialog = (
  element: HTMLElement,
  dialogParams?: AddIntegrationDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-add-integration",
    dialogImport: () => import("./dialog-add-integration"),
    dialogParams: dialogParams,
  });
};
