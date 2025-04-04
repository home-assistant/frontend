import { fireEvent } from "../../../../common/dom/fire_event";

export interface ViewPopupDialogParams {
  dashboard_path?: string;
  view_path: string;
}

export const showViewPopupDialog = (
  element: HTMLElement,
  dialogParams: ViewPopupDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "hui-dialog-view-popup",
    dialogImport: () => import("./hui-dialog-view-popup"),
    dialogParams,
  });
};
