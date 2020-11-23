import { fireEvent } from "../../../../../common/dom/fire_event";

export interface OZWRefreshNodeDialogParams {
  ozw_instance: number;
  node_id: number;
}

export const loadRefreshNodeDialog = () => import("./dialog-ozw-refresh-node");

export const showOZWRefreshNodeDialog = (
  element: HTMLElement,
  refreshNodeDialogParams: OZWRefreshNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-ozw-refresh-node",
    dialogImport: loadRefreshNodeDialog,
    dialogParams: refreshNodeDialogParams,
  });
};
