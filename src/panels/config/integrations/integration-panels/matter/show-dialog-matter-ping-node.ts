import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterPingNodeDialogParams {
  device_id: string;
}

export const loadPingNodeDialog = () => import("./dialog-matter-ping-node");

export const showMatterPingNodeDialog = (
  element: HTMLElement,
  pingNodeDialogParams: MatterPingNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-ping-node",
    dialogImport: loadPingNodeDialog,
    dialogParams: pingNodeDialogParams,
  });
};
