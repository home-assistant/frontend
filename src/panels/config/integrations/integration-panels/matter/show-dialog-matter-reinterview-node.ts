import { fireEvent } from "../../../../../common/dom/fire_event";

export interface MatterReinterviewNodeDialogParams {
  device_id: string;
}

export const loadReinterviewNodeDialog = () =>
  import("./dialog-matter-reinterview-node");

export const showMatterReinterviewNodeDialog = (
  element: HTMLElement,
  reinterviewNodeDialogParams: MatterReinterviewNodeDialogParams
): void => {
  fireEvent(element, "show-dialog", {
    dialogTag: "dialog-matter-reinterview-node",
    dialogImport: loadReinterviewNodeDialog,
    dialogParams: reinterviewNodeDialogParams,
  });
};
