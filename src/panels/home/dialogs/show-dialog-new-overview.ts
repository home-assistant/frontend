import { fireEvent } from "../../../common/dom/fire_event";

export interface NewOverviewDialogParams {
  dismiss: () => void;
}

export const loadNewOverviewDialog = () => import("./dialog-new-overview");

export const showNewOverviewDialog = (
  element: HTMLElement,
  params: NewOverviewDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-new-overview",
    dialogImport: loadNewOverviewDialog,
    dialogParams: params,
  });
};
